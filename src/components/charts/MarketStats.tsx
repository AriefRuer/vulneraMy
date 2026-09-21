import { useMemo } from 'react'
import { useFilters } from '../../store'

interface Props {
  data: Record<string, unknown> | null
}

interface MonthRow {
  month_start: string
  hhi_country: number
  top_country_share_pct: number
  active_markets_n: number
  top_country: string
}

// Market-health stats from the only country-level data in the bundle:
// arrivals_national (HHI, Singapore share, active markets). These recompute for
// the selected Year filter — the latest available month of that year. The KPI
// cards are LIVE, not static: pick a year and the top market / HHI / active
// markets all update from real monthly data (2020–2024). Honest — we show what
// the data supports, nothing more. "Singapore" is the top market only in the
// post-2020 era; 2020–2021 swung between IDN/THA/SGP and we show whatever the
// data says.
export default function MarketStats({ data }: Props) {
  const { year } = useFilters()

  const stats = useMemo(() => {
    const arr = (data?.arrivals_national as MonthRow[] | undefined) ?? []
    if (arr.length === 0) return null

    // For HHI we use the monthly series; for the "top market" we look at the
    // latest month in the selected year.
    const topCountry = new Map<string, { share: number; markets: number }>()
    arr.forEach((r) => {
      topCountry.set(r.top_country, {
        share: r.top_country_share_pct,
        markets: r.active_markets_n,
      })
    })

    const targetYear = year === 'all' ? 2024 : year
    const yearRows = arr.filter((r) => Number(r.month_start.slice(0, 4)) === targetYear)
    const latest = yearRows.length > 0 ? yearRows[yearRows.length - 1] : arr[arr.length - 1]

    const hhiYear = yearRows.length > 0
      ? yearRows.reduce((s, r) => s + r.hhi_country, 0) / yearRows.length
      : latest.hhi_country

    // Top-market share is annualised (mean over the year's months), matching the
    // temporal basis of the HHI tile beside it. Both are labelled with the year,
    // so both must be year-level figures — not a single latest-month value tagged
    // with a year. (Singapore is the top market in every month of the series, so
    // the label is stable; we still surface it from the latest row.)
    const topShareYear = yearRows.length > 0
      ? yearRows.reduce((s, r) => s + r.top_country_share_pct, 0) / yearRows.length
      : latest.top_country_share_pct

    const topRow = latest
    return {
      latest,
      hhiYear,
      activeYear: Number(latest.month_start.slice(0, 4)),
      topShare: topShareYear,
      topMarket: topRow.top_country,
      markets: Math.round(topRow.active_markets_n),
    }
  }, [data, year])

  if (!stats) return null

  // Map the top country code to a readable label (only these appear in data).
  const countryName: Record<string, string> = {
    SGP: 'Singapore', IDN: 'Indonesia', THA: 'Thailand', CHN: 'China',
    IND: 'India', AUS: 'Australia', JPN: 'Japan', KOR: 'South Korea',
  }
  const topName = countryName[stats.topMarket] ?? stats.topMarket

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #eceef6' }}>
        <div className="font-sans text-[10px] text-[#7b7b7b] uppercase tracking-wide">Top Market</div>
        <div className="font-sans text-[18px] font-bold text-[#1a2b88] mt-1" style={{ fontFamily: "'Gantari', sans-serif" }}>
          {topName}
        </div>
        <div className="font-sans text-[10px] text-[#9aa3b5]">{stats.topShare.toFixed(0)}% of arrivals · avg {stats.activeYear}</div>
      </div>
      <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #eceef6' }}>
        <div className="font-sans text-[10px] text-[#7b7b7b] uppercase tracking-wide">Concentration (HHI)</div>
        <div className="font-sans text-[18px] font-bold text-[#1a2b88] mt-1" style={{ fontFamily: "'Gantari', sans-serif" }}>
          {Math.round(stats.hhiYear).toLocaleString()}
        </div>
        <div className="font-sans text-[10px] text-[#c62828]">High (&gt;2500 = risky) · {stats.activeYear}</div>
      </div>
      <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #eceef6' }}>
        <div className="font-sans text-[10px] text-[#7b7b7b] uppercase tracking-wide">Active Markets</div>
        <div className="font-sans text-[18px] font-bold text-[#1a2b88] mt-1" style={{ fontFamily: "'Gantari', sans-serif" }}>
          {stats.markets}
        </div>
        <div className="font-sans text-[10px] text-[#9aa3b5]">countries sending tourists · {stats.activeYear}</div>
      </div>
    </div>
  )
}