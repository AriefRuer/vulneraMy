import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useElementWidth } from '../../hooks/useElementWidth'

interface Props {
  data: Record<string, unknown> | null
}

interface MonthRow {
  month_start: string
  hhi_country: number
  top_country_share_pct: number
}

// HHI (market concentration) over time — LIVE from grain. Shows how concentrated
// inbound tourism is on Singapore. Reference: >2500 = high concentration.
export default function HhiLine({ data }: Props) {
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const series = useMemo<MonthRow[]>(() => {
    const arr = data?.arrivals_national as MonthRow[] | undefined
    if (!arr) return []
    return arr
      .filter((r) => typeof r.hhi_country === 'number' && typeof r.month_start === 'string')
      // aggregate monthly -> keep every month (58 rows); plot full history
      .sort((a, b) => a.month_start.localeCompare(b.month_start))
  }, [data])

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || series.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const w = Math.max(width || 320, 320)
    const height = 320
    const margin = { top: 16, right: 16, bottom: 46, left: 54 }
    const innerW = w - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr('width', w).attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleTime()
      .domain(d3.extent(series, (d) => new Date(d.month_start)) as [Date, Date])
      .range([0, innerW])
    const y = d3.scaleLinear()
      .domain([0, d3.max(series, (d) => d.hhi_country)! * 1.1])
      .range([innerH, 0])

    const grid = g.append('g').attr('class', 'chart-grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(() => ''))
    grid.selectAll('line').attr('stroke', '#eceef6')

    g.append('g').attr('class', 'chart-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => (d as Date).getFullYear().toString()))
    g.append('g').attr('class', 'chart-axis').call(d3.axisLeft(y).ticks(5))

    // High-concentration threshold line >2500
    g.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', y(2500)).attr('y2', y(2500))
      .attr('stroke', '#c62828').attr('stroke-dasharray', '4,4').attr('stroke-width', 1)
    g.append('text').attr('x', innerW).attr('y', y(2500) - 5).attr('text-anchor', 'end')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '10px').attr('fill', '#c62828')
      .text('High concentration (>2500)')

    const line = d3.line<MonthRow>()
      .x((d) => x(new Date(d.month_start)))
      .y((d) => y(d.hhi_country))
      .curve(d3.curveMonotoneX)

    g.append('path').datum(series).attr('fill', 'none').attr('stroke', '#1a2b88').attr('stroke-width', 2).attr('d', line)

    // Simple tooltip
    const tooltip = d3.select(tooltipRef.current)
    const overlay = g.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'transparent')
    overlay.on('mousemove', (event: MouseEvent) => {
      const [mx] = d3.pointer(event)
      const t = x.invert(mx)
      const nearest = series.reduce((p, c) =>
        Math.abs(+new Date(c.month_start) - +t) < Math.abs(+new Date(p.month_start) - +t) ? c : p)
      const d = new Date(nearest.month_start)
      tooltip.style('display', 'block')
        .style('left', `${x(new Date(nearest.month_start)) + margin.left}px`)
        .style('top', `${y(nearest.hhi_country) - 10}px`)
        .html(`<div style="font-weight:600;margin-bottom:4px">${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}</div><div style="color:#8ea0ff">HHI: ${nearest.hhi_country.toFixed(0)}</div>`)
    })
    overlay.on('mouseleave', () => tooltip.style('display', 'none'))

    g.append('text').attr('x', innerW / 2).attr('y', innerH + 34).attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Inbound market concentration (HHI) over time')
    // Y-axis label
    g.append('text')
      .attr('transform', `translate(-44, ${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('HHI index')
  }, [series, width])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c] mb-3">
        Market Concentration (HHI)
      </h3>
      <div className="relative flex-1" ref={boxRef} style={{ minHeight: 220 }}>
        <svg className="w-full" />
        <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        Consistently &gt;2500 means Malaysia's inbound tourism is dangerously concentrated.
      </p>
    </div>
  )
}