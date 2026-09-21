import { useAssistant } from './AssistantContext'

// Gemini-style "AI is here" affordance. A small floating sparkle badge shown
// at the corner of an assistant-enabled surface (viz box or KPI card). It
// "lights up" on hover. Clicking it opens the assistant for that viz; if the
// assistant is already open for this viz, clicking again closes it (an easy
// ways to dismiss without hunting for the X).
//
// The sparkle is the placeholder AI logo (public/ai-logo.svg) rendered inline
// so it is recolorable via currentColor and always present offline.
interface Props {
  vizId: string
  vizTitle?: string
  accent?: string          // badge colour; default Deep Dark Blue
  size?: number            // badge diameter in px
}

export default function AiBadge({ vizId, vizTitle, accent = '#1a2b88', size = 26 }: Props) {
  const open = useAssistant((s) => s.open)
  const activeViz = useAssistant((s) => s.vizId)
  const openFor = useAssistant((s) => s.openFor)
  const setOpen = useAssistant((s) => s.setOpen)

  const isActive = open && activeViz === vizId

  const handleClick = (e: { stopPropagation: () => void; preventDefault: () => void }) => {
    e.stopPropagation()
    e.preventDefault()
    if (isActive) setOpen(false)
    else openFor(vizId)
  }

  return (
    <button
      type="button"
      aria-label={isActive ? 'Close assistant' : `Ask about ${vizTitle || 'this'}`}
      title={isActive ? 'Close assistant' : 'Ask about this'}
      onClick={handleClick}
      className="group/badge relative cursor-pointer rounded-full transition-all duration-200 hover:scale-110"
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        color: '#ffffff',
        background: isActive ? '#11162e' : accent,
        boxShadow: isActive
          ? '0 0 0 2px rgba(26,43,136,0.35)'
          : '0 2px 6px rgba(26,43,136,0.35), 0 0 0 0 rgba(26,43,136,0)',
        border: '1px solid rgba(255,255,255,0.35)',
      }}
    >
      {/* lighting-up effect: soft glow, revealed on hover (group/badge hover) */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-200 group-hover/badge:opacity-100"
        style={{ background: accent, filter: 'blur(6px)' }}
      />
      {/* New AI logo (public/icons/ai_icon.svg), recolored to currentColor so it
          reads white-on-top of the dark badge and matches the design system. */}
      <svg
        viewBox="0 0 24 24"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        aria-hidden
        style={{ position: 'relative' }}
      >
        <path
          d="M21 19V6C21 6 20 4 16.5 4C13 4 12 7 12 7C12 7 11 4 7.5 4C4 4 3 6 3 6V19C3 19 4 17 7.5 17C11 17 12 19 12 19C12 19 13 17 16.5 17C20 17 21 19 21 19Z"
          fill="currentColor"
          fillOpacity="0.3"
        />
        <path d="M12 6.5V18.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M20.5 6.5V18.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M3.5 6.5V18.5" stroke="currentColor" strokeLinecap="round" />
      </svg>
      <span className="sr-only">AI assistant</span>
    </button>
  )
}