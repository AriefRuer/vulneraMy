import { useMemo } from 'react'
import { useFilters } from '../store'
import { sectorName } from '../constants'

interface Props {
  data: Record<string, unknown> | null
}

// Which global filters each page can actually respond to. A page greys out any
// filter whose data has no corresponding dimension (DESIGN_GUIDE live/static
// rule): e.g. Decent Work's wages and Geographic's quadrant are 2024 snapshots
// with no year/state grain, so those selectors are disabled on those pages.
const PAGE_FILTERS: Record<string, { year: boolean; state: boolean; sector: boolean }> = {
  overview: { year: true, state: true, sector: true },
  structural: { year: false, state: false, sector: true }, // waterfall owns its years; jobs/RM1M & waterfall are sector-driven
  geographic: { year: false, state: true, sector: false }, // quadrant/tier/recovery are 2024-statics; recovery has its own years
  markets: { year: true, state: true, sector: false },     // MarketStats + OD respond to year; OD sets state; no sector
  simulation: { year: false, state: false, sector: false }, // LP budget slider only
  'decent-work': { year: false, state: false, sector: true }, // wages are a 2024 snapshot; only sector applies
  sdg: { year: false, state: false, sector: false },       // official indicators, no global-filter dimensions
}

export default function FilterBar({ data }: Props) {
  const { year, state, sector, setYear, setState, setSector, activePage } = useFilters()
  const available = PAGE_FILTERS[activePage] ?? { year: true, state: true, sector: true }

  const years = useMemo(() => {
    const emp = data?.employment_national as Array<{ year: number }> | undefined
    if (!emp) return []
    return [...new Set(emp.map((e) => e.year))]
      .filter((y) => y >= 2018) // state-level spending starts 2018; pre-2018 filters would be empty
      .sort()
  }, [data])

  const states = useMemo(() => {
    const s = data?.dim_state as Array<{ state_code: string; state_label: string }> | undefined
    if (!s) return []
    return s.map((st) => ({ code: st.state_code, label: st.state_label }))
  }, [data])

  const sectors = useMemo(() => {
    const ind = data?.employment_industry as Array<{ industry_code: string }> | undefined
    if (!ind) return []
    return [...new Set(ind.map((i) => i.industry_code))].sort()
  }, [data])

  const selectCls = (enabled: boolean) =>
    `text-[13px] font-medium bg-white border border-[var(--color-border)] rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] ${
      enabled
        ? 'text-[var(--color-text-primary)] cursor-pointer'
        : 'text-[#b3bacb] cursor-not-allowed opacity-60'
    }`

  return (
    <div className="flex items-center justify-end gap-3 px-6 py-3 bg-white"
      style={{ borderBottom: '1px solid #eceef6' }}>
      {/* Year */}
      <div className="flex flex-col">
        <label className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5"
          style={{ color: available.year ? undefined : '#b3bacb' }}>
          Year
        </label>
        <select
          value={year === 'all' ? 'all' : year}
          disabled={!available.year}
          title={available.year ? undefined : 'Not available for this page'}
          onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className={selectCls(available.year)}
        >
          <option value="all">All</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* State */}
      <div className="flex flex-col">
        <label className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5"
          style={{ color: available.state ? undefined : '#b3bacb' }}>
          State
        </label>
        <select
          value={state}
          disabled={!available.state}
          title={available.state ? undefined : 'Not available for this page'}
          onChange={(e) => setState(e.target.value)}
          className={selectCls(available.state)}
        >
          <option value="all">All</option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Sector */}
      <div className="flex flex-col">
        <label className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-0.5"
          style={{ color: available.sector ? undefined : '#b3bacb' }}>
          Sector
        </label>
        <select
          value={sector}
          disabled={!available.sector}
          title={available.sector ? undefined : 'Not available for this page'}
          onChange={(e) => setSector(e.target.value)}
          className={selectCls(available.sector)}
        >
          <option value="all">All</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{sectorName(s)}</option>
          ))}
        </select>
      </div>
    </div>
  )
}