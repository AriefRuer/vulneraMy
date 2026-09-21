import SectorWaterfall from '../components/charts/SectorWaterfall'
import JobsPerRM1M from '../components/charts/JobsPerRM1M'
import VizBox from '../components/VizBox'

interface Props {
  data: Record<string, unknown> | null
}

export default function StructuralPage({ data }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <VizBox className="lg:col-span-2 min-h-[380px]" vizId="jobs-change-waterfall" vizTitle="Jobs Change Waterfall">
        <SectorWaterfall data={data} />
      </VizBox>

      <VizBox className="lg:col-span-2 min-h-[360px]" vizId="jobs-per-rm1m" vizTitle="Jobs per RM1M">
        <JobsPerRM1M data={data} />
      </VizBox>
    </div>
  )
}