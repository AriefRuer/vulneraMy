import PressureQuadrant from '../components/charts/PressureQuadrant'
import TierTable from '../components/charts/TierTable'
import RecoveryRanking from '../components/charts/RecoveryRanking'
import VizBox from '../components/VizBox'

interface Props {
  data: Record<string, unknown> | null
}

export default function GeographicPage({ data }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <VizBox className="lg:col-span-2 min-h-[440px]" vizId="pressure-quadrant" vizTitle="Pressure vs Vulnerability">
        <PressureQuadrant data={data} />
      </VizBox>

      <VizBox className="min-h-[380px]" vizId="state-vulnerability" vizTitle="State Vulnerability Tier">
        <TierTable data={data} />
      </VizBox>

      <VizBox className="min-h-[380px]" vizId="recovery-ranking" vizTitle="Recovery Ranking">
        <RecoveryRanking data={data} />
      </VizBox>
    </div>
  )
}