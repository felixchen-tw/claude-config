export type Run = {
  startedAt: number
  done: number
  total: number
  avgMs?: number
  // Time spent waiting on the user (permission dialogs, questions), excluded from estimates.
  pausedMs?: number
  pausedAt?: number
  pauseId?: string
  // Active time when the todo list first appeared; step pace is measured from here.
  todoAt?: number
  avgKey?: string
}

export type SubAgent = Run & { id: string; type: string; label: string }

declare module 'claude-code' {
  interface PluginState {
    'task-progress': { run: Run | null; agents: SubAgent[]; now: number }
  }
}
