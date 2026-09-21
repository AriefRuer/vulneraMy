import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useFilters } from '../../store'
import { sectorName } from '../../constants'
import { useElementWidth } from '../../hooks/useElementWidth'
import type { DecentWorkRow } from '../../lib/decentWork'

interface Props {
  data: Record<string, unknown> | null
}

// Median pay of each industry that carries tourism jobs, against the national
// median. Bars are the industry median; the dashed line is the national median.
// Click a bar to set the global Sector filter. STATIC (2024 wage snapshot).
export default function PayGapBars({ data }: Props) {
  const { sector, setSector } = useFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const rows = useMemo<DecentWorkRow[]>(() => {
    const dw = data?.decent_work as DecentWorkRow[] | undefined
    if (!dw) return []
    return [...dw].sort((a, b) => a.median_salary_rm - b.median_salary_rm)
  }, [data])

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || rows.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const national = rows[0].national_median_rm
    const w = Math.max(width || 320, 320)
    const rowH = 30
    const margin = { top: 10, right: 64, bottom: 34, left: 128 }
    const innerW = w - margin.left - margin.right
    const innerH = rows.length * rowH
    const height = innerH + margin.top + margin.bottom

    svg.attr('width', w).attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear()
      .domain([0, Math.max(national, d3.max(rows, (r) => r.median_salary_rm)!) * 1.12])
      .range([0, innerW])
    const y = d3.scaleBand<string>()
      .domain(rows.map((r) => r.industry_code))
      .range([0, innerH])
      .padding(0.28)

    // Row labels + bars
    rows.forEach((r) => {
      const yy = y(r.industry_code)!
      const dimmed = sector !== 'all' && r.industry_code !== sector
      const selected = sector === r.industry_code

      g.append('text').attr('x', -10).attr('y', yy + y.bandwidth() / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px')
        .attr('fill', dimmed ? '#b3bacb' : '#1c1c1c').text(sectorName(r.industry_code))

      g.append('rect')
        .attr('x', 0).attr('y', yy)
        .attr('width', Math.max(0, x(r.median_salary_rm)))
        .attr('height', y.bandwidth()).attr('rx', 3)
        .attr('fill', dimmed ? '#dfe3ee' : selected ? '#1a2b88' : '#8ea0c8')
        .attr('cursor', 'pointer')
        .on('click', () => setSector(selected ? 'all' : r.industry_code))
        .on('mousemove', (event: MouseEvent) => {
          d3.select(tooltipRef.current).style('display', 'block')
            .style('left', `${event.offsetX + 12}px`).style('top', `${event.offsetY + 12}px`)
            .html(
              `<div style="font-weight:600">${sectorName(r.industry_code)}</div>` +
              `<div>Median RM${r.median_salary_rm.toLocaleString()} · ${r.median_vs_national_pct.toFixed(0)}% of national</div>` +
              `<div style="color:#8ea0ff;margin-top:2px">Confidence: ${r.confidence}</div>` +
              // white-space normal so a long note wraps; box auto-grows to fit
              `<div style="max-width:240px;white-space:normal;color:#c3cbd9;font-size:10px;margin-top:3px;line-height:1.4">${r.note}</div>`,
            )
        })
        .on('mouseleave', () => d3.select(tooltipRef.current).style('display', 'none'))

      // Value label
      g.append('text').attr('x', x(r.median_salary_rm) + 6).attr('y', yy + y.bandwidth() / 2)
        .attr('dominant-baseline', 'middle')
        .attr('font-family', "'Gantari', sans-serif").attr('font-size', '11px').attr('font-weight', 700)
        .attr('fill', dimmed ? '#b3bacb' : '#1a2b88')
        .text(`${r.median_vs_national_pct.toFixed(0)}%`)
    })

    // National median reference line
    g.append('line').attr('x1', x(national)).attr('x2', x(national)).attr('y1', -4).attr('y2', innerH + 4)
      .attr('stroke', '#c62828').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3')
    g.append('text').attr('x', x(national)).attr('y', innerH + 22).attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '10px').attr('fill', '#c62828')
      .text(`National median RM${national.toLocaleString()}`)

    // X axis (RM) — few, no-decimal ticks to avoid crowding on a narrow row
    g.append('g').attr('class', 'chart-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat((d) => `RM${((d as number) / 1000).toFixed(0)}k`))
    // X-axis caption
    g.append('text').attr('x', innerW / 2).attr('y', innerH + 26).attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Median monthly wage (RM)')
  }, [rows, sector, width])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Median wages for industries leading tourism
        </h3>
        <span className="font-sans text-[10px] text-[#9aa3b5]">Click a bar to filter</span>
      </div>
      <p className="font-sans text-[11px] text-[#9aa3b5] mb-3">
        Every industry that carries tourism jobs sits below the national median wage.
      </p>
      <div className="relative flex-1" ref={boxRef} style={{ minHeight: 0 }}>
        <svg className="w-full" />
        <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        Whole-industry (MSIC) medians.
        <span className="text-[#9aa3b5]/70"> Citizens, formal employees · 2024 snapshot.</span>
      </p>
    </div>
  )
}
