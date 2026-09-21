import { useEffect, useRef, useState } from 'react'
import { useAssistant } from './AssistantContext'
import { getVizEntry } from '../../vizRegistry'

// Floating assistant panel. Plain-text rendering ONLY - never
// dangerouslySetInnerHTML. Graceful states per plan 53 (loading, offline,
// error copy) with no raw error codes ever shown.
//
// Easy close: press Escape, click anywhere outside the panel, or click the
// sparkle badge again (it toggles). The X is still there but never required.
export default function AssistantPanel() {
  const { open, vizId, status, historyByViz, setOpen, ask } = useAssistant()
  const [question, setQuestion] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Chat history is isolated per visualization - only the selected chart's
  // thread is shown. Opening a different chart reveals its own (possibly
  // empty) history, never another chart's answers.
  const latest = vizId ? historyByViz[vizId]?.[0] : undefined

  // Close helpers: Escape key + click-outside.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, setOpen])

  useEffect(() => {
    if (open) {
      setQuestion('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, vizId])

  if (!open) return null

  const entry = vizId ? getVizEntry(vizId) : undefined

  const submit = (text: string) => {
    const q = text.trim()
    if (!vizId || !q || status === 'loading') return
    setQuestion('')
    void ask(vizId, q)
  }

  // Suggestion chips - tailored to the deterministic answerer's intents
  // (trend / top / comparison / value / source). Clicking one asks directly.
  const suggested: string[] = entry
    ? [
        'Summarize this chart',
        "What's the biggest takeaway here?",
        'How has this changed over time?',
        'What stands out most?',
        'Where does this data come from?',
      ]
    : ['Summarize the current view', 'What is the key number?']

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Assistant"
      className="fixed bottom-6 right-6 z-50 w-[min(92vw,400px)] overflow-hidden rounded-2xl"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #eceef6',
        boxShadow: '0 8px 30px rgba(26,27,32,0.16)',
        fontFamily: "'Alexandria', sans-serif",
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #eceef6', backgroundColor: '#f8fafb' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* Booky logo - new ai_icon.svg ribbon, accent color on light header */}
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden>
              <path
                d="M21 19V6C21 6 20 4 16.5 4C13 4 12 7 12 7C12 7 11 4 7.5 4C4 4 3 6 3 6V19C3 19 4 17 7.5 17C11 17 12 19 12 19C12 19 13 17 16.5 17C20 17 21 19 21 19Z"
                fill="#1a2b88"
                fillOpacity="0.25"
              />
              <path d="M12 6.5V18.5" stroke="#1a2b88" strokeLinecap="round" />
              <path d="M20.5 6.5V18.5" stroke="#1a2b88" strokeLinecap="round" />
              <path d="M3.5 6.5V18.5" stroke="#1a2b88" strokeLinecap="round" />
            </svg>
            {/* Name: Alexandria Bold. Everything else in the chat: Alexandria Regular. */}
            <div
              className="font-sans text-[13px] text-[#1a1a1a]"
              style={{ fontFamily: "'Alexandria', sans-serif", fontWeight: 700 }}
            >
              Booky
            </div>
          </div>
          {entry && (
            <div className="mt-0.5 truncate font-sans text-[10px] text-[#7b7b7b]">{entry.title}</div>
          )}
        </div>
        <button
          type="button"
          aria-label="Close assistant"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-full font-sans text-[15px] leading-none text-[#7b7b7b] hover:text-[#1c1c1c]"
          style={{ width: 24, height: 24 }}
        >
          ✕
        </button>
      </div>

      {/* Answer area */}
      <div className="max-h-[280px] overflow-y-auto px-4 py-3 space-y-3">
        {status === 'loading' && (
          <p className="font-sans text-[12px] text-[#7b7b7b]">Analyzing this visualization...</p>
        )}

        {latest && latest.result.answer && (
          <div className="space-y-2">
            <div className="rounded-lg px-3 py-2 font-sans text-[12px] leading-relaxed text-[#1c1c1c]" style={{ backgroundColor: '#f4f6fa' }}>
              {latest.result.answer}
            </div>
            {latest.mode === 'offline' && (
              <p className="font-sans text-[10px] text-[#7b7b7b]">
                Offline mode. I answered from the data bundled with this dashboard.
              </p>
            )}
            {latest.result.limitation && !latest.result.answer && (
              <p className="font-sans text-[11px] text-[#7b7b7b]">{latest.result.limitation}</p>
            )}
          </div>
        )}
      </div>

      {/* Suggestion chips - shown until a question is asked */}
      {!latest && status !== 'loading' && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {suggested.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="rounded-full px-3 py-1.5 font-sans text-[11px] font-medium transition-colors"
              style={{ backgroundColor: '#eef0f7', color: '#1a2b88', border: '1px solid #e3e7f4' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); submit(question) }} className="flex items-center gap-2 px-3 py-2.5" style={{ borderTop: '1px solid #eceef6', backgroundColor: '#ffffff' }}>
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={entry?.title ? `Ask about ${entry.title}...` : 'Ask about this data...'}
          maxLength={500}
          autoComplete="off"
          className="flex-1 rounded-lg px-3 py-1.5 font-sans text-[12px] text-[#1c1c1c] outline-none"
          style={{ backgroundColor: '#f4f6fa' }}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !question.trim()}
          className="rounded-lg px-3 py-1.5 font-sans text-[12px] font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: '#1a2b88' }}
        >
          Ask
        </button>
      </form>

      <div className="px-4 pb-2.5 flex items-center justify-between">
        <p className="font-sans text-[9px] text-[#9aa3b5]">Esc or click outside to close</p>
      </div>
    </div>
  )
}