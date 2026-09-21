import { useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import { useFilters } from '../../store'
import { sectorName } from '../../constants'
import { useElementWidth } from '../../hooks/useElementWidth'

interface Props {
  data: Record<string, unknown> | null
}

interface SectorData {
  code: string
  name: string
  attributableJobs: number
}

export default function SectorBreakdown({ data }: Props) {
  const { year, sector, setSector } = useFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()

  const chartData = useMemo<SectorData[]>(() => {
    const ind = data?.employment_industry as Array<{
      year: number
      industry_code: string
      employment_attributable_k: number
    }> | undefined
    if (!ind) return []

    const targetYear = year === 'all' ? 2024 : year
    const filtered = ind.filter((i) => i.year === targetYear)

    const grouped = new Map<string, number>()
    filtered.forEach((i) => {
      grouped.set(i.industry_code, (grouped.get(i.industry_code) || 0) + i.employment_attributable_k)
    })

    return Array.from(grouped.entries())
      .map(([code, jobs]) => ({ code, name: sectorName(code), attributableJobs: jobs }))
      .sort((a, b) => b.attributableJobs - a.attributableJobs)
      .slice(0, 8)
  }, [data, year])

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || chartData.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const w = Math.max(width || 320, 320)
    const barHeight = 42
    const gap = 8
    const margin = { top: 10, right: 52, bottom: 10, left: 150 }
    const height = chartData.length * (barHeight + gap) + margin.top + margin.bottom
    const innerW = w - margin.left - margin.right

    svg.attr('width', w).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear()
      .domain([0, d3.max(chartData, (d) => d.attributableJobs) || 1])
      .range([0, innerW])

    const y = d3.scaleBand()
      .domain(chartData.map((d) => d.name))
      .range([0, height - margin.top - margin.bottom])
      .padding(0.25)

    // Bars — click to toggle the global Sector filter
    g.selectAll('.bar')
      .data(chartData)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', (d) => y(d.name) || 0)
      .attr('width', (d) => x(d.attributableJobs))
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', (d) => (sector !== 'all' && d.code !== sector ? '#c3cbd9' : '#1a2b88'))
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
      .attr('font-weight', (d) => (sector !== 'all' && d.code === sector ? 600 : 400))
      .attr('fill', (d) => (sector !== 'all' && d.code !== sector ? '#9aa3b5' : '#1a1a1a'))
      .text((d) => d.name)

    // Value labels
    g.selectAll('.value')
      .data(chartData)
      .join('text')
      .attr('class', 'value')
      .attr('x', (d) => x(d.attributableJobs) + 6)
      .attr('y', (d) => (y(d.name) || 0) + y.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-family', 'Gantari, sans-serif')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', '#1c1c1c')
      .text((d) => `${d.attributableJobs.toFixed(0)}K`)
  }, [chartData, sector, width])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Jobs by Sector
        </h3>
        <span className="font-sans text-[10px] text-[#9aa3b5]">Click a bar to filter</span>
      </div>
      <div className="flex-1 relative" ref={boxRef} style={{ minHeight: 0 }}>
        <svg className="w-full" />
      </div>
    </div>
  )
}