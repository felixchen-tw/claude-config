import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Run, SubAgent } from '../types'

const run = atom({ plugin: 'task-progress', key: 'run' } as const, null)
const agents = atom({ plugin: 'task-progress', key: 'agents' } as const, [])
const clock = atom({ plugin: 'task-progress', key: 'now' } as const, 0)

const LIVE = ['pending', 'running', 'waiting']

const bar = (frac: number, width = 20) => {
  const n = Math.round(Math.min(Math.max(frac, 0), 1) * width)
  return '█'.repeat(n) + '░'.repeat(width - n)
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`
}

const MIN_TURN_MS = 15_000

const ema = (avg: number | undefined, ms: number) => (avg ? avg * 0.7 + ms * 0.3 : ms)

// Active time: wall clock minus time spent waiting on the user.
export const active = (r: Run, now: number) =>
  now - r.startedAt - (r.pausedMs ?? 0) - (r.pausedAt === undefined ? 0 : now - r.pausedAt)

// Todo progress when the agent keeps a list; else elapsed against the average length.
// Step pace is measured from when the list appeared, so exploration before it isn't spread over the steps.
// ponytail: linear pace per step, weight later steps if the tail still runs long
export const estimate = (r: Run, now: number) => {
  const elapsed = active(r, now)
  if (r.total > 0 && r.done > 0) {
    const start = r.todoAt ?? 0
    const perStep = (elapsed - start) / r.done
    return { frac: r.done / r.total, elapsed, totalMs: elapsed + perStep * (r.total - r.done), isTodo: true }
  }
  if (r.total > 0) return { frac: 0, elapsed, totalMs: undefined, isTodo: true }
  if (r.avgMs) return { frac: Math.min(elapsed / r.avgMs, 0.95), elapsed, totalMs: r.avgMs, isTodo: false }
  return { frac: 0, elapsed, totalMs: undefined, isTodo: false }
}

const line = (r: Run, now: number) => {
  const { frac, elapsed, totalMs, isTodo } = estimate(r, now)
  const steps = isTodo ? `  ${r.done}/${r.total} 步` : ''
  const time = totalMs === undefined
    ? `已用 ${fmt(elapsed)} · 預估中…`
    : elapsed > totalMs
      ? `已用 ${fmt(elapsed)} · 已超出平均 ${fmt(elapsed - totalMs)}`
      : `已用 ${fmt(elapsed)} · 剩餘 ~${fmt(totalMs - elapsed)} / 預估 ${fmt(totalMs)}`
  return `${bar(frac)} ${Math.round(frac * 100)}%${steps}  ${time}`
}

// Applies a todo change to the main run, or to the subagent whose loop made the call.
// The first change that gives the list steps stamps todoAt.
const onTodos = async ($: EngineInterface, agentId: string | undefined, fn: (r: Run) => Partial<Run>) => {
  const now = await $.clock.now()
  const apply = <T extends Run>(r: T): T => {
    const next = { ...r, ...fn(r) }
    return next.todoAt === undefined && next.total > 0 ? { ...next, todoAt: active(next, now) } : next
  }
  return agentId === undefined
    ? update($, run, r => (r ? apply(r) : r))
    : update($, agents, list => list.map(a => (a.id === agentId ? apply(a) : a)))
}

// Tools that always wait on the user; any other main-loop call waits when its check says ask.
const ASKS_USER = ['AskUserQuestion', 'ExitPlanMode']

const pause = async ($: EngineInterface, id: string | undefined) => {
  const now = await $.clock.now()
  await update($, run, r => (r && r.pausedAt === undefined ? { ...r, pausedAt: now, pauseId: id } : r))
}

const resume = async ($: EngineInterface, id: string | undefined) => {
  const now = await $.clock.now()
  await update($, run, r =>
    r && r.pausedAt !== undefined && r.pauseId === id
      ? { ...r, pausedMs: (r.pausedMs ?? 0) + now - r.pausedAt, pausedAt: undefined, pauseId: undefined }
      : r,
  )
}

let tick: Timer | undefined

function ensureTick($: EngineInterface) {
  tick ??= $.clock.every(1000, async () => {
    const now = await $.clock.now()
    await update($, clock, () => now)

    const tracked = await read($, agents)
    if (tracked.length > 0) {
      const live = new Set((await $.agent.list()).filter(a => LIVE.includes(a.status)).map(a => a.id))
      const ended = tracked.filter(a => !live.has(a.id))
      for (const a of ended) {
        const key = `avgAgentMs:${a.type}`
        await $.store.set(key, ema((await $.store.get(key)) as number | undefined, now - a.startedAt))
      }
      if (ended.length > 0) await update($, agents, list => list.filter(a => live.has(a.id)))
    }

    if ((await read($, run)) === null && (await read($, agents)).length === 0) {
      tick?.cancel()
      tick = undefined
    }
  })
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    const now = await $.clock.now()
    const avgKey = `avgTurnMs:${await $.session.root()}`
    const avgMs = ((await $.store.get(avgKey)) ?? (await $.store.get('avgTurnMs'))) as number | undefined
    await update($, clock, () => now)
    await update($, run, () => ({ startedAt: now, done: 0, total: 0, avgMs, avgKey }))
    ensureTick($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('agent.spawn', async ($, e, next) => {
    const res = await next(e)
    if (res.deny === undefined && res.agentId) {
      const id = res.agentId
      const now = await $.clock.now()
      const avgMs = (await $.store.get(`avgAgentMs:${e.subagentType}`)) as number | undefined
      const label = e.description.length > 24 ? `${e.description.slice(0, 23)}…` : e.description
      const a: SubAgent = { id, type: e.subagentType, label, startedAt: now, done: 0, total: 0, avgMs }
      await update($, agents, list => [...list.filter(x => x.id !== id), a])
      ensureTick($)
    }
    return res
  }).catch(($, e, next) => next(e))

  // ponytail: an asked call's pause also covers the tool's own run after approval; fine unless approved calls run long
  on('tool.check', async ($, e, next) => {
    const res = await next(e)
    if (e.agentId === undefined && e.tool_use_id && res.decision === 'ask') await pause($, e.tool_use_id)
    return res
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined && ASKS_USER.includes(e.tool)) await pause($, e.tool_use_id)
    try {
      return await next(e)
    } finally {
      if (e.agentId === undefined) await resume($, e.tool_use_id).catch(() => {})
    }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const done = e.todos.filter(t => t.status === 'completed').length
    await onTodos($, e.agentId, () => ({ done, total: e.todos.length }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    await onTodos($, e.agentId, r => ({ total: r.total + 1 }))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    if (e.status === 'completed') await onTodos($, e.agentId, r => ({ done: r.done + 1 }))
    if (e.status === 'deleted') await onTodos($, e.agentId, r => ({ total: r.total - 1 }))
    return next(e)
  }).catch(($, e, next) => next(e))

  // Subagent loops raise turn.complete too; only the main loop ends the run.
  // Short or interrupted turns would drag the average away from real tasks, so they don't count.
  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const r = await read($, run)
    if (r && !e.isAborted) {
      const ms = active(r, await $.clock.now())
      if (ms >= MIN_TURN_MS) {
        if (r.avgKey) await $.store.set(r.avgKey, ema(r.avgMs, ms))
        await $.store.set('avgTurnMs', ema((await $.store.get('avgTurnMs')) as number | undefined, ms))
      }
    }
    await update($, run, () => null)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const r = await read($, run)
    const subs = await read($, agents)
    const showMain = e.props.isWorking && r !== null
    if (e.props.hasSurvey || (!showMain && subs.length === 0)) return next(e)

    const below = await next(e)
    const now = await read($, clock)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {showMain && r ? <Text color="cyan">任務 {line(r, now)}</Text> : null}
        {subs.map(a => (
          <Text key={a.id} color="magenta">
            {'  ↳ '}{a.label} <Text dimColor>({a.type})</Text> {line(a, now)}
          </Text>
        ))}
        {below}
      </Box>
    )
  })
}
