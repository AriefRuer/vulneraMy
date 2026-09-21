import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useFilters } from '../../store'
import { useElementWidth } from '../../hooks/useElementWidth'

interface Props {
  data: Record<string, unknown> | null
}

interface DataPoint {
  year: number
  headcount: number
  attributable: number
}

export default function HeadcountVsAttributable({ data }: Props) {
  const { year, sector, setYear } = useFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const chartData = useMemo<DataPoint[]>(() => {
    // If a sector is selected, use that sector's trend (employment_industry).
    // Otherwise fall back to the national aggregate (employment_national).
    if (sector !== 'all') {
      const ind = data?.employment_industry as Array<{
        year: number
        industry_code: string
        employment_k: number
        employment_attributable_k: number
      }> | undefined
      const rows = (ind || []).filter((i) => i.industry_code === sector)
      return rows
        .map((e) => ({
          year: e.year,
          headcount: e.employment_k,
          attributable: e.employment_attributable_k,
        }))
        .sort((a, b) => a.year - b.year)
    }
    const emp = data?.employment_national as Array<{
      year: number
      employment_k: number
      employment_attributable_k: number
    }> | undefined
    if (!emp) return []
    return emp
      .map((e) => ({
        year: e.year,
        headcount: e.employment_k,
        attributable: e.employment_attributable_k,
      }))
      .sort((a, b) => a.year - b.year)
  }, [data, sector])

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || chartData.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const container = (boxRef.current as HTMLElement)?.parentElement
    const w = Math.max(width || container?.clientWidth || 700, 320)
    const height = 320
    const margin = { top: 20, right: 30, bottom: 44, left: 62 }
    const innerW = w - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr('width', w).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const x = d3.scaleLinear()
      .domain(d3.extent(chartData, (d) => d.year) as [number, number])
      .range([0, innerW])

    const yMax = d3.max(chartData, (d) => Math.max(d.headcount, d.attributable)) || 4000
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([innerH, 0])

    // Grid lines
    g.append('g')
      .attr('class', 'chart-grid')
      .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(() => ''))

    // Axes
    g.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(chartData.length).tickFormat(d3.format('d')))

    g.append('g')
      .attr('class', 'chart-axis')
      .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}K`))

    // Lines
    const headcountLine = d3.line<DataPoint>()
      .x((d) => x(d.year))
      .y((d) => y(d.headcount))
      .curve(d3.curveMonotoneX)

    const attributableLine = d3.line<DataPoint>()
      .x((d) => x(d.year))
      .y((d) => y(d.attributable))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#7b7b7b')
      .attr('stroke-width', 2)
      .attr('d', headcountLine)

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#1a2b88')
      .attr('stroke-width', 2)
      .attr('d', attributableLine)

    // Visible data points — kept SMALL (no size increase). Click handling lives
    // on invisible wider hit-targets below, so the dots stay small but are easy
    // to click on BOTH lines.
    // Headcount visible dots
    g.selectAll('.dot')
      .data(chartData)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(d.year))
      .attr('cy', (d) => y(d.headcount))
      .attr('r', 3.5)
      .attr('fill', '#fff')
      .attr('stroke', '#7b7b7b')
      .attr('stroke-width', 2)
      .attr('pointer-events', 'none')

    // Attributable visible dots
    g.selectAll('.dot-a')
      .data(chartData)
      .join('circle')
      .attr('class', 'dot-a')
      .attr('cx', (d) => x(d.year))
      .attr('cy', (d) => y(d.attributable))
      .attr('r', 3.5)
      .attr('fill', '#1a2b88')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('pointer-events', 'none')

    // Invisible hit-targets — one per point per line, large enough to click but
    // visually invisible. Both lines are clickable and readable.
    const tooltip = d3.select(tooltipRef.current)
    const showTooltip = (d: DataPoint) => {
      tooltip
        .style('display', 'block')
        .style('left', `${x(d.year) + margin.left}px`)
        .style('top', `${Math.min(y(d.headcount), y(d.attributable)) + margin.top - 10}px`)
        .html(
          `<div style="font-weight:600;margin-bottom:4px">${d.year}</div>` +
          `<div style="color:#fff">Headcount: ${d.headcount.toFixed(0)}K</div>` +
          `<div style="color:#8ea0ff">Attributable: ${d.attributable.toFixed(0)}K</div>` +
          `<div style="color:#bbb;font-size:10px;margin-top:3px">Click to filter year</div>`
        )
    }

    const hitClicks = (d: DataPoint) => setYear(year === d.year ? 'all' : d.year)

    g.selectAll('.hit')
      .data(chartData)
      .join('circle')
      .attr('class', 'hit')
      .attr('cx', (d) => x(d.year))
      .attr('cy', (d) => y(d.headcount))
      .attr('r', 11)
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer')
      .on('click', (_e, d) => hitClicks(d))
      .on('mousemove', (_e, d) => showTooltip(d))

    g.selectAll('.hit-a')
      .data(chartData)
      .join('circle')
      .attr('class', 'hit-a')
      .attr('cx', (d) => x(d.year))
      .attr('cy', (d) => y(d.attributable))
      .attr('r', 11)
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer')
      .on('click', (_e, d) => hitClicks(d))
      .on('mousemove', (_e, d) => showTooltip(d))

    // Highlight selected year
    if (year !== 'all') {
      g.append('line')
        .attr('x1', x(year))
        .attr('x2', x(year))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#1a2b88')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.5)
    }

    // Axis captions
    g.append('text').attr('x', innerW / 2).attr('y', innerH + 32).attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Year')
    g.append('text')
      .attr('transform', `translate(-52, ${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle').attr('font-family', 'Alexandria, sans-serif')
      .attr('font-size', '11px').attr('fill', '#4a4a4a').text('Employment (thousands)')

    // Tooltip — bound to the SVG element, NOT a transparent overlay rect, so
    // nothing sits above the points and blocks clicks. Hover anywhere on the
    // plot shows the nearest year's values.
    svg
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event)
        const yearVal = x.invert(mx)
        const closest = chartData.reduce((prev, curr) =>
          Math.abs(curr.year - yearVal) < Math.abs(prev.year - yearVal) ? curr : prev
        )
        showTooltip(closest)
      })
      .on('mouseleave', () => tooltip.style('display', 'none'))
  }, [chartData, year, sector, width])

  return (
    <div className="relative flex flex-col flex-1" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Headcount vs Tourism Dependent Jobs
        </h3>
        <span className="font-sans text-[10px] text-[#9aa3b5]">Click a point to filter year</span>
      </div>
      <div className="relative flex-1" ref={boxRef} style={{ minHeight: 240 }}>
        <svg className="w-full" />
        <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
      </div>
    </div>
  )
}