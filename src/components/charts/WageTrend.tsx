import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useFilters } from '../../store'
import { useElementWidth } from '../../hooks/useElementWidth'
import { tourismIndustryEn, type DecentWorkRow, type WageTrendRow } from '../../lib/decentWork'

interface Props {
  data: Record<string, unknown> | null
}

const FLAGSHIP = 'Accommodation and food and beverage service activities'

// Distinguishable palette for the tourism-carrying industries (DESIGN_GUIDE
// accent family + step-outs, all on white). The flagship gets the accent;
// each context industry gets its own stepped hue so a trend is traceable.
const PALETTE: Record<string, string> = {
  [FLAGSHIP]: '#1a2b88',
  'Wholesale and retail trade; repair of motor vehicles and motorcycles': '#3b5bdb',
  'Transportation and storage': '#7048e8',
  'Administrative and support service activities': '#12b886',
  'Arts, entertainment and recreation': '#d97706',
  'Other service activities': '#e8590c',
}

// Standardise names for the tooltip/legend (drop DOSM's long "service activities")
const SHORT: Record<string, string> = {
  [FLAGSHIP]: 'Accommodation & F&B',
  'Wholesale and retail trade; repair of motor vehicles and motorcycles': 'Wholesale & retail',
  'Transportation and storage': 'Transport & storage',
  'Administrative and support service activities': 'Admin & support',
  'Arts, entertainment and recreation': 'Arts & entertainment',
  'Other service activities': 'Other services',
}
const short = (s: string) => SHORT[s] ?? s

