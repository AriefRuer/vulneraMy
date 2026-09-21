import { useMemo } from 'react'
import { usePageFilters, fmtRM } from '../../store'
import { sectorName } from '../../constants'
import { optimalAllocation, bauAllocation, type AllocRow } from '../../lib/simulation'

interface Props {
  data: Record<string, unknown> | null
}

// Where the budget goes — LIVE. Two bars per industry (optimal vs status quo)
// recomputed from the current slider budget. Industries are ordered by job density
// so the reader sees the LP concentrate spend on the densest ones first.
export default function AllocationCompare({ data }: Props) {
  const { simBudget } = usePageFilters()

  const rows = useMemo<AllocRow[]>(() => {
    const alloc = data?.allocation as AllocRow[] | undefined
    return alloc?.filter((r) => typeof r.jobs_per_rm1m_attributable === 'number') ?? []
  }, [data])

  const view = useMemo(() => {
    if (rows.length === 0) return null
    const opt = optimalAllocation(rows, simBudget)
    const bau = bauAllocation(rows, simBudget)
    const sorted = [...rows].sort(
      (a, b) => b.jobs_per_rm1m_attributable - a.jobs_per_rm1m_attributable,
    )
    const maxAlloc = Math.max(
      ...sorted.map((r) =>
        Math.max(opt.byIndustry[r.industry_code], bau.byIndustry[r.industry_code]),
      ),
      1,
    )
    return { sorted, opt, bau, maxAlloc }
  }, [rows, simBudget])

  if (!view) return null
  const { sorted, opt, bau, maxAlloc } = view

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">Where the money goes</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-sans text-[10px] text-[#4a4a4a]">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#1a2b88' }} />
            Optimal
          </span>
          <span className="flex items-center gap-1.5 font-sans text-[10px] text-[#4a4a4a]">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#c3cbd9' }} />
            Status quo
          </span>
        </div>
      </div>
      <p className="font-sans text-[11px] text-[#9aa3b5] mb-3">
        Ordered by jobs per RM1M. The optimal plan funds the densest industries to their cap first.
      </p>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {sorted.map((r) => {
          const o = opt.byIndustry[r.industry_code]
          const b = bau.byIndustry[r.industry_code]
          return (
            <div key={r.industry_code}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-sans text-[12px] font-medium text-[#1c1c1c]">
                  {sectorName(r.industry_code)}
                </span>
                <span className="font-sans text-[10px] text-[#9aa3b5]">
                  {r.jobs_per_rm1m_attributable.toFixed(1)} jobs / RM1M
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#eef1f6' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(o / maxAlloc) * 100}%`, backgroundColor: '#1a2b88' }}
                  />
                </div>
                <span
                  className="font-sans text-[11px] text-[#1a2b88] w-16 text-right"
                  style={{ fontFamily: "'Gantari', sans-serif", fontWeight: 700 }}
                >
                  {fmtRM(o)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: '#eef1f6' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(b / maxAlloc) * 100}%`, backgroundColor: '#c3cbd9' }}
                  />
                </div>
                <span className="font-sans text-[11px] text-[#7b7b7b] w-16 text-right">
                  {fmtRM(b)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
