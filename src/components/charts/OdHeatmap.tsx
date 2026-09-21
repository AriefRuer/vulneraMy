import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useFilters } from '../../store'
import { useElementWidth } from '../../hooks/useElementWidth'

interface Props {
  data: Record<string, unknown> | null
}

interface Flow {
  year: number
  origin_state_code: string
  dest_state_code: string
  tourists_k: number
  origin_label: string
  dest_label: string
  is_intra_state: number
}

// Origin→Destination flow heatmap (16×16). Colour = tourist volume. Click a cell
// to set the State filter. Respects the global Year filter.
export default function OdHeatmap({ data }: Props) {
  const { year, state, setState } = useFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)
  // Selection is per-cell (a single origin→destination pair), not per-column.
  const [selectedCell, setSelectedCell] = useState<string | null>(null)

  const flows = useMemo<Flow[]>(() => {
    const od = data?.od_flows as Flow[] | undefined
    if (!od || od.length === 0) return []
    // od_flows only exists for a single survey year (2024). The global Year
    // filter must not blank the heatmap. Clamp to the latest year present in
    // the data so the matrix always renders (fixes the disappearing bug).
    const available = Array.from(new Set(od.map((r) => r.year))).sort((a, b) => b - a)
    const yearToUse = typeof year === 'number' && available.includes(year) ? year : available[0]
    return od.filter((r) => r.year === yearToUse)
  }, [data, year])

  // The highlight holds only while the global State filter still matches the cell's
  // origin — so clearing/changing the filter elsewhere (Reset Filters, another chart)
  // drops it. Derived during render, so no state-syncing effect is needed.
  const activeCell = selectedCell && selectedCell.split('__')[0] === state ? selectedCell : null

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || flows.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    // States from origin labels (16). Use a stable order.
    const origins = Array.from(new Set(flows.map((f) => f.origin_state_code))).sort()
    const dests = Array.from(new Set(flows.map((f) => f.dest_state_code))).sort()

    const w = Math.max(width || 900, 320)
    const leftM = 96 // room for full origin state names
    const topM = 64 // room for rotated destination names
    // Cell width fills the row edge-to-edge (30px floor → narrow viewports scroll);
    // cell height is capped shorter so the full-width grid doesn't get too tall.
    const cellW = Math.max((w - leftM) / origins.length, 30)
    const cellH = Math.min(cellW, 26)
    const gridW = leftM + cellW * origins.length
    const height = topM + cellH * dests.length + 12

    svg.attr('width', gridW).attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${leftM},${topM})`)

    const maxVal = d3.max(flows, (f) => f.tourists_k) || 1
    const color = d3.scaleLinear<string>()
      .domain([0, maxVal * 0.3, maxVal])
      .range(['#eceef6', '#8ea0c8', '#1a2b88'])

    const xIdx = new Map(origins.map((s, i) => [s, i]))
    const yIdx = new Map(dests.map((s, i) => [s, i]))

    // Cells
    flows.forEach((f) => {
      const xi = xIdx.get(f.origin_state_code)
      const yi = yIdx.get(f.dest_state_code)
      if (xi === undefined || yi === undefined) return
      const cellKey = `${f.origin_state_code}__${f.dest_state_code}`
      const isSelected = activeCell === cellKey
      g.append('rect')
        .attr('x', xi * cellW + 1)
        .attr('y', yi * cellH + 1)
        .attr('width', cellW - 2)
        .attr('height', cellH - 2)
        .attr('rx', 1)
        .attr('fill', color(f.tourists_k))
        .attr('stroke', isSelected ? '#1a2b88' : 'none')
        .attr('stroke-width', isSelected ? 2 : 0)
        .attr('cursor', 'pointer')
        .on('click', () => {
          const next = isSelected ? null : cellKey
          setSelectedCell(next)
          // Keep cross-filtering: a selected cell filters the dashboard by its origin.
          setState(next ? f.origin_state_code : 'all')
        })
        .on('mousemove', (event: MouseEvent) => {
          d3.select(tooltipRef.current)
            .style('display', 'block')
            .style('left', `${event.offsetX + 10}px`)
            .style('top', `${event.offsetY + 10}px`)
            .html(`<div style="font-weight:600">${f.origin_label} → ${f.dest_label}</div><div style="color:#8ea0ff">${f.tourists_k.toFixed(0)}K tourists</div>`)
        })
        .on('mouseleave', () => d3.select(tooltipRef.current).style('display', 'none'))
    })

    // Row labels (origins)
    origins.forEach((s) => {
      const label = new Map(flows.map((f) => [f.origin_state_code, f.origin_label])).get(s) || s
      g.append('text').attr('x', -10).attr('y', (xIdx.get(s)! + 0.5) * cellH)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '10px').attr('fill', '#4a4a4a')
        .text(label)
    })

    // Column labels (dests — rotated)
    dests.forEach((s) => {
      const label = new Map(flows.map((f) => [f.dest_state_code, f.dest_label])).get(s) || s
      g.append('text').attr('x', (yIdx.get(s)! + 0.5) * cellW).attr('y', -8)
        .attr('text-anchor', 'start').attr('transform', `rotate(-45,${(yIdx.get(s)! + 0.5) * cellW},-8)`)
        .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '10px').attr('fill', '#4a4a4a')
        .text(label)
    })

    // Axis captions — reinforce which way the matrix reads
    g.append('text').attr('x', -10).attr('y', -topM + 20)
      .attr('text-anchor', 'end')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '9px').attr('fill', '#9aa3b5')
      .text('Origin ↓')

  }, [flows, state, width, activeCell])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Tourist Flow Heatmap (Origin → Destination)
        </h3>
        <span className="font-sans text-[10px] text-[#9aa3b5]">Click a cell to filter</span>
      </div>
      <div className="relative flex-1 overflow-auto" ref={boxRef} style={{ minHeight: 0 }}>
        <div className="relative inline-block min-w-full">
          <svg className="block" />
          <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  )
}