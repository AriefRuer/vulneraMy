// Visualization registry (server side). Shares the SAME chartId set as the
// client's src/vizRegistry.ts so online and offline stay in sync. The server
// validates every incoming chartId against this registry - a browser can never
// supply arbitrary ids or inject data. chartId is the authorization boundary.
export interface VizEntry {
  id: string
  page: string
  title: string
  source: string
  dataset: string
}

export const CHART_CONTEXT: VizEntry[] = [
  { id: 'headcount-vs-attributable', page: 'overview', title: 'Headcount vs Tourism Dependent Jobs', source: 'DOSM TSA Table 7, 2015-2024', dataset: 'national_employment' },
  { id: 'jobs-by-sector', page: 'overview', title: 'Jobs by Sector', source: 'DOSM TSA Table 7 employment by industry, 2024', dataset: 'industry_employment' },
  { id: 'revenue-by-state', page: 'overview', title: 'Revenue by State', source: 'DOSM Domestic Tourism Survey 2024', dataset: 'state_revenue' },
  { id: 'spending-composition', page: 'overview', title: 'Spending Composition', source: 'DOSM TSA internal tourism expenditure', dataset: 'national_employment' },
  { id: 'jobs-change-waterfall', page: 'structural', title: 'Jobs Change Waterfall', source: 'DOSM TSA Table 7 employment by industry', dataset: 'industry_employment' },
  { id: 'jobs-per-rm1m', page: 'structural', title: 'Jobs per RM1M', source: 'LP allocation grain (attributable jobs per RM1M)', dataset: 'allocation' },
  { id: 'pressure-quadrant', page: 'geographic', title: 'Pressure vs Vulnerability', source: 'DOSM state-panel tourism receipts, 2018-2024', dataset: 'state_panel' },
  { id: 'state-vulnerability', page: 'geographic', title: 'State Vulnerability Tier', source: 'DOSM state-panel fragility model', dataset: 'state_panel' },
  { id: 'recovery-ranking', page: 'geographic', title: 'Recovery Ranking', source: 'DOSM state-panel tourism receipts, 2018-2024', dataset: 'state_panel' },
  { id: 'top-market-stats', page: 'markets', title: 'Top Market Statistics', source: 'DOSM monthly international arrivals', dataset: 'arrivals' },
  { id: 'market-concentration-hhi', page: 'markets', title: 'Inbound Market Concentration', source: 'DOSM monthly international arrivals', dataset: 'arrivals' },
  { id: 'od-heatmap', page: 'markets', title: 'Origin to Destination Flows', source: 'DOSM domestic tourism survey inter-state flows', dataset: 'od_flows' },
  { id: 'jobs-budget-curve', page: 'simulation', title: 'Jobs vs Budget Curve', source: 'LP allocation model on DOSM TSA-linked grain', dataset: 'allocation' },
  { id: 'where-money-goes', page: 'simulation', title: 'Where the Money Goes', source: 'LP allocation model per-industry allocation', dataset: 'allocation' },
  { id: 'wage-gap', page: 'decent-work', title: 'Pay Gap by Industry', source: 'DOSM Salaries and Wages Survey 2024', dataset: 'wages_2024' },
  { id: 'pay-ladder', page: 'decent-work', title: 'Pay Ladder of All Sectors', source: 'DOSM Salaries and Wages Survey 2024', dataset: 'wages_2024' },
  { id: 'wage-trend', page: 'decent-work', title: 'Median Wage Trend Line', source: 'DOSM Salaries and Wages Survey, 2010-2024', dataset: 'wages_trend' },
  { id: 'tour-gdp-share', page: 'sdg', title: 'Tourism Direct GDP Share', source: 'DOSM TSA, SDG indicator 8.9.1, 2015-2024', dataset: 'sdg_891' },
  { id: 'sdg-tool-matrix', page: 'sdg', title: 'SDG Measurement Tools', source: 'DOSM / UN SDG indicator 12.b.1', dataset: 'sdg_12b1' },
]

export function getChartContext(id: string): VizEntry | undefined {
  return CHART_CONTEXT.find((c) => c.id === id)
}