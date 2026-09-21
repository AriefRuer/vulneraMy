import { useAssistant } from './AssistantContext'

interface Props {
  vizId: string
  title: string
}

// Small "Ask" affordance pinned to the top-right of a VizBox. Opens the
// assistant panel scoped to this visualization. Accessible (button, not
// right-click only) and touch-friendly (a visible control per plan §43).
export default function AssistantButton({ vizId, title }: Props) {
  const openFor = useAssistant((s) => s.openFor)
  return (
    <button
      type="button"
      aria-label={`Ask about ${title}`}
      title={`Ask about ${title}`}
      onClick={(e) => {
        e.stopPropagation()
        openFor(vizId)
      }}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-[10px] font-semibold transition-colors"
      style={{ backgroundColor: '#e6e9f7', color: '#1a2b88' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-5h-2v-6h2v6Z"
          fill="currentColor"
        />
      </svg>
      Ask
    </button>
  )
}