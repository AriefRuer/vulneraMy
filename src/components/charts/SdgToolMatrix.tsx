import { useMemo } from 'react'

interface Props {
  data: Record<string, unknown> | null
}

interface Sdg12Row {
  tool: string
  table: string
  description: string
  published_nationally: number
  tourism_disaggregated: number
}

const GROUPS: { tool: string; label: string; blurb: string }[] = [
  { tool: 'TSA', label: 'TSA: economic accounts', blurb: 'Tourism Satellite Account' },
  { tool: 'SEEA', label: 'SEEA: environmental accounts', blurb: 'Environmental-economic accounts' },
]

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full font-sans text-[11px]"
      style={{ backgroundColor: '#e6f4ea', color: '#1e8e3e' }}
      aria-label="yes"
    >
      ✓
    </span>
  ) : (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full font-sans text-[11px]"
      style={{ backgroundColor: '#f2f4f9', color: '#b3bacb' }}
      aria-label="no"
    >
      –
    </span>
  )
}

// SDG 12.b.1 — implementation of standard tools to monitor tourism sustainability.
// This indicator is about measurement *capability*, not a sustainability verdict:
// Malaysia's economic accounting (TSA) is fully tourism-disaggregated; its
// environmental accounts (SEEA) are published but not yet split out for tourism.
export default function SdgToolMatrix({ data }: Props) {
  const rows = useMemo<Sdg12Row[]>(() => (data?.sdg_12b1 as Sdg12Row[] | undefined) ?? [], [data])

  const seeaDisagg = rows.filter((r) => r.tool === 'SEEA' && r.tourism_disaggregated).length
  const seeaTotal = rows.filter((r) => r.tool === 'SEEA').length
  const tsaDisagg = rows.filter((r) => r.tool === 'TSA' && r.tourism_disaggregated).length
  const tsaTotal = rows.filter((r) => r.tool === 'TSA').length

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c] mb-1">
        SDG 12.b.1: Can we measure it?
      </h3>
      <p className="font-sans text-[11px] text-[#9aa3b5] mb-3">
        The indicator tracks which accounting tools exist. The economic side is complete, the
        environmental side is the gap.
      </p>

      {/* Column headers */}
      <div className="flex items-center gap-2 pb-1.5 mb-1 border-b border-[#eceef6]">
        <span className="flex-1 font-sans text-[10px] uppercase tracking-wide text-[#9aa3b5]">Account</span>
        <span className="w-16 text-center font-sans text-[10px] uppercase tracking-wide text-[#9aa3b5]">Published</span>
        <span className="w-20 text-center font-sans text-[10px] uppercase tracking-wide text-[#9aa3b5]">Tourism-split</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {GROUPS.map((grp) => {
          const items = rows.filter((r) => r.tool === grp.tool)
          if (items.length === 0) return null
          return (
            <div key={grp.tool} className="mb-2">
              <div className="font-sans text-[11px] font-semibold text-[#1c1c1c] mt-2 mb-1">
                {grp.label}
              </div>
              {items.map((r) => (
                <div key={r.table} className="flex items-center gap-2 py-1">
                  <span className="flex-1 font-sans text-[11px] text-[#4a4a4a] truncate" title={r.description}>
                    {r.description}
                  </span>
                  <span className="w-16 flex justify-center"><Mark on={!!r.published_nationally} /></span>
                  <span className="w-20 flex justify-center"><Mark on={!!r.tourism_disaggregated} /></span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Honest takeaway — a quiet line, not a highlighted box */}
      <div className="mt-2 pt-2 border-t" style={{ borderColor: '#eceef6' }}>
        <p className="font-sans text-[10px] text-[#7b7b7b] leading-relaxed">
          <span className="font-semibold text-[#1c1c1c]">{tsaDisagg}/{tsaTotal} economic</span> tables are
          tourism-disaggregated, but <span className="font-semibold text-[#c62828]">{seeaDisagg}/{seeaTotal} environmental</span>{' '}
          accounts are not. Tourism's water, energy and emissions footprint can't yet be measured.
        </p>
      </div>
    </div>
  )
}
