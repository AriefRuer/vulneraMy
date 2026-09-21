import { useMemo } from 'react'
import { tourismIndustryEn, type DecentWorkRow, type Wage2024Row } from '../../lib/decentWork'

interface Props {
  data: Record<string, unknown> | null
}

// Shorten DOSM's long MSIC labels for a compact ranked list.
const SHORT: Record<string, string> = {
  'Wholesale and retail trade; repair of motor vehicles and motorcycles': 'Wholesale & retail',
  'Accommodation and food and beverage service activities': 'Accommodation & F&B',
  'Transportation and storage': 'Transportation & storage',
  'Administrative and support service activities': 'Admin & support',
  'Arts, entertainment and recreation': 'Arts & entertainment',
  'Other service activities': 'Other services',
  'Electricity, gas, steam and air conditioning supply': 'Electricity & gas',
  'Water supply; sewerage, waste management and remediation activities': 'Water & waste',
  'Professional, scientific and technical activities': 'Professional & technical',
  'Financial and insurance/takaful activities': 'Finance & insurance',
  'Information and communication': 'Info & communication',
  'Public administration and defence; compulsory social security': 'Public administration',
  'Human health and social work activities': 'Health & social work',
  'Mining and quarrying': 'Mining & quarrying',
  'Real estate activities': 'Real estate',
}
const short = (s: string) => SHORT[s] ?? s

// Where the tourism-carrying industries rank among all sectors — LIVE from
// wages_2024. Tourism industries are highlighted; they cluster at the bottom.
export default function SectorPayRank({ data }: Props) {
  const view = useMemo(() => {
    const wages = data?.wages_2024 as Wage2024Row[] | undefined
    const dw = data?.decent_work as DecentWorkRow[] | undefined
    if (!wages || !dw) return null
    const tourism = tourismIndustryEn(dw)
    const national = wages.find((r) => r.is_national_total)?.median_salary_rm ?? 2793
    const sectors = wages
      .filter((r) => !r.is_national_total)
      .sort((a, b) => b.median_salary_rm - a.median_salary_rm)
    const max = Math.max(...sectors.map((r) => r.median_salary_rm), 1)
    return { sectors, national, max, tourism }
  }, [data])

  if (!view) return null
  const { sectors, national, max, tourism } = view

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">Pay ladder of all sectors</h3>
        <span className="flex items-center gap-1.5 font-sans text-[10px] text-[#4a4a4a]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#1a2b88' }} />
          Carries tourism jobs
        </span>
      </div>
      <p className="font-sans text-[11px] text-[#9aa3b5] mb-3">
        The industries carrying tourism jobs sit near the bottom of the national pay ladder.
      </p>
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {sectors.map((r) => {
          const isTourism = tourism.has(r.industry_en)
          const below = r.median_salary_rm < national
          return (
            <div key={r.industry_en} className="flex items-center gap-2" title={r.industry_en}>
              <span
                className="font-sans text-[11px] w-[104px] shrink-0 truncate"
                style={{ color: isTourism ? '#1c1c1c' : '#9aa3b5', fontWeight: isTourism ? 600 : 400 }}
              >
                {short(r.industry_en)}
              </span>
              <div className="flex-1 h-3 rounded-sm relative" style={{ backgroundColor: '#f2f4f9' }}>
                <div
                  className="h-3 rounded-sm"
                  style={{ width: `${(r.median_salary_rm / max) * 100}%`, backgroundColor: isTourism ? '#1a2b88' : '#dfe3ee' }}
                />
                {/* National-median marker */}
                <div
                  className="absolute top-[-2px] bottom-[-2px] w-px"
                  style={{ left: `${(national / max) * 100}%`, backgroundColor: '#c62828' }}
                />
              </div>
              <span
                className="font-sans text-[10px] w-12 text-right shrink-0"
                style={{ fontFamily: "'Gantari', sans-serif", fontWeight: 700, color: isTourism ? (below ? '#c62828' : '#1a2b88') : '#9aa3b5' }}
              >
                {r.median_vs_national_pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        Red line = national median (RM{national.toLocaleString()}). Values are % of national.
      </p>
    </div>
  )
}
