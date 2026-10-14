import { expect, test } from 'claude-code/testing'

import { estimate } from './register'

test('todo progress extrapolates total time', async () => {
  const r = estimate({ startedAt: 0, done: 2, total: 4 }, 60_000)
  expect(r.frac).toBe(0.5)
  expect(r.totalMs).toBe(120_000)
})

test('step pace starts when the todo list appeared', async () => {
  // 20s exploring, then 2 steps in 40s → 20s/step, 2 left → 40s remaining
  const r = estimate({ startedAt: 0, done: 2, total: 4, todoAt: 20_000 }, 60_000)
  expect(r.totalMs).toBe(100_000)
})

test('time waiting on the user is excluded', async () => {
  const r = estimate({ startedAt: 0, done: 1, total: 2, pausedMs: 30_000 }, 60_000)
  expect(r.elapsed).toBe(30_000)
  expect(r.totalMs).toBe(60_000)
})

test('an open pause freezes elapsed', async () => {
  const r = estimate({ startedAt: 0, done: 0, total: 0, avgMs: 100_000, pausedAt: 10_000 }, 50_000)
  expect(r.elapsed).toBe(10_000)
})

test('no todos falls back to average turn, capped at 95%', async () => {
  const r = estimate({ startedAt: 0, done: 0, total: 0, avgMs: 40_000 }, 50_000)
  expect(r.frac).toBe(0.95)
  expect(r.totalMs).toBe(40_000)
})

test('nothing known yet', async () => {
  expect(estimate({ startedAt: 0, done: 0, total: 0 }, 1000).totalMs).toBeUndefined()
})
