import { useMemo } from 'react'
import { useFilters, fmtK, fmtRM, fmtPct } from '../store'
import { useAssistant } from './Assistant/AssistantContext'
import AiBadge from './Assistant/AiBadge'

// Build-time toggle: ship without the AI assistant when VITE_AI_ASSISTANT=false.
const AI_ASSISTANT = (import.meta.env.VITE_AI_ASSISTANT ?? 'true') !== 'false'

interface Props {
  data: Record<string, unknown> | null
}

interface KPI {
  label: string
  value: string
  unit: string
  vizId: string
  badge?: string
  badgeNote?: string
  badgeColor?: 'green' | 'red' | 'neutral'
}

export default function KPICardRow({ data }: Props) {
  const { year, state } = useFilters()
  const openFor = useAssistant((s) => s.openFor)

  const kpis = useMemo<KPI[]>(() => {
    if (!data) return []

    const kpiArr = data.kpi as Array<{ kpi_code: string; value: number; unit: string }> | undefined
    const empNatl = data.employment_national as Array<{
      year: number
      employment_k: number
      employment_attributable_k: number
      expenditure_int_rm_m: number
    }> | undefined
    const empState = data.state_panel as Array<{
      year: number
      state_code: string
      receipts_rm_m: number
    }> | undefined

    if (!kpiArr) return []

    const getKpi = (code: string) => kpiArr.find((k) => k.kpi_code === code)
    const sortedNatl = [...(empNatl || [])].sort((a, b) => b.year - a.year)

    const latestYear = (year === 'all' ? sortedNatl[0]?.year : year) ?? 2024
    const current = sortedNatl.find((e) => e.year === latestYear)
    const prev = sortedNatl.find((e) => e.year === latestYear - 1)

    let fiscalNote = 'National, ' + latestYear
    let totalSpending = 0
    if (state !== 'all') {
      const filteredState = (empState || []).filter((s) => s.state_code === state && s.year === latestYear)
      totalSpending = filteredState.reduce((sum, s) => sum + (s.receipts_rm_m || 0), 0)
      const stLabel = (data.dim_state as Array<{ state_code: string; state_label: string }> | undefined)?.find(
        (s) => s.state_code === state
      )?.state_label
      fiscalNote = (stLabel || state) + ', ' + latestYear
    } else {
      const natlRow = (empNatl || []).find((e) => e.year === latestYear)
      totalSpending = natlRow?.expenditure_int_rm_m ?? 0
      if (!totalSpending) {
        const intl = getKpi('expenditure_inbound_rm_m')?.value || 0
        const dom = getKpi('expenditure_domestic_rm_m')?.value || 0
        totalSpending = intl + dom
      }
    }

    const headcount = current?.employment_k ?? getKpi('jobs_headcount_k')?.value ?? 0
    const attributable = current?.employment_attributable_k ?? getKpi('jobs_attributable_k')?.value ?? 0

    const empChange = prev ? ((headcount - prev.employment_k) / prev.employment_k) * 100 : undefined
    const attrChange = prev
      ? ((attributable - prev.employment_attributable_k) / prev.employment_attributable_k) * 100
      : undefined

    const drawdown = getKpi('jobs_attributable_drawdown_pct')

    return [
      {
        label: 'Tourism Employment',
        value: fmtK(headcount),
        unit: 'Persons • ' + latestYear,
        vizId: 'kpi-tourism-employment',
        badge: empChange !== undefined ? fmtPct(empChange) : undefined,
        badgeNote: 'vs ' + (latestYear - 1),
        badgeColor: empChange !== undefined ? (empChange >= 0 ? 'green' : 'red') : undefined,
      },
      {
        label: 'Tourism Dependent Jobs',
        value: fmtK(attributable),
        unit: 'Persons • ' + latestYear,
        vizId: 'kpi-tourism-dependent',
        badge: attrChange !== undefined ? fmtPct(attrChange) : undefined,
        badgeNote: 'vs ' + (latestYear - 1),
        badgeColor: attrChange !== undefined ? (attrChange >= 0 ? 'green' : 'red') : undefined,
      },
      {
        label: 'Total Spending',
        value: fmtRM(totalSpending),
        // value already carries the RM - do not repeat it in the unit line
        unit: fiscalNote,
        vizId: 'kpi-total-spending',
        badgeColor: 'neutral',
      },
      {
        label: 'Attributable Drawdown',
        value: `${drawdown?.value?.toFixed(1) || '-79.9'}%`,
        unit: 'Peak → Trough',
        vizId: 'kpi-attributable-drawdown',
        badgeColor: 'red',
      },
    ]
  }, [data, year, state])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="relative rounded-xl p-4 transition-shadow hover:shadow-md group"
          onContextMenu={AI_ASSISTANT ? (e) => { e.preventDefault(); openFor(kpi.vizId) } : undefined}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #eceef6',
            boxShadow: '0 2px 8px rgba(26,27,32,0.05)',
            contain: 'layout style',
            cursor: AI_ASSISTANT ? 'context-menu' : 'default',
          }}
        >
          {AI_ASSISTANT && (
            <>
              <div
                className="pointer-events-none absolute top-1 right-6 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                aria-hidden
              >
                <span
                  className="font-sans text-[8px] font-medium tracking-wide whitespace-nowrap"
                  style={{ color: 'rgba(122,122,122,0.85)' }}
                >
                  Insights
                </span>
              </div>
              <div className="pointer-events-none absolute -top-2 -right-2 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="pointer-events-auto">
                  <AiBadge vizId={kpi.vizId} vizTitle={kpi.label} size={22} />
                </span>
              </div>
            </>
          )}
          <div className="mb-2">
            <span className="font-sans text-[12px] font-medium text-[#1a1a1a]">
              {kpi.label}
            </span>
          </div>
          <span
            className="font-mono text-[30px] font-bold tracking-tight leading-none block"
            style={{ fontFamily: "'Gantari', sans-serif", color: '#1a2b88' }}
          >
            {kpi.value}
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-sans text-[11px] text-[#4a4a4a]">{kpi.unit}</span>
            {kpi.badge && (
              <span
                className="font-sans text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: kpi.badgeColor === 'green' ? '#e6f4ea' : kpi.badgeColor === 'red' ? '#fdecea' : '#eceef6',
                  color: kpi.badgeColor === 'green' ? '#1e8e3e' : kpi.badgeColor === 'red' ? '#c62828' : '#1a1a1a',
                }}
                title={kpi.badgeNote}
              >
                {kpi.badge} {kpi.badgeNote}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}