// Median wage as % of national over 2010–2024 for the industries carrying tourism
// jobs — LIVE from wages_trend. One line per industry, each distinctly coloured.
// Responsive to the global Sector filter: picking a sector highlights its line
// (and dims the rest), so it reacts to the filter bar AND to clicks on other
// visuals (PayGapBars bars, Sector waterfall, etc.).
export default function WageTrend({ data }: Props) {
  const { sector } = useFilters()
  const [boxRef, width] = useElementWidth<HTMLDivElement>()
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Build the series AND a code→industry_en lookup so a selected Sector code
  // maps to the right trend line (ACC/FNB share one line; FUE/RET share one).
  const { series, codeToEn } = useMemo(() => {
    const trend = data?.wages_trend as WageTrendRow[] | undefined
    const dw = data?.decent_work as DecentWorkRow[] | undefined
    if (!trend || !dw) return { series: [] as Array<{ industry_en: string; color: string; pts: WageTrendRow[] }>, codeToEn: {} as Record<string, string> }
    const tourism = tourismIndustryEn(dw)
    const byInd = new Map<string, WageTrendRow[]>()
    trend
      .filter((r) => tourism.has(r.industry_en))
      .forEach((r) => {
        if (!byInd.has(r.industry_en)) byInd.set(r.industry_en, [])
        byInd.get(r.industry_en)!.push(r)
      })
    const series = Array.from(byInd.entries()).map(([industry_en, pts]) => ({
      industry_en,
      color: PALETTE[industry_en] ?? '#8a93a6',
      pts: pts.sort((a, b) => a.year - b.year),
    }))
    const codeToEn: Record<string, string> = {}
    dw.forEach((r) => (codeToEn[r.industry_code] = r.industry_en))
    return { series, codeToEn }
  }, [data])

  // Which line is highlighted by the global Sector filter (null = show all).
  const highlightEn = sector !== 'all' ? codeToEn[sector] ?? null : null

  useEffect(() => {
    const svgEl = boxRef.current?.querySelector('svg')
    if (!svgEl || series.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const w = Math.max(width || 320, 320)
    const height = 300
    const margin = { top: 14, right: 20, bottom: 40, left: 56 }
    const innerW = w - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    svg.attr('width', w).attr('height', height)
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const allPts = series.flatMap((s) => s.pts)
    const x = d3.scaleLinear().domain(d3.extent(allPts, (d) => d.year) as [number, number]).range([0, innerW])
    const y = d3.scaleLinear()
      .domain([(d3.min(allPts, (d) => d.median_vs_national_pct)! - 6), 104])
      .range([innerH, 0])

    const grid = g.append('g').attr('class', 'chart-grid')
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(() => ''))
    grid.selectAll('line').attr('stroke', '#eceef6')

    g.append('g').attr('class', 'chart-axis').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${d}`))
    g.append('g').attr('class', 'chart-axis').call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`))

    // National baseline (100%)
    g.append('line').attr('x1', 0).attr('x2', innerW).attr('y1', y(100)).attr('y2', y(100))
      .attr('stroke', '#c62828').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3')
    g.append('text').attr('x', innerW).attr('y', y(100) - 5).attr('text-anchor', 'end')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '10px').attr('fill', '#c62828')
      .text('National median (100%)')

    const line = d3.line<WageTrendRow>()
      .x((d) => x(d.year)).y((d) => y(d.median_vs_national_pct)).curve(d3.curveMonotoneX)

    // One line per industry. When a Sector is selected, highlight its line and
    // dim the rest; otherwise the flagship stays the boldest.
    const dimming = highlightEn !== null
    series.forEach((s) => {
      const isHighlighted = highlightEn === s.industry_en
      const isFlag = dimming ? false : s.industry_en === FLAGSHIP
      const stroke = isHighlighted ? s.color : dimming ? '#dfe3ee' : s.color
      g.append('path').datum(s.pts).attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', isHighlighted || isFlag ? 2.5 : 1.7)
        .attr('stroke-opacity', dimming && !isHighlighted ? 0.4 : 1)
        .attr('stroke-linecap', 'round')
        .attr('d', line)
      if (isHighlighted) {
        const last = s.pts[s.pts.length - 1]
        g.append('circle').attr('cx', x(last.year)).attr('cy', y(last.median_vs_national_pct))
          .attr('r', 3.5).attr('fill', s.color).attr('stroke', '#fff').attr('stroke-width', 1.5)
      }
    })

    // Y-axis label
    g.append('text')
      .attr('transform', `translate(-44, ${innerH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Alexandria, sans-serif').attr('font-size', '11px').attr('fill', '#4a4a4a')
      .text('Median wage as % of national')

    // Hover: nearest year, list all tourism industries
    const tooltip = d3.select(tooltipRef.current)
    const years = Array.from(new Set(allPts.map((d) => d.year))).sort((a, b) => a - b)
    g.append('rect').attr('width', innerW).attr('height', innerH).attr('fill', 'transparent')
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event)
        const yr = years.reduce((p, c) => (Math.abs(x(c) - mx) < Math.abs(x(p) - mx) ? c : p))
        tooltip.style('display', 'block')
          .style('left', `${x(yr) + margin.left}px`).style('top', `10px`)
          .html(
            `<div style="font-weight:600;margin-bottom:3px">${yr}</div>` +
            series.map((s) => {
              const p = s.pts.find((q) => q.year === yr)
              if (!p) return ''
              const dim = dimming && s.industry_en !== highlightEn
              return `<div style="font-size:10px;color:${dim ? '#8a93a6' : s.color};white-space:nowrap${dim ? ';opacity:.5' : ''}">● ${p.median_vs_national_pct.toFixed(0)}% · ${short(s.industry_en)}</div>`
            }).join(''),
          )
      })
      .on('mouseleave', () => tooltip.style('display', 'none'))
  }, [series, width, highlightEn])

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-sans text-[14px] font-normal text-[#1c1c1c]">
          Median wage trend line (2010-2024)
        </h3>
        {highlightEn ? (
          <span
            className="font-sans text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#e6e9f7', color: '#1a2b88' }}
          >
            {short(highlightEn)}
          </span>
        ) : (
          <span className="font-sans text-[10px] text-[#9aa3b5]">All sectors · pick one to highlight</span>
        )}
      </div>
      <p className="font-sans text-[11px] text-[#9aa3b5] mb-3">
        Median wage as a share of national. No tourism-carrying industry has caught up.
      </p>
      <div className="relative flex-1" ref={boxRef} style={{ minHeight: 220 }}>
        <svg className="w-full" />
        <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
        {series.map((s) => {
          const dim = highlightEn !== null && s.industry_en !== highlightEn
          return (
            <span key={s.industry_en} className="flex items-center gap-1.5"
              style={{ opacity: dim ? 0.4 : 1, fontWeight: highlightEn === s.industry_en ? 700 : 400 }}>
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-sans text-[10px] text-[#4a4a4a]">{short(s.industry_en)}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}