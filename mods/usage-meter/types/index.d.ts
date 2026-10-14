export type Usage = {
  sessionPercent?: number
  sessionResetsAt?: string
  weekPercent?: number
  weekResetsAt?: string
}

declare module 'claude-code' {
  interface PluginState {
    'usage-meter': { usage: Usage | null }
  }
}
