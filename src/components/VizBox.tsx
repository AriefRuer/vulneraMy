import React from 'react'
import { useAssistant } from './Assistant/AssistantContext'
import AiBadge from './Assistant/AiBadge'

// Build-time toggle: ship without the AI assistant when VITE_AI_ASSISTANT=false.
const AI_ASSISTANT = (import.meta.env.VITE_AI_ASSISTANT ?? 'true') !== 'false'

// Visualization box - white bg, Athens Gray stroke, subtle outward shadow.
//
// Assistant interaction: the AI sparkle only appears WHILE HOVERING the chart.
// On hover, a faint "Right click for insights" hint + the badge fade in at the
// top-right corner (badge floats half-outside the box). Leave, and it fades
// back out. Also opens on right-click / Ctrl+Space while focused.
//
// NOTE: containment must be layout+style only (NOT paint). `contain: paint`
// clips descendants to the box bounds, which chops the half-outside badge.
interface VizBoxProps {
  className?: string
  children: React.ReactNode
  vizId?: string
  vizTitle?: string
}

export default function VizBox({ className = '', children, vizId, vizTitle }: VizBoxProps) {
  const openFor = useAssistant((s) => s.openFor)
  const enabled = AI_ASSISTANT && Boolean(vizId)

  const open = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (vizId) openFor(vizId)
  }

  return (
    <div
      className={`relative rounded-xl p-5 group ${className}`}
      onContextMenu={enabled ? open : undefined}
      onKeyDown={
        enabled
          ? (e) => {
              if (e.key === 'ContextMenu' || (e.key === ' ' && e.ctrlKey)) {
                e.preventDefault()
                if (vizId) openFor(vizId)
              }
            }
          : undefined
      }
      tabIndex={enabled ? 0 : undefined}
      role={enabled ? 'button' : undefined}
      aria-label={enabled && vizTitle ? `Ask assistant about ${vizTitle}` : undefined}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #eceef6',
        boxShadow: '0 -1px 4px rgba(26,27,32,0.04), 0 4px 12px rgba(26,27,32,0.06)',
        // layout + style only. NOT paint: paint clips the half-outside badge.
        contain: 'layout style',
        display: 'flex',
        flexDirection: 'column',
        cursor: enabled ? 'context-menu' : 'default',
        outline: 'none',
      }}
    >
      {/* Hover-only AI affordance. The hint text floats ABOVE the box's top-right
       edge (in the grid gutter, outside the p-5 content area) so it never touches
       any in-box control (Click to filter, year pickers, right-aligned labels).
       The sparkle overlaps the top-right corner. */}
      {enabled && vizId && (
        <>
          <div
            className="pointer-events-none absolute -top-[22px] right-1 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
          >
            <span
              className="font-sans text-[9px] font-medium tracking-wide whitespace-nowrap"
              style={{ color: 'rgba(122,122,122,0.9)' }}
            >
              Right click for insights
            </span>
          </div>
          <div className="pointer-events-none absolute -top-2.5 -right-2.5 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="pointer-events-auto">
              <AiBadge vizId={vizId} vizTitle={vizTitle} size={24} />
            </span>
          </div>
        </>
      )}

      {children}
    </div>
  )
}