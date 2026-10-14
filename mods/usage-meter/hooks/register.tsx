import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'

const usage = atom({ plugin: 'usage-meter', key: 'usage' } as const, null)

export const bar = (pct: number, width = 15) => {
  const n = Math.round((Math.min(Math.max(pct, 0), 100) / 100) * width)
  return '█'.repeat(n) + '░'.repeat(width - n)
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Green while plenty is left, yellow past half used, red past 80%.
export const tone = (pct: number) => (pct >= 80 ? 'red' : pct >= 50 ? 'yellow' : 'green')

// Account-wide windows, so a new conversation does not reset them.
const toUsage = (rateLimits: SessionRateLimit[]): Usage => {
  const five = rateLimits.find(r => r.kind === 'five_hour')
  const week = rateLimits.find(r => r.kind === 'seven_day')
  return {
    sessionPercent: five?.percentUsed,
    sessionResetsAt: five?.resetsAt,
    weekPercent: week?.percentUsed,
    weekResetsAt: week?.resetsAt,
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const { rateLimits } = await $.session.usage()
    await update($, usage, () => toUsage(rateLimits))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e.rateLimits))
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const u = await read($, usage)
    if (e.props.hasSurvey || u === null) return next(e)

    const below = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const meter = (pct?: number, resetsAt?: string) =>
      pct === undefined
        ? <Text dimColor>（尚無資料）</Text>
        : <Text>
            <Text color={tone(pct)}>{bar(pct)} {pct.toFixed(0)}%</Text>
            <Text dimColor>{resetsAt ? ` 重置 ${fmtDate(resetsAt)}` : ''}</Text>
          </Text>

    return (
      <Box flexDirection="column">
        <Text>
          <Text dimColor>Session </Text>
          {meter(u.sessionPercent, u.sessionResetsAt)}
          <Text dimColor>  本週 </Text>
          {meter(u.weekPercent, u.weekResetsAt)}
        </Text>
        {below}
      </Box>
    )
  })
}
