import { useMemo } from 'react'
import VizBox from '../components/VizBox'
import JobsBudgetCurve from '../components/charts/JobsBudgetCurve'
import AllocationCompare from '../components/charts/AllocationCompare'
import { usePageFilters, fmtK, fmtRM } from '../store'
import {
  optimalAllocation,
  bauAllocation,
  SIM_MIN_BUDGET,
  SIM_MAX_BUDGET,
  SIM_STEP,
  SIM_STUDIED_BUDGET,
  type AllocRow,
} from '../lib/simulation'

interface Props {
  data: Record<string, unknown> | null
}

export default function SimulationPage({ data }: Props) {
  const { simBudget, setSimBudget } = usePageFilters()

  const rows = useMemo<AllocRow[]>(() => {
    const alloc = data?.allocation as AllocRow[] | undefined
    return alloc?.filter((r) => typeof r.jobs_per_rm1m_attributable === 'number') ?? []
  }, [data])

  const kpis = useMemo(() => {
    if (rows.length === 0) return null
    const opt = optimalAllocation(rows, simBudget)
    const bau = bauAllocation(rows, simBudget)
    const additional = opt.jobsK - bau.jobsK
    const uplift = bau.jobsK > 0 ? (additional / bau.jobsK) * 100 : 0
    const costPerJob = opt.jobsK > 0 ? (simBudget * 1000) / opt.jobsK : 0 // RM per job
    return { opt, bau, additional, uplift, costPerJob }
  }, [rows, simBudget])

  const atStudied = simBudget === SIM_STUDIED_BUDGET

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Controls + live KPIs */}
      <VizBox className="lg:col-span-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-sans text-[15px] font-medium text-[#1c1c1c]">
              Budget Simulation
            </h3>
            <p className="font-sans text-[12px] text-[#7b7b7b] mt-1 max-w-[660px]">
              Pick an annual tourism budget with the slider. See how many jobs each
              spending strategy creates and where the money goes. Optimal targets the
              most job-dense industries first; the status quo spreads the budget by
              today's spending shares.
            </p>
          </div>
          <span className="font-sans text-[10px] text-[#9aa3b5] whitespace-nowrap mt-1">
            LP model · live sweep · slider re-runs the model
          </span>
        </div>

        {/* Budget slider */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-sans text-[11px] uppercase tracking-wide text-[#7b7b7b]">
              Annual tourism budget
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className="font-sans text-[24px] font-bold text-[#1a2b88] leading-none"
                style={{ fontFamily: "'Gantari', sans-serif" }}
              >
                {fmtRM(simBudget)}
              </span>
              {atStudied && (
                <span
                  className="font-sans text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#e6e9f7', color: '#1a2b88' }}
                >
                  studied scenario
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={SIM_MIN_BUDGET}
            max={SIM_MAX_BUDGET}
            step={SIM_STEP}
            value={simBudget}
            onChange={(e) => setSimBudget(Number(e.target.value))}
            className="w-full accent-[#1a2b88] cursor-pointer"
            aria-label="Annual tourism budget in RM millions"
          />
          <div className="flex justify-between font-sans text-[10px] text-[#9aa3b5] mt-1">
            <span>{fmtRM(SIM_MIN_BUDGET)}</span>
            <span>{fmtRM(SIM_MAX_BUDGET)}</span>
          </div>
        </div>

        {/* Live KPI cards */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <KpiCard
              label="Jobs created, optimal"
              value={fmtK(kpis.opt.jobsK)}
              note="attributable jobs"
            />
            <KpiCard
              label="Jobs created, status quo"
              value={fmtK(kpis.bau.jobsK)}
              note="same budget, today's shares"
              muted
            />
            <KpiCard
              label="Additional jobs"
              value={`+${fmtK(kpis.additional)}`}
              note="optimal over status quo"
              badge={`+${kpis.uplift.toFixed(0)}%`}
            />
            <KpiCard
              label="Cost per job"
              value={`RM${(kpis.costPerJob / 1000).toFixed(1)}k`}
              note="per attributable job"
            />
          </div>
        )}
      </VizBox>

      {/* Live sweep curve */}
      <VizBox className="min-h-[420px]" vizId="jobs-budget-curve" vizTitle="Jobs vs Budget Curve">
        <JobsBudgetCurve data={data} />
      </VizBox>

      {/* Live per-industry allocation */}
      <VizBox className="min-h-[420px]" vizId="where-money-goes" vizTitle="Where the Money Goes">
        <AllocationCompare data={data} />
      </VizBox>

      {/* Model provenance */}
      <div className="lg:col-span-2 -mt-1">
        <p className="font-sans text-[10px] text-[#9aa3b5] leading-relaxed">
          <span className="font-semibold text-[#7b7b7b]">Model note.</span> Jobs are recomputed live
          in the browser from the published <span className="italic">allocation</span> grain
          (attributable jobs per RM1M and each industry's absorption cap). The objective is linear,
          so the optimum is a greedy fill of the most job-dense industries up to their caps. This
          reproduces the published {fmtRM(SIM_STUDIED_BUDGET)} LP result exactly. Status quo
          allocates in proportion to current expenditure. Marginal returns are held constant within
          each cap; real programmes would face additional frictions.
        </p>
      </div>
    </div>
  )
}

function KpiCard({
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
            style={{ backgroundColor: '#e6f4ea', color: '#1e8e3e' }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="font-sans text-[10px] text-[#9aa3b5] mt-1.5">{note}</div>
    </div>
  )
}
