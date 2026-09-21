import { create } from 'zustand'
import { askAssistant } from '../../lib/assistantClient'
import type { AssistantResult } from '../../lib/offlineAnswers'

export type AssistantStatus = 'idle' | 'loading' | 'done'
export interface AssistantMessage {
  vizId: string
  question: string
  result: AssistantResult
  mode: 'online' | 'offline'
}

interface AssistantState {
  open: boolean
  vizId: string | null
  status: AssistantStatus
  // Chat history is ISOLATED per visualization, keyed by vizId. Opening a
  // different chart shows that chart's own thread (empty if never asked
  // about it), never another chart's answers.
  historyByViz: Record<string, AssistantMessage[]>
  mode: 'online' | 'offline'
  setOpen: (open: boolean) => void
  openFor: (vizId: string) => void
  ask: (vizId: string, question: string) => Promise<void>
}

export const useAssistant = create<AssistantState>((set, get) => ({
  open: false,
  vizId: null,
  status: 'idle',
  historyByViz: {},
  mode: 'online',
  setOpen: (open) => set({ open }),
  openFor: (vizId) => set({ open: true, vizId, status: 'idle' }),
  ask: async (vizId, question) => {
    const q = question.trim()
    if (!q || get().status === 'loading') return
    set({ status: 'loading', vizId })
    const { result, mode } = await askAssistant(vizId, q)
    set((s) => ({
      status: 'done',
      mode,
      vizId,
      historyByViz: {
        ...s.historyByViz,
        [vizId]: [{ vizId, question: q, result, mode }, ...(s.historyByViz[vizId] || [])],
      },
    }))
  },
}))