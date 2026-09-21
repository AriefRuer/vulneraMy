import HeadcountVsAttributable from '../components/charts/HeadcountVsAttributable'
import SectorBreakdown from '../components/charts/SectorBreakdown'
import GeographicView from '../components/charts/GeographicView'
import MarketComposition from '../components/charts/MarketComposition'
import VizBox from '../components/VizBox'

interface Props {
  data: Record<string, unknown> | null
}

export default function OverviewPage({ data }: Props) {
  return (
    // 2×2 grid: hero + jobs-by-sector on top, geographic + donut below.
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <VizBox className="min-h-[360px]" vizId="headcount-vs-attributable" vizTitle="Headcount vs Tourism Dependent Jobs">
        <HeadcountVsAttributable data={data} />
      </VizBox>

      <VizBox className="min-h-[360px]" vizId="jobs-by-sector" vizTitle="Jobs by Sector">
        <SectorBreakdown data={data} />
      </VizBox>

      <VizBox className="min-h-[360px]" vizId="revenue-by-state" vizTitle="Revenue by State">
        <GeographicView data={data} />
      </VizBox>

      <VizBox className="min-h-[360px]" vizId="spending-composition" vizTitle="Spending Composition">
        <MarketComposition data={data} />
      </VizBox>
    </div>
  )
}