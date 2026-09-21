import { useMemo } from 'react'
import VizBox from '../components/VizBox'
import TourismGdpTrend from '../components/charts/TourismGdpTrend'
import SdgToolMatrix from '../components/charts/SdgToolMatrix'
import { fmtRM } from '../store'

interface Props {
  data: Record<string, unknown> | null
}

interface Sdg891Row {
  year: number
  tdgdp_rm_m: number
  proportion_pct: number
}
interface Sdg12Row {
  tool: string
  tourism_disaggregated: number
}

export default function SdgPage({ data }: Props) {
  const stats = useMemo(() => {
    const s = (data?.sdg_891 as Sdg891Row[] | undefined) ?? []
    const s12 = (data?.sdg_12b1 as Sdg12Row[] | undefined) ?? []
    if (s.length === 0) return null
    const sorted = [...s].sort((a, b) => a.year - b.year)
    const latest = sorted[sorted.length - 1]
    const trough = sorted.reduce((p, c) => (c.proportion_pct < p.proportion_pct ? c : p))
    const seea = s12.filter((r) => r.tool === 'SEEA')
    return {
      latest,
      trough,
      seeaDisagg: seea.filter((r) => r.tourism_disaggregated).length,
      seeaTotal: seea.length,
    }
  }, [data])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Story + lead stats */}
      <VizBox className="lg:col-span-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-sans text-[15px] font-medium text-[#1c1c1c]">
              How tourism measures up on the SDGs
            </h3>
            <p className="font-sans text-[12px] text-[#7b7b7b] mt-1 max-w-[680px]">
              Two official indicators, nothing extra. <span className="font-medium text-[#1c1c1c]">8.9.1</span> shows how
              much tourism contributes to the economy and how sharply that swings.
              <span className="font-medium text-[#1c1c1c]"> 12.b.1</span> asks whether the tools exist to
              track tourism's sustainability.
            </p>
          </div>
          <span className="font-sans text-[10px] text-[#9aa3b5] whitespace-nowrap mt-1">
            SDG 8.9.1 &amp; 12.b.1
          </span>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <StatCard
              label="SDG 8.9.1 (2024)"
              value={`${stats.latest.proportion_pct}%`}
              note="Tourism Direct GDP / total GDP"
            />
            <StatCard
              label="Tourism Direct GDP"
              value={fmtRM(stats.latest.tdgdp_rm_m)}
              note={`${stats.latest.year}, national`}
              muted
            />
            <StatCard
              label="Pandemic low"
              value={`${stats.trough.proportion_pct}%`}
              note={`${stats.trough.year}, the volatility measured`}
              badge="collapse"
            />
            <StatCard
              label="SDG 12.b.1 gap"
              value={`${stats.seeaDisagg} / ${stats.seeaTotal}`}
              note="environmental accounts tourism-split"
              badge="gap"
            />
          </div>
        )}
      </VizBox>

      {/* The two indicators, side by side */}
      <VizBox className="min-h-[420px]" vizId="tour-gdp-share" vizTitle="Tourism Direct GDP Share">
        <TourismGdpTrend data={data} />
      </VizBox>
      <VizBox className="min-h-[420px]" vizId="sdg-tool-matrix" vizTitle="SDG Measurement Tools">
        <SdgToolMatrix data={data} />
      </VizBox>

      {/* Method note */}
      <div className="lg:col-span-2 -mt-1">
        <p className="font-sans text-[10px] text-[#9aa3b5] leading-relaxed">
          <span className="font-semibold text-[#7b7b7b]">Method note.</span> Both are official UN SDG
          indicators computed by DOSM. <span className="italic">8.9.1</span> is Tourism Direct GDP over
          total GDP (Tourism Satellite Account, 2015–2024). <span className="italic">12.b.1</span> records
          which standard accounting tools Malaysia implements. It is a measurement-capacity indicator, not a
          sustainability score. We deliberately make no claim about tourism being environmentally
          sustainable, because the environmental accounts are not yet tourism-disaggregated to support one.
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
