// Visualization registry - a flat map of every chart the assistant can talk
// about. Copied to the client build so the OFFLINE answerer knows the chart's
// title, source, description and which data tables feed it. The server version
// (api/lib/chartContext.ts) uses the SAME chartId set so online and offline stay
// in sync. chartId is validated on the server against this registry; a browser
// can never supply arbitrary ids or inject data.

export interface VizEntry {
  id: string
  page: string
  title: string
  source: string
  description: string
  dataset: string // canonical analyser key the offline/server answerer uses
}

// `dataset` is the analytic grain the answerer runs against. Each one is a
// top-level key in public/dashboard_data.json (plus fixed derived tables).
export const VIZ_REGISTRY: VizEntry[] = [
  // ── Overview ────────────────────────────────────────────────────────────
  {
    id: 'headcount-vs-attributable',
    page: 'overview',
    title: 'Headcount vs Tourism Dependent Jobs',
    source: 'DOSM Tourism Satellite Account (TSA), Table 7 - employment, 2015-2024',
    description:
      'Two lines over 2015-2024: total headcount employment in tourism industries and the tourism-attributable portion. The gap is the dependency story.',
    dataset: 'national_employment',
  },
  {
    id: 'jobs-by-sector',
    page: 'overview',
    title: 'Jobs by Sector',
    source: 'DOSM TSA Table 7 employment by industry, 2024 attributable jobs',
    description:
      'Horizontal bars ranking the eight tourism industry groups by attributable jobs.',
    dataset: 'industry_employment',
  },
  {
    id: 'revenue-by-state',
    page: 'overview',
    title: 'Tourism Revenue by State',
    source: 'DOSM Domestic Tourism Survey 2024, receipts by state',
    description:
      'Ranked bars of tourism revenue (RM) by state, 2024.',
    dataset: 'state_revenue',
  },
  {
    id: 'spending-composition',
    page: 'overview',
    title: 'Spending Composition',
    source: 'DOSM TSA Tables 1-2, inbound vs domestic expenditure',
    description:
      'Donut of international versus domestic tourism expenditure.',
    dataset: 'national_employment',
  },

  // ── Structural ──────────────────────────────────────────────────────────
  {
    id: 'jobs-change-waterfall',
    page: 'structural',
    title: 'Tourist-Dependent Jobs Change',
    source: 'DOSM TSA Table 7 employment by industry, attributable jobs',
    description:
      'Diverging waterfall of percent change in attributable jobs per industry across a selectable year range.',
    dataset: 'industry_employment',
  },
  {
    id: 'jobs-per-rm1m',
    page: 'structural',
    title: 'Jobs per RM1M of Spending',
    source: 'DOSM TSA-linked allocation grain (attributable jobs per RM1M), 2024',
    description:
      'Ranked bars of how many attributable jobs each RM1M of tourism spending creates, per industry.',
    dataset: 'allocation',
  },

  // ── Geographic ──────────────────────────────────────────────────────────
  {
    id: 'pressure-quadrant',
    page: 'geographic',
    title: 'State Pressure and Fragility',
    source: 'DOSM DTS 2024 (visitor pressure) and composite vulnerability index',
    description:
      'Scatter quadrant of visitor pressure (visits per resident) versus vulnerability index; top-right is strained.',
    dataset: 'state_revenue',
  },
  {
    id: 'state-vulnerability',
    page: 'geographic',
    title: 'State Vulnerability Ranking',
    source: 'Composite vulnerability index over 2018-2024 (DOSM-derived)',
    description:
      'Tiered ranking of states by vulnerability index.',
    dataset: 'state_revenue',
  },
  {
    id: 'recovery-ranking',
    page: 'geographic',
    title: 'Tourism Recovery by State',
    source: 'DOSM state-panel receipts, 2018-2024',
    description:
      'Ranked % recovery of receipts relative to a selectable base year.',
    dataset: 'state_panel',
  },

  // ── Market ──────────────────────────────────────────────────────────────
  {
    id: 'top-market-stats',
    page: 'markets',
    title: 'Top Market, HHI and Active Markets',
    source: 'DOSM monthly international arrivals, 2020-2024',
    description:
      'Live stats: largest source market, market-concentration HHI, and number of active source markets.',
    dataset: 'arrivals',
  },
  {
    id: 'market-concentration-hhi',
    page: 'markets',
    title: 'Market Concentration (HHI)',
    source: 'DOSM monthly international arrivals, HHI by country',
    description:
      'Time series of the inbound market-concentration HHI against the high-concentration threshold of 2500.',
    dataset: 'arrivals',
  },
  {
    id: 'od-heatmap',
    page: 'markets',
    title: 'Tourist Flow Heatmap (Origin to Destination)',
    source: 'DOSM Tourist Flow Survey/DTS 2024 - origin-destination tourists',
    description:
      '16x16 matrix of tourist volume between origin and destination states.',
    dataset: 'od_flows',
  },

  // ── Simulation ──────────────────────────────────────────────────────────
  {
    id: 'jobs-budget-curve',
    page: 'simulation',
    title: 'Jobs created as the budget grows',
    source: 'LP allocation model on DOSM TSA linked allocation grain',
    description:
      'Curves showing jobs created (optimal targeted versus status quo) as the tourism budget grows.',
    dataset: 'allocation',
  },
  {
    id: 'where-money-goes',
    page: 'simulation',
    title: 'Where the money goes (allocation compare)',
    source: 'LP allocation model output versus current expenditure shares',
    description:
      'Two bars per industry: optimal targeted allocation versus how the status quo spreads the budget.',
    dataset: 'allocation',
  },

  // ── Decent Work ─────────────────────────────────────────────────────────
  {
    id: 'wage-gap',
    page: 'decent-work',
    title: 'Median wages for industries leading tourism',
    source: 'DOSM Salaries & Wages Survey 2024, whole-MSIC industry medians',
    description:
      'Median wages of industries carrying tourism jobs against the national median.',
    dataset: 'wages_2024',
  },
  {
    id: 'pay-ladder',
    page: 'decent-work',
    title: 'Pay ladder of all sectors',
    source: 'DOSM Salaries & Wages Survey 2024, median by industry',
    description:
      'Where tourism-carrying industries rank among all sectors by median wage.',
    dataset: 'wages_2024',
  },
  {
    id: 'wage-trend',
    page: 'decent-work',
    title: 'Median wage trend line (2010-2024)',
    source: 'DOSM Salaries & Wages Survey, median as % of national, 2010-2024',
    description:
      'Median wage as a share of the national median over time, per tourism industry.',
    dataset: 'wages_trend',
  },

  // ── SDG ─────────────────────────────────────────────────────────────────
  {
    id: 'tour-gdp-share',
    page: 'sdg',
    title: 'SDG 8.9.1: Tourism Direct GDP',
    source: 'DOSM Tourism Satellite Account, SDG indicator 8.9.1, 2015-2024',
    description:
      'Tourism Direct GDP as a share of total GDP - the volatility the dashboard measures.',
    dataset: 'sdg_891',
  },
  {
    id: 'sdg-tool-matrix',
    page: 'sdg',
    title: 'SDG 12.b.1: Can we measure it?',
    source: 'DOSM / UN SDG indicator 12.b.1, accounting tools',
    description:
      'Which standard tourism measurement tools Malaysia publishes, and which are tourism-disaggregated.',
    dataset: 'sdg_12b1',
  },
  // ── Overview KPI cards ──────────────────────────────────────────────────
  {
    id: 'kpi-tourism-employment',
    page: 'overview',
    title: 'KPI: Tourism Employment',
    source: 'DOSM TSA Table 7, 2015-2024',
    description: 'Headcount employment across the tourism industries, latest year and year-on-year change.',
    dataset: 'national_employment',
  },
  {
    id: 'kpi-tourism-dependent',
    page: 'overview',
    title: 'KPI: Tourism Dependent Jobs',
    source: 'DOSM TSA Table 7, 2015-2024',
    description: 'Tourism-attributable jobs, latest year and year-on-year change.',
    dataset: 'national_employment',
  },
  {
    id: 'kpi-total-spending',
    page: 'overview',
    title: 'KPI: Total Spending',
    source: 'DOSM TSA internal tourism expenditure',
    description: 'Internal tourism expenditure (inbound + domestic), latest year.',
    dataset: 'national_employment',
  },
  {
    id: 'kpi-attributable-drawdown',
    page: 'overview',
    title: 'KPI: Attributable Jobs Drawdown',
    source: 'DOSM TSA Table 7, 2015-2024',
    description: 'The drawdown in tourism-attributable jobs from peak to trough, measuring volatility.',
    dataset: 'national_employment',
  },
]

const byId = new Map<string, VizEntry>()
for (const v of VIZ_REGISTRY) byId.set(v.id, v)

export function getVizEntry(id: string): VizEntry | undefined {
  return byId.get(id)
}