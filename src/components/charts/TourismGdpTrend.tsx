import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { fmtRM } from '../../store'
import { useElementWidth } from '../../hooks/useElementWidth'

interface Props {
  data: Record<string, unknown> | null
}

interface Sdg891Row {
  year: number
  tdgdp_rm_m: number
  gdp_rm_m: number
  proportion_pct: number
  growth_rate_pct: number | null
}

// SDG 8.9.1 — Tourism Direct GDP as a proportion of total GDP, 2015–2024.
// The official UN indicator; its own shape is the volatility thesis of this
// dashboard (a >6% share collapsing to 0.75% and clawing back).
export default function TourismGdpTrend({ data }: Props) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const rows = useMemo<Sdg891Row[]>(() => {
    const s = data?.sdg_891 as Sdg891Row[] | undefined
    if (!s) return []
    return [...s].sort((a, b) => a.year - b.year)
  }, [data])

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || rows.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const w = Math.max(width || 320, 320)
    const height = 300
    const margin = { top: 14, right: 18, bottom: 40, left: 54 }
    const innerW = w - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr('width', w).attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear().domain(d3.extent(rows, (d) => d.year) as [number, number]).range([0, innerW])
    const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d.proportion_pct)! * 1.15]).range([innerH, 0])

    const grid = g.append('g').attr('class', 'chart-grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(() => ''))
    grid.selectAll('line').attr('stroke', '#eceef6')

    g.append('g').attr('class', 'chart-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}`))
    g.append('g').attr('class', 'chart-axis').call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`))

    // Area + line
    const area = d3.area<Sdg891Row>()
      .x((d) => x(d.year)).y0(innerH).y1((d) => y(d.proportion_pct)).curve(d3.curveMonotoneX)
    const line = d3.line<Sdg891Row>()
      .x((d) => x(d.year)).y((d) => y(d.proportion_pct)).curve(d3.curveMonotoneX)

    g.append('path').datum(rows).attr('fill', '#1a2b88').attr('fill-opacity', 0.08).attr('d', area)
    g.append('path').datum(rows).attr('fill', 'none').attr('stroke', '#1a2b88').attr('stroke-width', 2.5).attr('d', line)

    // Points
    g.selectAll('.pt').data(rows).join('circle').attr('class', 'pt')
      .attr('cx', (d) => x(d.year)).attr('cy', (d) => y(d.proportion_pct)).attr('r', 3)
      .attr('fill', '#1a2b88').attr('stroke', '#fff').attr('stroke-width', 1.5)

    // Annotate the pandemic trough (lowest proportion)
    const trough = rows.reduce((p, c) => (c.proportion_pct < p.proportion_pct ? c : p))
    g.append('text').attr('x', x(trough.year)).attr('y', y(trough.proportion_pct) + 18)
      .attr('text-anchor', 'middle').attr('font-family', 'Alexandria, sans-serif')
      .attr('font-size', '10px').attr('fill', '#c62828')
      .text(`${trough.proportion_pct}% (${trough.year})`)

    // Hover
    const tooltip = d3.select(tooltipRef.current)
    g.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'transparent')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event)
        const yr = Math.round(x.invert(mx))
        const r = rows.find((d) => d.year === yr)
        if (!r) return
        tooltip.style('display', 'block')
          .style('left', `${x(r.year) + margin.left}px`).style('top', `${y(r.proportion_pct) - 10}px`)
          .html(
            `<div style="font-weight:600;margin-bottom:3px">${r.year}</div>` +
            `<div style="color:#8ea0ff">${r.proportion_pct}% of GDP</div>` +
            `<div style="font-size:10px">Tourism Direct GDP ${fmtRM(r.tdgdp_rm_m)}</div>`,
          )
      })
      .on('mouseleave', () => tooltip.style('display', 'none'))

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 34).attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Tourism Direct GDP as a share of total GDP')
    // Y-axis label
    g.append('text')
      .attr('transform', `translate(-44, ${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('% of GDP')
  }, [rows, width])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c] mb-1">
        SDG 8.9.1: Tourism Direct GDP
      </h3>
      <p className="font-sans text-[11px] text-[#9aa3b5] mb-3">
        The UN's own tourism indicator swung from 6.8% of GDP to 0.75% and back. That volatility, measured officially.
      </p>
      <div className="relative flex-1" ref={boxRef} style={{ minHeight: 200 }}>
        <svg className="w-full" />
        <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        DOSM Tourism Satellite Account · SDG indicator 8.9.1 · 2015–2024.
      </p>
    </div>
  )
}
