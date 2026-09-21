import { useMemo } from 'react'
import VizBox from '../components/VizBox'
import PayGapBars from '../components/charts/PayGapBars'
import SectorPayRank from '../components/charts/SectorPayRank'
import WageTrend from '../components/charts/WageTrend'
import { decentWorkSummary, type DecentWorkRow } from '../lib/decentWork'

interface Props {
  data: Record<string, unknown> | null
}

export default function DecentWorkPage({ data }: Props) {
  const summary = useMemo(() => {
    const dw = data?.decent_work as DecentWorkRow[] | undefined
    return decentWorkSummary(dw ?? [])
  }, [data])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Story + lead stats */}
      <VizBox className="lg:col-span-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-sans text-[15px] font-medium text-[#1c1c1c]">
              Volatile <span className="text-[#9aa3b5]">and</span> low-paid
            </h3>
            <p className="font-sans text-[12px] text-[#7b7b7b] mt-1 max-w-[660px]">
              Tourism industries pay below the national median.
            </p>
          </div>
          <span className="font-sans text-[10px] text-[#9aa3b5] whitespace-nowrap mt-1">
            Wages · 2024 snapshot
          </span>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <StatCard
              label="Weighted median pay"
              value={`RM${Math.round(summary.weightedMedian).toLocaleString()}`}
              note="across industries carrying tourism jobs"
            />
            <StatCard
              label="Of national median"
              value={`${summary.weightedPctOfNational.toFixed(0)}%`}
              note="tourism-dependent-jobs weighted"
              badge="below"
            />
            <StatCard
              label="National median"
              value={`RM${summary.nationalMedian.toLocaleString()}`}
              note="all sectors, 2024"
              muted
            />
            <StatCard
              label="Below national"
              value={`${summary.belowNational} / ${summary.total}`}
              note="industries paying under the median"
              badge="all"
            />
          </div>
        )}
      </VizBox>

      {/* Hero: pay gap by industry */}
      <VizBox className="lg:col-span-2 min-h-[340px]" vizId="wage-gap" vizTitle="Pay Gap by Industry">
        <PayGapBars data={data} />
      </VizBox>

      {/* Ranking among all sectors + trend */}
      <VizBox className="min-h-[440px]" vizId="pay-ladder" vizTitle="Pay Ladder of All Sectors">
        <SectorPayRank data={data} />
      </VizBox>
      <VizBox className="min-h-[440px]" vizId="wage-trend" vizTitle="Median Wage Trend Line">
        <WageTrend data={data} />
      </VizBox>

      {/* Method note */}
      <div className="lg:col-span-2 -mt-1">
        <p className="font-sans text-[10px] text-[#9aa3b5] leading-relaxed">
          <span className="font-semibold text-[#7b7b7b]">Method note.</span> Wages are DOSM Salaries
          &amp; Wages Survey medians for citizens in formal employment, reported at the whole-MSIC-industry
          level. They describe <span className="italic">the industries that carry tourism jobs</span>,
          not tourism jobs measured in isolation. The summary weights each industry by its
          tourism-attributable employment. Wage levels should be read within, not across, the 2020
          pandemic disruption in the series.
        </p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  note,
  badge,
  muted,
}: {
  label: string
  value: string
  note: string
  badge?: string
  muted?: boolean
}) {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{ backgroundColor: '#ffffff', border: '1px solid #eceef6', contain: 'layout style' }}
    >
      <div className="font-sans text-[11px] font-medium text-[#1a1a1a] mb-1.5">{label}</div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono text-[24px] font-bold tracking-tight leading-none"
          style={{ fontFamily: "'Gantari', sans-serif", color: muted ? '#7b7b7b' : '#1a2b88' }}
        >
          {value}
        </span>
        {badge && (
          <span
            className="font-sans text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#fdecea', color: '#c62828' }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="font-sans text-[10px] text-[#9aa3b5] mt-1.5">{note}</div>
    </div>
  )
}
