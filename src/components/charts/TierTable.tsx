import { useMemo } from 'react'
import { useFilters, usePageFilters } from '../../store'

interface Props {
  data: Record<string, unknown> | null
}

interface Row {
  state_code: string
  state_label: string
  vulnerability_index: number
  vulnerability_tier: string
  recovery_vs_2019_pct: number
}

// Vulnerability tier table + recovery ranking. Colour by tier; show the
// continuous index so the continuum stays visible (DESIGN_GUIDE).
export default function TierTable({ data }: Props) {
  const { state, setState } = useFilters()
  const { tier } = usePageFilters()

  const rows = useMemo<Row[]>(() => {
    const s = data?.state_2024 as Row[] | undefined
    if (!s) return []
    const filtered = tier === 'all' ? s : s.filter((r) => r.vulnerability_tier === tier)
    return [...filtered].sort((a, b) => b.vulnerability_index - a.vulnerability_index)
  }, [data, tier])

  const tierColor = (t: string) =>
    t?.toLowerCase().includes('higher') ? '#c62828' : t?.toLowerCase().includes('moderate') ? '#d97706' : '#1e8e3e'

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          State Vulnerability Ranking
        </h3>
        <span className="font-sans text-[10px] text-[#9aa3b5]">Click to filter</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {rows.map((r) => {
          const selected = state === r.state_code
          return (
            <button
              key={r.state_code}
              onClick={() => setState(selected ? 'all' : r.state_code)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                selected ? 'bg-[#e6e9f7]' : 'hover:bg-[#f3f5fa]'
              }`}
            >
              <span className="font-sans text-[12px] font-medium text-[#1c1c1c] truncate">
                {r.state_label}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span
                  className="font-sans text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${tierColor(r.vulnerability_tier)}18`, color: tierColor(r.vulnerability_tier) }}
                >
                  {r.vulnerability_index.toFixed(1)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        Vulnerability index over 2018–2024. Labuan, Kelantan and Putrajaya score highest.
      </p>
    </div>
  )
}