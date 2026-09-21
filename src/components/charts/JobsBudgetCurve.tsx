import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { usePageFilters } from '../../store'
import { useElementWidth } from '../../hooks/useElementWidth'
import {
  optimalAllocation,
  bauAllocation,
  SIM_MIN_BUDGET,
  SIM_MAX_BUDGET,
  type AllocRow,
} from '../../lib/simulation'

interface Props {
  data: Record<string, unknown> | null
}

// Jobs created vs budget — LIVE. Both curves are swept in JS across the budget
// range; the optimal curve bends downward as high-efficiency industries fill their
// caps (diminishing returns), while the status-quo line stays a shallow straight
// ramp. A marker tracks the current slider value.
export default function JobsBudgetCurve({ data }: Props) {
  const { simBudget } = usePageFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const rows = useMemo<AllocRow[]>(() => {
    const alloc = data?.allocation as AllocRow[] | undefined
    return alloc?.filter((r) => typeof r.jobs_per_rm1m_attributable === 'number') ?? []
  }, [data])

  const curve = useMemo(() => {
    if (rows.length === 0) return []
    const pts: { budget: number; opt: number; bau: number }[] = []
    const steps = 100
    for (let i = 0; i <= steps; i++) {
      const budget = SIM_MIN_BUDGET + ((SIM_MAX_BUDGET - SIM_MIN_BUDGET) * i) / steps
      pts.push({
        budget,
        opt: optimalAllocation(rows, budget).jobsK,
        bau: bauAllocation(rows, budget).jobsK,
      })
    }
    return pts
  }, [rows])

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || curve.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const w = Math.max(width || 320, 320)
    const height = 320
    const margin = { top: 16, right: 20, bottom: 48, left: 52 }
    const innerW = w - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr('width', w).attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear().domain([SIM_MIN_BUDGET, SIM_MAX_BUDGET]).range([0, innerW])
    const yMax = d3.max(curve, (d) => d.opt)! * 1.1
    const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0])

    const grid = g.append('g').attr('class', 'chart-grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(() => ''))
    grid.selectAll('line').attr('stroke', '#eceef6')

    g.append('g').attr('class', 'chart-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `RM${((d as number) / 1000).toFixed(0)}B`))
    g.append('g').attr('class', 'chart-axis').call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}k`))

    const optLine = d3.line<{ budget: number; opt: number }>()
      .x((d) => x(d.budget)).y((d) => y(d.opt)).curve(d3.curveMonotoneX)
    const bauLine = d3.line<{ budget: number; bau: number }>()
      .x((d) => x(d.budget)).y((d) => y(d.bau)).curve(d3.curveMonotoneX)

    // Status quo (BAU) — muted
    g.append('path').datum(curve).attr('fill', 'none')
      .attr('stroke', '#c3cbd9').attr('stroke-width', 2).attr('stroke-dasharray', '5,4').attr('d', bauLine)
    // Optimal — accent
    g.append('path').datum(curve).attr('fill', 'none')
      .attr('stroke', '#1a2b88').attr('stroke-width', 2.5).attr('d', optLine)

    // Inline series labels at the right end
    const last = curve[curve.length - 1]
    g.append('text').attr('x', innerW - 2).attr('y', y(last.opt) - 8).attr('text-anchor', 'end')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '10px').attr('font-weight', 600)
      .attr('fill', '#1a2b88').text('Optimal (targeted)')
    g.append('text').attr('x', innerW - 2).attr('y', y(last.bau) + 14).attr('text-anchor', 'end')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '10px')
      .attr('fill', '#8a93a6').text('Status quo')

    // Current-budget marker
    const optNow = optimalAllocation(rows, simBudget).jobsK
    const bauNow = bauAllocation(rows, simBudget).jobsK
    g.append('line').attr('x1', x(simBudget)).attr('x2', x(simBudget)).attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#1a2b88').attr('stroke-width', 1).attr('stroke-dasharray', '2,3').attr('opacity', 0.5)
    g.append('circle').attr('cx', x(simBudget)).attr('cy', y(bauNow)).attr('r', 4)
      .attr('fill', '#fff').attr('stroke', '#8a93a6').attr('stroke-width', 2)
    g.append('circle').attr('cx', x(simBudget)).attr('cy', y(optNow)).attr('r', 5)
      .attr('fill', '#1a2b88').attr('stroke', '#fff').attr('stroke-width', 2)

    // Hover overlay
    const tooltip = d3.select(tooltipRef.current)
    g.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'transparent')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event)
        const b = Math.max(SIM_MIN_BUDGET, Math.min(SIM_MAX_BUDGET, x.invert(mx)))
        const o = optimalAllocation(rows, b).jobsK
        const ba = bauAllocation(rows, b).jobsK
        tooltip.style('display', 'block')
          .style('left', `${x(b) + margin.left}px`)
          .style('top', `${y(o) - 10}px`)
          .html(
            `<div style="font-weight:600;margin-bottom:4px">RM${(b / 1000).toFixed(1)}B budget</div>` +
            `<div style="color:#8ea0ff">Optimal: ${o.toFixed(1)}k jobs</div>` +
            `<div style="color:#c3cbd9">Status quo: ${ba.toFixed(1)}k jobs</div>`,
          )
      })
      .on('mouseleave', () => tooltip.style('display', 'none'))

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 38).attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Tourism budget (RM)')
    // Y-axis label
    g.append('text')
      .attr('transform', `translate(-44, ${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Jobs created (thousands)')
  }, [curve, rows, simBudget, width])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c] mb-1">
        Jobs created as the budget grows
      </h3>
      <p className="font-sans text-[11px] text-[#9aa3b5] mb-3">
        Targeting the most job-dense industries first beats spreading spend by status quo. The gap is the prize.
      </p>
      <div className="relative flex-1" ref={boxRef} style={{ minHeight: 220 }}>
        <svg className="w-full" />
        <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
      </div>
    </div>
  )
}
