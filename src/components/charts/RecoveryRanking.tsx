import { useMemo } from 'react'
import { useFilters, usePageFilters } from '../../store'

interface Props {
  data: Record<string, unknown> | null
}

interface StateRow {
  year: number
  state_code: string
  state_label: string
  receipts_rm_m: number
}

// Recovery = compare-year receipts ÷ base-year receipts, recomputed LIVE from
// the state_panel grain (year × state × receipts, 2018-2024). The user picks
// any base/compare year pair — not fixed to 2019.
export default function RecoveryRanking({ data }: Props) {
  const { state, setState } = useFilters()
  const { recBase, recCompare, setRecBase, setRecCompare } = usePageFilters()

  const years = useMemo(() => {
    const sp = data?.state_panel as StateRow[] | undefined
    if (!sp) return []
    return Array.from(new Set(sp.map((r) => r.year))).sort()
  }, [data])

  const rows = useMemo(() => {
    const sp = data?.state_panel as StateRow[] | undefined
    if (!sp) return []
    const base = new Map(sp.filter((r) => r.year === recBase).map((r) => [r.state_code, r]))
    const cmp = new Map(sp.filter((r) => r.year === recCompare).map((r) => [r.state_code, r]))
    return Array.from(new Set(sp.map((r) => r.state_code)))
      .map((code) => {
        const a = base.get(code)
        const b = cmp.get(code)
        if (!a || !b || !a.receipts_rm_m) return null
        const recovery = (b.receipts_rm_m / a.receipts_rm_m) * 100
        return { state_code: code, state_label: b.state_label, recovery }
      })
      .filter((r): r is { state_code: string; state_label: string; recovery: number } => r !== null)
      .sort((a, b) => b.recovery - a.recovery)
  }, [data, recBase, recCompare])

  const min = Math.min(...rows.map((r) => r.recovery), 0)
  const max = Math.max(...rows.map((r) => r.recovery), 100)

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Tourism Recovery: {recCompare} vs {recBase}
        </h3>
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-sans text-[10px] text-[#9aa3b5]">Base</span>
          <select
            value={recBase}
            onChange={(e) => setRecBase(Number(e.target.value))}
            className="font-sans text-[12px] text-[#1a1a1a] bg-white border border-[#eceef6] rounded-md px-2 py-1 focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={y >= recCompare}>{y}</option>
            ))}
          </select>
          <span className="font-sans text-[10px] text-[#9aa3b5]">Compare</span>
          <select
            value={recCompare}
            onChange={(e) => setRecCompare(Number(e.target.value))}
            className="font-sans text-[12px] text-[#1a1a1a] bg-white border border-[#eceef6] rounded-md px-2 py-1 focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y} disabled={y <= recBase}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {rows.map((r) => {
          const selected = state === r.state_code
          const pct = Math.max(((r.recovery - min) / Math.max(max - min, 1)) * 100, 2)
          const up = r.recovery >= 100
          return (
            <button
              key={r.state_code}
              onClick={() => setState(selected ? 'all' : r.state_code)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                selected ? 'bg-[#e6e9f7]' : 'hover:bg-[#f3f5fa]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-sans text-[12px] font-medium text-[#1c1c1c]">{r.state_label}</span>
                <span className="font-sans text-[12px]" style={{ fontFamily: "'Gantari', sans-serif", fontWeight: 700, color: up ? '#1a2b88' : '#c62828' }}>
                  {r.recovery.toFixed(0)}%
                </span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#dfe3ee' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: up ? (selected ? '#1a2b88' : '#8ea0c8') : '#e8b0b8' }}
                />
              </div>
            </button>
          )
        })}
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        100% = receipts equal to base year {recBase}. Recomputed live from
        state-panel data.
      </p>
    </div>
  )
}