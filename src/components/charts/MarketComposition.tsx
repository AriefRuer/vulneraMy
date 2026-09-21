import { useMemo } from 'react'
import { useFilters } from '../../store'

interface Props {
  data: Record<string, unknown> | null
}

interface MarketData {
  label: string
  value: number
  color: string
}

// Donut scales via viewBox + preserveAspectRatio → fills its box at every
// screen size without distorting the circle.
const VW = 300
const VH = 300
const CX = 150
const CY = 150
const R = 105

export default function MarketComposition({ data }: Props) {
  const { year } = useFilters()

  const chartData = useMemo<MarketData[]>(() => {
    const kpiArr = data?.kpi as Array<{ kpi_code: string; value: number }> | undefined
    const emp = data?.employment_national as Array<{
      year: number
      expenditure_inb_rm_m: number
      expenditure_dom_rm_m: number
    }> | undefined
    if (!emp) return []

    const targetYear = year === 'all' ? 2024 : year
    const filtered = emp.filter((e) => e.year === targetYear)
    const latest = filtered[filtered.length - 1]

    if (!latest) {
      const inb = kpiArr?.find((k) => k.kpi_code === 'expenditure_inbound_rm_m')?.value || 0
      const dom = kpiArr?.find((k) => k.kpi_code === 'expenditure_domestic_rm_m')?.value || 0
      return [
        { label: 'International', value: inb, color: '#1a2b88' },
        { label: 'Domestic', value: dom, color: '#b6bdcc' },
      ]
    }

    return [
      { label: 'International', value: latest.expenditure_inb_rm_m, color: '#1a2b88' },
      { label: 'Domestic', value: latest.expenditure_dom_rm_m, color: '#b6bdcc' },
    ]
  }, [data, year])

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c] mb-2">
        Spending Composition
      </h3>

      {/* Donut fills available height; viewBox keeps it circular on every screen */}
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0 }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
          aria-label="Spending composition donut"
        >
          {(() => {
            const circumference = 2 * Math.PI * R
            let offset = 0
            const arcs = chartData.map((d) => {
              const pct = d.value / total
              const dashLen = pct * circumference
              const dashOffset = -offset
              offset += dashLen
              return { ...d, dashLen, dashOffset }
            })
            return (
              <>
                {arcs.map((d, i) => (
                  <circle
                    key={i}
                    cx={CX}
                    cy={CY}
                    r={R}
                    fill="none"
                    stroke={d.color}
                    strokeWidth="42"
                    strokeDasharray={`${d.dashLen} ${circumference - d.dashLen}`}
                    strokeDashoffset={d.dashOffset}
                    className="transition-all duration-500"
                  />
                ))}
                <text x="150" y="146" textAnchor="middle" fontFamily="Gantari, sans-serif" fontSize="26" fontWeight="700" fill="#1a2b88">
                  {`RM${(total / 1000).toFixed(1)}B`}
                </text>
                <text x="150" y="172" textAnchor="middle" fontFamily="Alexandria, sans-serif" fontSize="13" fill="#4a4a4a">
                  Spending
                </text>
              </>
            )
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="font-sans text-[12px] text-[#1a1a1a]">
              {d.label} ({((d.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}