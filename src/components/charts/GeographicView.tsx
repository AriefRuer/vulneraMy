import { useMemo } from 'react'
import { useFilters } from '../../store'

interface Props {
  data: Record<string, unknown> | null
}

interface StateData {
  code: string
  label: string
  receipts: number
  recovery: number
  visitors: number
}

export default function GeographicView({ data }: Props) {
  const { state, setState } = useFilters()

  const chartData = useMemo<StateData[]>(() => {
    const s = data?.state_2024 as Array<{
      state_code: string
      state_label: string
      receipts_rm_m: number
      recovery_vs_2019_pct: number
      visitors_k: number
    }> | undefined
    if (!s) return []
    return s
      .map((st) => ({
        code: st.state_code,
        label: st.state_label,
        receipts: st.receipts_rm_m,
        recovery: st.recovery_vs_2019_pct,
        visitors: st.visitors_k,
      }))
      .sort((a, b) => b.receipts - a.receipts)
  }, [data])

  const maxReceipts = Math.max(...chartData.map((d) => d.receipts), 1)

  return (
    <div className="h-full flex flex-col">
      <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c] mb-3">
        Tourism Revenue by State
      </h3>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {chartData.map((d) => {
          const pct = (d.receipts / maxReceipts) * 100
          const isSelected = state === d.code
          return (
            <button
              key={d.code}
              onClick={() => setState(isSelected ? 'all' : d.code)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                isSelected ? 'bg-[#e6e9f7]' : 'hover:bg-[#f3f5fa]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-sans text-[12px] font-medium text-[#1c1c1c]">
                  {d.label}
                </span>
                <span className="font-mono text-[12px] text-[#4a4a4a]" style={{ fontFamily: "'Gantari', sans-serif" }}>
                  RM{(d.receipts / 1000).toFixed(1)}B
                </span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#dfe3ee' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isSelected ? '#1a2b88' : '#8ea0c8',
                  }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}