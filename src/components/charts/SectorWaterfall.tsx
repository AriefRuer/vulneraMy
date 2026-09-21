import { useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import { useFilters, usePageFilters } from '../../store'
import { sectorName } from '../../constants'
import { useElementWidth } from '../../hooks/useElementWidth'

interface Props {
  data: Record<string, unknown> | null
}

interface SectorDelta {
  code: string
  name: string
  start: number
  end: number
  deltaPct: number
}

interface Row {
  year: number
  industry_code: string
  employment_attributable_k: number
}

// Available years for the comparison (2015-2024 per employment_industry grain).
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
const CODES = ['ACC', 'CSR', 'FNB', 'FUE', 'RET', 'SVC', 'TAG', 'TRN']

export default function SectorWaterfall({ data }: Props) {
  const { sector, setSector } = useFilters()
  const { wfStart, wfEnd, setWfStart, setWfEnd } = usePageFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()

  const chartData = useMemo<SectorDelta[]>(() => {
    const ind = data?.employment_industry as Row[] | undefined
    if (!ind) return []
    const get = (code: string, yr: number) =>
      ind.find((r) => r.industry_code === code && r.year === yr)
    return CODES
      .map((code) => {
        const a = get(code, wfStart)
        const b = get(code, wfEnd)
        if (!a || !b) return null
        return {
          code,
          name: sectorName(code),
          start: a.employment_attributable_k,
          end: b.employment_attributable_k,
          deltaPct: a.employment_attributable_k !== 0
            ? ((b.employment_attributable_k - a.employment_attributable_k) / a.employment_attributable_k) * 100
            : 0,
        }
      })
      .filter((r): r is SectorDelta => r !== null)
      .filter((r) => r.start > 0 || r.end > 0)
      .sort((a, b) => b.deltaPct - a.deltaPct)
  }, [data, wfStart, wfEnd])

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || chartData.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const w = Math.max(width || 320, 320)
    const barHeight = 42
    const gap = 8
    const margin = { top: 20, right: 60, bottom: 10, left: 150 }
    const height = chartData.length * (barHeight + gap) + margin.top + margin.bottom
    const innerW = w - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr('width', w).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Symmetric scale around 0 so growth/decline read fairly
    const maxAbs = d3.max(chartData, (d) => Math.abs(d.deltaPct)) || 1
    const x = d3.scaleLinear()
      .domain([-maxAbs * 1.15, maxAbs * 1.15])
      .range([0, innerW])
    const zero = x(0)

    const y = d3.scaleBand()
      .domain(chartData.map((d) => d.name))
      .range([0, innerH])
      .padding(0.25)

    // Zero axis
    g.append('line')
      .attr('x1', zero)
      .attr('x2', zero)
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', '#9aa3b5')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')

    // Diverging bars
    g.selectAll('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => (d.deltaPct >= 0 ? zero : x(d.deltaPct)))
      .attr('y', (d) => y(d.name) || 0)
      .attr('width', (d) => Math.abs(x(d.deltaPct) - zero))
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', (d) => {
        if (sector !== 'all' && d.code !== sector) return '#c9d0de'
        return d.deltaPct >= 0 ? '#1a2b88' : '#c62828'
      })
      .attr('cursor', 'pointer')
      .on('click', (_e, d) => setSector(sector === d.code ? 'all' : d.code))

    // Labels (full sector names)
    g.selectAll('.label')
      .data(chartData)
      .join('text')
      .attr('class', 'label')
      .attr('x', -8)
      .attr('y', (d) => (y(d.name) || 0) + y.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'Alexandria, sans-serif')
      .attr('font-size', '12px')
      .attr('fill', '#1a1a1a')
      .text((d) => d.name)

    // Percent labels
    g.selectAll('.value')
      .data(chartData)
      .join('text')
      .attr('class', 'value')
      .attr('x', (d) => (d.deltaPct >= 0 ? x(d.deltaPct) + 6 : x(d.deltaPct) - 6))
      .attr('y', (d) => (y(d.name) || 0) + y.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', (d) => (d.deltaPct >= 0 ? 'start' : 'end'))
      .attr('font-family', 'Gantari, sans-serif')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', (d) => (d.deltaPct >= 0 ? '#1a2b88' : '#c62828'))
      .text((d) => `${d.deltaPct >= 0 ? '+' : ''}${d.deltaPct.toFixed(1)}%`)
  }, [chartData, sector, width])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Tourist-Dependent Jobs Change, {wfStart} → {wfEnd}
        </h3>
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-sans text-[10px] text-[#9aa3b5]">Start</span>
          <select
            value={wfStart}
            onChange={(e) => setWfStart(Number(e.target.value))}
            className="font-sans text-[12px] text-[#1a1a1a] bg-white border border-[#eceef6] rounded-md px-2 py-1 focus:outline-none"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} disabled={y >= wfEnd}>{y}</option>
            ))}
          </select>
          <span className="font-sans text-[10px] text-[#9aa3b5]">End</span>
          <select
            value={wfEnd}
            onChange={(e) => setWfEnd(Number(e.target.value))}
            className="font-sans text-[12px] text-[#1a1a1a] bg-white border border-[#eceef6] rounded-md px-2 py-1 focus:outline-none"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} disabled={y <= wfStart}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 relative" ref={boxRef} style={{ minHeight: 0 }}>
        <svg className="w-full" />
      </div>
      <p className="font-sans text-[10px] text-[#9aa3b5] mt-2 leading-snug">
        Measuring by tourist-dependence flips the winners and losers. Click a bar
        to filter that sector across the dashboard. <span style={{ color: '#c62828' }}>Red</span> = decline, <span style={{ color: '#1a2b88' }}>blue</span> = growth.
      </p>
    </div>
  )
}