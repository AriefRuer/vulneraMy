import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useFilters, usePageFilters } from '../../store'
import { useElementWidth } from '../../hooks/useElementWidth'

interface Props {
  data: Record<string, unknown> | null
}

interface StateRow {
  state_code: string
  state_label: string
  visitors_per_resident: number
  vulnerability_index: number
  vulnerability_tier: string
}

// Pressure (visitors/resident) × vulnerability quadrant — the geographic finding.
// Responds to the State filter (dim non-selected) and the page-local Tier filter
// (highlight matching tier). Intensity reference lines at EU avg (6.2) + Croatia (23.3).
export default function PressureQuadrant({ data }: Props) {
  const { state, setState } = useFilters()
  const { tier, setTier } = usePageFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  const rows = useMemo<StateRow[]>(() => {
    const s = data?.state_2024 as StateRow[] | undefined
    if (!s) return []
    return s.filter((r) => typeof r.visitors_per_resident === 'number' && typeof r.vulnerability_index === 'number')
  }, [data])

  const tierColor = (t: string) =>
    t?.toLowerCase().includes('higher') ? '#c62828' : t?.toLowerCase().includes('moderate') ? '#d97706' : '#1e8e3e'

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || rows.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const w = Math.max(width || 320, 320)
    const height = 380
    const margin = { top: 36, right: 60, bottom: 46, left: 56 }
    const innerW = w - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr('width', w).attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Midpoints for the 2x2 grid
    const medIntensity = d3.median(rows, (d) => d.visitors_per_resident) || 1
    const medVuln = d3.median(rows, (d) => d.vulnerability_index) || 50

    const xMax = d3.max(rows, (d) => d.visitors_per_resident) || 25
    const y = d3.scaleLinear()
      .domain([d3.min(rows, (d) => d.vulnerability_index)! - 5, d3.max(rows, (d) => d.vulnerability_index)! + 5])
      .range([innerH, 0])
      .nice()
    const x = d3.scaleLinear()
      .domain([0, Math.ceil(xMax * 1.1)])
      .range([0, innerW])

    // Quadrant divider lines
    g.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', y(medVuln)).attr('y2', y(medVuln))
      .attr('stroke', '#e0e4ee').attr('stroke-dasharray', '3,3')
    g.append('line').attr('x1', x(medIntensity)).attr('x2', x(medIntensity)).attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#e0e4ee').attr('stroke-dasharray', '3,3')

    // Quadrant labels — one per corner so each axis's meaning is unambiguous.
    // High pressure = right, high vulnerability = top.
    const qLabel = (qx: number, qy: number, anchor: string, t: string) =>
      g.append('text').attr('x', qx).attr('y', qy).attr('text-anchor', anchor)
        .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '9px')
        .attr('font-weight', 600).attr('fill', '#b3bacb').text(t)
    qLabel(4, 12, 'start', 'Fragile but uncrowded')            // top-left
    qLabel(innerW - 4, 12, 'end', 'Strained')                  // top-right
    qLabel(4, innerH - 6, 'start', 'Low exposure')             // bottom-left
    qLabel(innerW - 4, innerH - 6, 'end', 'Busy but resilient') // bottom-right

    // Reference lines (EU 6.2, Croatia 23.3)
    const ref = (v: number, label: string) => {
      if (v < xMax * 1.1) {
        g.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', 0).attr('y2', innerH)
          .attr('stroke', '#c3cbd9').attr('stroke-dasharray', '2,4')
        g.append('text').attr('x', x(v) + 3).attr('y', -6).attr('font-family', 'Alexandria, sans-serif')
          .attr('font-size', '9px').attr('fill', '#7b7b7b').text(label)
      }
    }
    ref(6.2, 'EU 6.2')
    ref(23.3, 'Croatia 23.3')

    // Axes
    g.append('g').attr('class', 'chart-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}`))
    g.append('g').attr('class', 'chart-axis').call(d3.axisLeft(y).ticks(6))

    // Points — bigger radius for user-friendliness
    g.selectAll('.pt')
      .data(rows)
      .join('circle')
      .attr('class', 'pt')
      .attr('cx', (d) => x(d.visitors_per_resident))
      .attr('cy', (d) => y(d.vulnerability_index))
      .attr('r', 8.5)
      .attr('fill', (d) => {
        if (tier !== 'all' && d.vulnerability_tier !== tier) return '#eef1f6'
        if (state !== 'all' && d.state_code !== state) return '#dfe3ee'
        return tierColor(d.vulnerability_tier)
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', (_e, d) => setState(state === d.state_code ? 'all' : d.state_code))
      .on('mousemove', (event: MouseEvent, d) => {
        const tip = d3.select(tooltipRef.current)
        tip.style('display', 'block')
          .style('left', `${event.offsetX + 14}px`)
          .style('top', `${event.offsetY + 14}px`)
          .html(`<div style="font-weight:600">${d.state_label}</div><div>Pressure: ${d.visitors_per_resident.toFixed(1)} visits/resident</div><div style="color:#8ea0ff">Vulnerability: ${d.vulnerability_index.toFixed(1)}</div>`)
      })
      .on('mouseleave', () => d3.select(tooltipRef.current).style('display', 'none'))

    // Labels — full state names, larger font
    g.selectAll('.lbl')
      .data(rows)
      .join('text')
      .attr('class', 'lbl')
      .attr('x', (d) => x(d.visitors_per_resident) + 12)
      .attr('y', (d) => y(d.vulnerability_index) + 4)
      .attr('font-family', 'Alexandria, sans-serif')
      .attr('font-size', '11px')
      .attr('font-weight', 500)
      .attr('fill', (d) => (state !== 'all' && d.state_code === state) || (tier !== 'all' && d.vulnerability_tier === tier) ? '#1a1a1a' : '#7b7b7b')
      .text((d) => d.state_label)

    // Axis labels
    g.append('text').attr('x', innerW / 2).attr('y', innerH + 34)
      .attr('text-anchor', 'middle').attr('font-family', 'Alexandria, sans-serif')
      .attr('font-size', '11px').attr('fill', '#4a4a4a').text('Visitor pressure (visitors per resident)')
    g.append('text')
      .attr('transform', `translate(-42, ${innerH / 2}) rotate(-90)`).attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Vulnerability index')
  }, [rows, state, tier, width])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
            Which states are both busy and fragile?
          </h3>
          <p className="font-sans text-[11px] text-[#9aa3b5] mt-0.5">
            X = visitor pressure (visits per resident) · Y = vulnerability index
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-sans text-[10px] text-[#9aa3b5]">Tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="font-sans text-[12px] text-[#1a1a1a] bg-white border border-[#eceef6] rounded-md px-2 py-1 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="Higher exposure">Higher</option>
            <option value="Moderate exposure">Moderate</option>
            <option value="Lower exposure">Lower</option>
          </select>
        </div>
      </div>
      <div className="flex-1 relative" ref={boxRef} style={{ minHeight: 0 }}>
        <svg className="w-full" />
        <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2">
        Crowding &ne; fragility. Top-right is "strained": high load on a fragile
        economy. <span className="text-[#9aa3b5]/70">2024 snapshot (not year-filterable).</span>
      </p>
    </div>
  )
}