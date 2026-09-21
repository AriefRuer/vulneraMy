import HhiLine from '../components/charts/HhiLine'
import OdHeatmap from '../components/charts/OdHeatmap'
import MarketStats from '../components/charts/MarketStats'
import VizBox from '../components/VizBox'

interface Props {
  data: Record<string, unknown> | null
}

// Labelled divider. This page carries two very different measures a reader can
// easily conflate, so each gets an explicit header.
function SectionHeader({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="lg:col-span-2 flex items-baseline gap-3 mt-1">
      <span
        className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1a2b88] whitespace-nowrap"
        style={{ fontFamily: "'Alexandria', sans-serif", fontWeight: 700 }}
      >
        {eyebrow}
      </span>
      <span className="flex-1 h-px bg-[#ECEEF6]" />
    </div>
  )
}

export default function MarketPage({ data }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionHeader eyebrow="International Inbound Concentration" />
      <VizBox className="lg:col-span-2" vizId="top-market-stats" vizTitle="Top Market Statistics">
        <MarketStats data={data} />
      </VizBox>
      <VizBox className="lg:col-span-2 min-h-[380px]" vizId="market-concentration-hhi" vizTitle="Inbound Market Concentration">
        <HhiLine data={data} />
      </VizBox>

      <SectionHeader eyebrow="Domestic Inter-state Flows" />
      <VizBox className="lg:col-span-2 min-h-[440px]" vizId="od-heatmap" vizTitle="Home State to Destination Flows">
        <OdHeatmap data={data} />
      </VizBox>
    </div>
  )
}