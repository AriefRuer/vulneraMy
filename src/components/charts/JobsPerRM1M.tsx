import { useMemo } from 'react'
import { useFilters } from '../../store'
import { sectorName } from '../../constants'

interface Props {
  data: Record<string, unknown> | null
}

interface Row {
  industry_code: string
  current_expenditure_rm_m: number
  attributable_jobs_k: number
  jobs_per_rm1m_attributable: number
}

// Jobs created per RM1M of spending, attributable only (not headcount) — the
// non-attributable version inflates low-ratio sectors (DESIGN_GUIDE rule).
export default function JobsPerRM1M({ data }: Props) {
  const { sector, setSector } = useFilters()

  const rows = useMemo<Row[]>(() => {
    const alloc = data?.allocation as Row[] | undefined
    if (!alloc) return []
    return [...alloc]
      .filter((r) => typeof r.jobs_per_rm1m_attributable === 'number')
      .sort((a, b) => b.jobs_per_rm1m_attributable - a.jobs_per_rm1m_attributable)
  }, [data])

  const max = Math.max(...rows.map((r) => r.jobs_per_rm1m_attributable), 1)

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Jobs per RM1M of Spending
        </h3>
        <span className="font-sans text-[10px] text-[#9aa3b5]">Click to filter</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {rows.map((r) => {
          const selected = sector === r.industry_code
          return (
            <button
              key={r.industry_code}
              onClick={() => setSector(selected ? 'all' : r.industry_code)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                selected ? 'bg-[#e6e9f7]' : 'hover:bg-[#f3f5fa]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-sans text-[12px] font-medium text-[#1c1c1c]">
                  {sectorName(r.industry_code)}
                </span>
                <span className="font-sans text-[12px] text-[#1a2b88]" style={{ fontFamily: "'Gantari', sans-serif", fontWeight: 700 }}>
                  {r.jobs_per_rm1m_attributable.toFixed(1)}
                </span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#dfe3ee' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(r.jobs_per_rm1m_attributable / max) * 100}%`, backgroundColor: selected ? '#1a2b88' : '#8ea0c8' }}
                />
              </div>
            </button>
          )
        })}
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        Attributable jobs per RM1M. F&amp;B creates the most jobs per ringgit.
        <span className="text-[#9aa3b5]/70"> Fixed at 2024 (LP allocation); not year-filtered.</span>
      </p>
    </div>
  )
}