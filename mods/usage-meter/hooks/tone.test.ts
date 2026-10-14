import { expect, test } from 'claude-code/testing'

import { tone } from './register'

test('tone thresholds', async () => {
  expect(tone(0)).toBe('green')
  expect(tone(49)).toBe('green')
  expect(tone(50)).toBe('yellow')
  expect(tone(79)).toBe('yellow')
  expect(tone(80)).toBe('red')
})
