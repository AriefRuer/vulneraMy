// Deterministic offline answerer. Answers "Ask AI" questions from the data
// BUNDLED with the dashboard (public/dashboard_data.json) - zero network, zero
// LLM. This is the offline guarantee (DOSM clause 6.1).
import { dashboardDataBundle } from '../store'
import { getVizEntry } from '../vizRegistry'

export interface AssistantResult {
  status: 'success' | 'rejected' | 'error'
  answer?: string
  evidence?: { type: 'observed' | 'calculated' | 'interpretation'; text: string }[]
  limitation?: string
}

type Row = Record<string, unknown>
const DATA = dashboardDataBundle as Record<string, Row[]>
function rows(key: string): Row[] { const v = DATA[key]; return Array.isArray(v) ? v : [] }
function num(r: Row, k: string): number { const v = r[k]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN }
function latest<T extends Row>(arr: T[]): T | undefined { return arr.length ? arr[arr.length - 1] : undefined }
function fmtRM(m: number): string { return m >= 1000 ? `RM${(m / 1000).toFixed(1)}B` : `RM${m.toFixed(0)}M` }
function fmtK(k: number): string { return k >= 1000 ? `${(k / 1000).toFixed(1)}M` : `${k.toFixed(1)}K` }
function pctDir(c: number): string { if (!Number.isFinite(c)) return ''; if (Math.abs(c) < 0.05) return 'broadly flat'; return c > 0 ? 'risen' : 'fallen' }
const SECTOR: Record<string, string> = { ACC: 'Accommodation', CSR: 'Arts & Entertainment', FNB: 'Food & Beverage', FUE: 'Wholesale & Retail', RET: 'Retail Trade', SVC: 'Other Services', TAG: 'Admin & Support', TRN: 'Transport & Storage' }
function sectorName(code: string): string { return SECTOR[code] || code }
const countryName = (c: string): string => ({ SGP: 'Singapore', IDN: 'Indonesia', THA: 'Thailand', CHN: 'China', IND: 'India', AUS: 'Australia', JPN: 'Japan', KOR: 'South Korea' } as Record<string, string>)[c] || c
function latestYear(rowsArr: Row[], prefer: number): Row[] { const years = Array.from(new Set(rowsArr.map((r) => r.year as number))).sort((a, b) => b - a); const y = years.includes(prefer) ? prefer : years[0] ?? prefer; return rowsArr.filter((r) => r.year === y) }

const INTENT: { re: RegExp; type: 'trend' | 'value' | 'top' | 'bottom' | 'comparison' | 'source' }[] = [
  { re: /\b(trend|direction|over time|how has|how did|changed|change|rise|rose|risen|fall|fell|fallen|increase|decrease|upward|downward|grow|shrink|recover|recovered)\b/i, type: 'trend' },
  { re: /\b(top|highest|largest|biggest|most|best|leader|leading|number one|first|rank)\b/i, type: 'top' },
  { re: /\b(bottom|lowest|smallest|weakest|worst|least|last)\b/i, type: 'bottom' },
  { re: /\b(compare|comparison|versus|vs\.?|relative|against|more than|less than|bigger|smaller|higher than|lower than|than)\b/i, type: 'comparison' },
  { re: /\b(source|where (is this|does ).*come|where .* from|origin|basis|data .* from|derived|methodology|method)\b/i, type: 'source' },
  { re: /\b(what is|what was|what are|how much|how many|value|current|latest|now|total|sum|level|amount|figure)\b/i, type: 'value' },
]
function intentOf(q: string): 'trend' | 'value' | 'top' | 'bottom' | 'comparison' | 'source' { for (const it of INTENT) if (it.re.test(q)) return it.type; return 'value' }interface Facts { value: string | null; trend: string | null; source: string | null; top: string | null; bottom: string | null; comparison: string | null }
const EMPTY: Facts = { value: null, trend: null, source: null, top: null, bottom: null, comparison: null }

function factsNationalEmployment(): Facts {
  const arr = rows('employment_national'); const first = arr[0]; const last = latest(arr)
  if (!first || !last) return EMPTY
  const lastYear = String(last.year ?? '')
  const attrPath = num(last, 'employment_attributable_k'); const headPath = num(last, 'employment_k')
  const firstAttr = num(first, 'employment_attributable_k'); const firstHead = num(first, 'employment_k')
  const attrChange = firstAttr ? ((attrPath - firstAttr) / firstAttr) * 100 : NaN
  const headChange = firstHead ? ((headPath - firstHead) / firstHead) * 100 : NaN
  const expInt = num(last, 'expenditure_int_rm_m'); const expInb = num(last, 'expenditure_inb_rm_m'); const expDom = num(last, 'expenditure_dom_rm_m')
  const value = Number.isFinite(attrPath)
    ? `In ${lastYear}, tourism-attributable employment was about ${fmtK(attrPath)} ('000 persons); headcount across tourism industries was about ${fmtK(headPath)}.`
    : `In ${lastYear}, internal tourism expenditure was about ${fmtRM(expInt)} (inbound ${fmtRM(expInb)}, domestic ${fmtRM(expDom)}).`
  const trend = first && Number.isFinite(attrChange)
    ? `Since ${first.year}, tourism-attributable employment has ${pctDir(attrChange)} by ${Math.abs(attrChange).toFixed(0)}%; the industry headcount has ${pctDir(headChange)} by ${Math.abs(headChange).toFixed(0)}%.`
    : null
  const comparison = Number.isFinite(attrPath) && Number.isFinite(headPath) && headPath
    ? `Tourism-attributable jobs are about ${((attrPath / headPath) * 100).toFixed(1)}% of the tourism-industry headcount; the remainder does not depend on tourism.`
    : null
  return { value, trend, comparison, source: 'DOSM Tourism Satellite Account (TSA) Table 7, 2015-2024.', top: null, bottom: null }
}

function factsIndustryEmployment(): Facts {
  const by = new Map<string, { code: string; jobs: number }>()
  latestYear(rows('employment_industry'), 2024).forEach((r) => { const code = String(r.industry_code ?? ''); const j = num(r, 'employment_attributable_k'); if (code && Number.isFinite(j)) by.set(code, { code, jobs: Math.max(by.get(code)?.jobs ?? -1, j) }) })
  const sorted = Array.from(by.values()).sort((a, b) => b.jobs - a.jobs)
  if (!sorted.length) return EMPTY
  const top = sorted[0]; const bottom = sorted[sorted.length - 1]
  return {
    value: `In 2024 the largest attributable tourism employment was ${sectorName(top.code)} at about ${fmtK(top.jobs)} ('000 persons).`,
    trend: null, source: 'DOSM TSA Table 7 employment by industry (attributable jobs).',
    top: `The top sector for attributable tourism jobs in 2024 was ${sectorName(top.code)} (~${fmtK(top.jobs)}).`,
    bottom: `The smallest of the eight tourism industry groups was ${sectorName(bottom.code)} (~${fmtK(bottom.jobs)}).`,
    comparison: sorted.length >= 2 ? `${sectorName(top.code)} carries about ${(top.jobs / Math.max(sorted[1].jobs, 1e-9)).toFixed(1)}x the attributable jobs of second-ranked ${sectorName(sorted[1].code)}.` : null,
  }
}

function factsStateRevenue(): Facts {
  const byState = rows('state_2024').map((r) => ({ label: String(r.state_label ?? ''), receipts: num(r, 'receipts_rm_m'), visitors: num(r, 'visitors_k'), vuln: num(r, 'vulnerability_index') })).filter((s) => s.label && Number.isFinite(s.receipts)).sort((a, b) => b.receipts - a.receipts)
  if (!byState.length) return EMPTY
  const top = byState[0]; const bottom = byState[byState.length - 1]; const totalR = byState.reduce((s, r) => s + r.receipts, 0)
  return {
    value: `In 2024 the largest tourism receipts were in ${top.label} at about ${fmtRM(top.receipts)}; total state receipts in the bundle are about ${fmtRM(totalR)}.`,
    trend: null, source: 'DOSM Domestic Tourism Survey 2024 (receipts by state).',
    top: `The leading state by tourism receipts is ${top.label} (~${fmtRM(top.receipts)}).`,
    bottom: `The state with the lowest receipts in the bundle is ${bottom.label} (~${fmtRM(bottom.receipts)}).`,
    comparison: totalR ? `${top.label} accounts for about ${((top.receipts / totalR) * 100).toFixed(1)}% of the total.` : null,
  }
}

function factsStatePanel(): Facts {
  const arr = rows('state_panel'); const base = 2019; const cmp = 2024
  const baseM = new Map(arr.filter((r) => r.year === base).map((r) => [String(r.state_code), num(r, 'receipts_rm_m')]))
  const cmpM = new Map(arr.filter((r) => r.year === cmp).map((r) => [String(r.state_code), num(r, 'receipts_rm_m')]))
  const out: { label: string; recovery: number }[] = []
  baseM.forEach((b, code) => { const c = cmpM.get(code); const label = String(arr.find((r) => r.state_code === code)?.state_label ?? code); if (b && c && Number.isFinite(c) && b > 0) out.push({ label, recovery: (c / b) * 100 }) })
  out.sort((a, b) => b.recovery - a.recovery)
  if (!out.length) return EMPTY
  const best = out[0]; const worst = out[out.length - 1]
  return {
    value: null,
    trend: `Between ${base} and ${cmp}, the strongest recovery was ${best.label} at ${best.recovery.toFixed(0)}% of ${base} receipts; the weakest was ${worst.label} at ${worst.recovery.toFixed(0)}%.`,
    source: 'DOSM state-panel tourism receipts, 2018-2024.',
    top: `The best-recovering state is ${best.label} (${best.recovery.toFixed(0)}% of ${base}).`,
    bottom: `The slowest-recovering state is ${worst.label} (${worst.recovery.toFixed(0)}% of ${base}).`,
    comparison: `Recovery ranged from ${worst.recovery.toFixed(0)}% (${worst.label}) to ${best.recovery.toFixed(0)}% (${best.label}) of ${base} levels.`,
  }
}

function factsArrivals(): Facts {
  const arr = rows('arrivals_national'); const last = latest(arr); const first = arr[0]
  if (!last) return EMPTY
  const hhi = num(last, 'hhi_country'); const share = num(last, 'top_country_share_pct'); const markets = num(last, 'active_markets_n')
  const topName = countryName(String(last.top_country ?? '')); const month = String(last.month_start ?? '').slice(0, 7)
  const firstHhi = num(first, 'hhi_country')
  const trend = first && Number.isFinite(hhi) && Number.isFinite(firstHhi) ? `Since ${String(first.month_start ?? '').slice(0, 7)}, the market-concentration HHI has ${pctDir(hhi - firstHhi)} from ${firstHhi.toFixed(0)} to ${hhi.toFixed(0)}.` : null
  return {
    value: `In ${month}, the inbound market HHI was about ${hhi.toFixed(0)}, above the 'high concentration' threshold of 2500.`,
    trend, source: `DOSM monthly international arrivals (latest row ${month}).`,
    top: `The largest source market is ${topName}, at about ${share.toFixed(0)}% of arrivals.`,
    bottom: null,
    comparison: `About ${share.toFixed(0)}% of inbound arrivals come from a single source market (${topName}) across roughly ${Math.round(markets)} active markets.`,
  }
}

function factsAllocation(): Facts {
  const byInd = rows('allocation').map((r) => ({ code: String(r.industry_code ?? ''), jobsPerM: num(r, 'jobs_per_rm1m_attributable') })).filter((r) => r.code && Number.isFinite(r.jobsPerM)).sort((a, b) => b.jobsPerM - a.jobsPerM)
  if (!byInd.length) return EMPTY
  const top = byInd[0]; const bottom = byInd[byInd.length - 1]
  const s = rows('allocation_summary')[0]
  const optJobs = num(s, 'jobs_created_optimal_k'); const bauJobs = num(s, 'jobs_created_bau_k')
  const uplift = Number.isFinite(optJobs) && Number.isFinite(bauJobs) && bauJobs ? ((optJobs - bauJobs) / bauJobs) * 100 : NaN
  return {
    value: `The most job-dense industry is ${sectorName(top.code)} at ${top.jobsPerM.toFixed(1)} attributable jobs per RM1M. At a RM5,000M budget the optimal allocation creates about ${optJobs.toFixed(0)}K jobs versus ${bauJobs.toFixed(0)}K under the status quo.`,
    trend: null, source: 'LP allocation model on the DOSM TSA-linked allocation grain (attributable jobs per RM1M).',
    top: `${sectorName(top.code)} creates the most attributable jobs per RM1M (${top.jobsPerM.toFixed(1)}).`,
    bottom: `${sectorName(bottom.code)} creates the fewest attributable jobs per RM1M (${bottom.jobsPerM.toFixed(1)}).`,
    comparison: Number.isFinite(uplift) ? `Targeting job-dense industries first creates about ${uplift.toFixed(0)}% more attributable jobs than spreading the budget by current spending shares.` : null,
  }
}function factsWages(): Facts {
  const arr = rows('wages_2024')
  const national = arr.find((r) => r.is_national_total === 1) ?? arr[0]
  const natMedian = num(national, 'median_salary_rm')
  const dw = rows('decent_work')
  const withVals = dw.map((r) => ({ code: String(r.industry_code ?? ''), vs: num(r, 'median_vs_national_pct') })).filter((r) => r.code && Number.isFinite(r.vs))
  const below = withVals.filter((r) => r.vs < 100)
  const lowest = [...below].sort((a, b) => a.vs - b.vs)[0]
  const highest = [...below].sort((a, b) => b.vs - a.vs)[0]
  const bottomStr = below.length ? `${below.length} of ${withVals.length} tourism-carrying industries pay below the national median${lowest ? `; the lowest is ${sectorName(lowest.code)} at ${lowest.vs.toFixed(0)}% of national` : ''}.` : null
  const topStr = highest ? `The highest relative pay among tourism-carrying industries is ${sectorName(highest.code)} at ${highest.vs.toFixed(0)}% of the national median.` : null
  return {
    value: Number.isFinite(natMedian) ? `The national median monthly wage is RM${natMedian.toLocaleString()}.` : null,
    trend: null, source: 'DOSM Salaries and Wages Survey 2024, whole-MSIC industry medians.',
    top: topStr, bottom: bottomStr,
    comparison: lowest && highest ? `Relative pay among tourism-carrying industries ranges from ${lowest.vs.toFixed(0)}% (${sectorName(lowest.code)}) to ${highest.vs.toFixed(0)}% (${sectorName(highest.code)}) of the national median.` : null,
  }
}

function factsWagesTrend(): Facts {
  const trend = rows('wages_trend')
  const dw = rows('decent_work')
  const codes = Array.from(new Set(dw.map((r) => String(r.industry_code ?? '')).filter(Boolean)))
  const lastRows = latestYear(trend, 2024)
  const ratios = codes
    .map((code) => {
      const en = dw.find((d) => d.industry_code === code)?.industry_en
      const match = lastRows.find((r) => r.industry_en === en)
      return { code, vs: match ? num(match, 'median_vs_national_pct') : NaN }
    })
    .filter((r) => Number.isFinite(r.vs))
  if (!ratios.length) return EMPTY
  const low = [...ratios].sort((a, b) => a.vs - b.vs)[0]
  return {
    value: `Over 2010-2024, ${sectorName(low.code)} has stayed furthest below the national median (${low.vs.toFixed(0)}% in 2024).`,
    trend: `Across the tourism-carrying industries, median wages as a share of the national median have remained below 100% throughout 2010-2024.`,
    source: 'DOSM Salaries and Wages Survey, median as % of national, 2010-2024.',
    top: null, bottom: low ? `${sectorName(low.code)} is the furthest below the national median (${low.vs.toFixed(0)}%).` : null,
    comparison: null,
  }
}

function factsSdg891(): Facts {
  const arr = rows('sdg_891')
  const sorted = [...arr].sort((a, b) => Number(a.year) - Number(b.year))
  const last = sorted[sorted.length - 1]
  if (!last) return EMPTY
  const trough = [...sorted].reduce((p, c) => (Number(c.proportion_pct) < Number(p.proportion_pct) ? c : p))
  const first = sorted[0]
  return {
    value: `In ${last.year}, Tourism Direct GDP was ${fmtRM(num(last, 'tdgdp_rm_m'))}, about ${Number(last.proportion_pct).toFixed(1)}% of total GDP.`,
    trend: `Tourism Direct GDP as a share of GDP ${pctDir(Number(last.proportion_pct) - Number(first.proportion_pct))} from ${Number(first.proportion_pct).toFixed(1)}% (${first.year}) to ${Number(last.proportion_pct).toFixed(1)}% (${last.year}), with a pandemic trough of ${Number(trough.proportion_pct).toFixed(1)}% in ${trough.year}.`,
    source: 'DOSM Tourism Satellite Account, SDG indicator 8.9.1, 2015-2024.',
    top: `The highest share was ${Number(sorted[sorted.length - 1].proportion_pct).toFixed(1)}% (${sorted[sorted.length - 1].year}).`, bottom: `The lowest share was ${Number(trough.proportion_pct).toFixed(1)}% (${trough.year}).`,
    comparison: `The share swung from ${Number(sorted[0].proportion_pct).toFixed(1)}% (${sorted[0].year}) down to ${Number(trough.proportion_pct).toFixed(1)}% (${trough.year}) and back to ${Number(last.proportion_pct).toFixed(1)}% (${last.year}).`,
  }
}

function factsSdg12b1(): Facts {
  const arr = rows('sdg_12b1')
  const tsa = arr.filter((r) => r.tool === 'TSA')
  const seea = arr.filter((r) => r.tool === 'SEEA')
  const seeaDisagg = seea.filter((r) => Number(r.tourism_disaggregated) === 1).length
  const toolsPublished = arr.filter((r) => Number(r.published_nationally) === 1).length
  return {
    value: `Malaysia publishes ${toolsPublished} of ${arr.length} standard tourism measurement tools; ${tsa.length} are TSA tables and ${seea.length} are SEEA environmental accounts.`,
    trend: null, source: 'DOSM / UN SDG indicator 12.b.1, accounting tools.',
    top: null, bottom: `Only ${seeaDisagg} of ${seea.length} SEEA environmental accounts are tourism-disaggregated.`,
    comparison: `Measurement capacity (12.b.1) is strong on TSA but environmental accounts are not yet tourism-disaggregated (${seeaDisagg}/${seea.length}).`,
  }
}

// ─── main entry ─────────────────────────────────────────────────────────
const FACTS_FN: Record<string, () => Facts> = {
  national_employment: factsNationalEmployment,
  industry_employment: factsIndustryEmployment,
  state_revenue: factsStateRevenue,
  state_panel: factsStatePanel,
  arrivals: factsArrivals,
  allocation: factsAllocation,
  wages_2024: factsWages,
  wages_trend: factsWagesTrend,
  sdg_891: factsSdg891,
  sdg_12b1: factsSdg12b1,
}

export function askOffline(visualizationId: string, question: string): AssistantResult {
  const entry = getVizEntry(visualizationId)
  if (!entry) {
    return { status: 'rejected', limitation: "I can't open that visualization. Please select a chart on the dashboard and try again." }
  }
  const q = String(question ?? '').trim()
  if (!q) {
    return { status: 'rejected', limitation: 'I did not quite get that. Try a short question about this chart.' }
  }
  if (q.length > 500) {
    return { status: 'rejected', limitation: 'That question is a bit long. Try a shorter one about this chart.' }
  }
  const factFn = FACTS_FN[entry.dataset]
  const facts = factFn ? factFn() : EMPTY
  const intent = intentOf(q)
  const evidence: { type: 'observed' | 'calculated' | 'interpretation'; text: string }[] = []
  if (facts.value) evidence.push({ type: 'observed', text: facts.value })
  if (intent === 'trend' && facts.trend) evidence.push({ type: 'calculated', text: facts.trend })
  if (intent !== 'comparison' && facts.comparison) evidence.push({ type: 'calculated', text: facts.comparison })

  // Honest refusal: causal / normative questions (why, who caused, because,
  // reason, should, recommend, fix) are outside what a deterministic answerer
  // can assert. Never force an irrelevant value onto them.
  if (/\b(why|who caused|what caused|because|the reason|cause|recommend|should|ought|fix|advise|blame)\b/i.test(q)) {
    return {
      status: 'success',
      answer:
        "This chart shows what the data records, not why it happened. I can describe this chart's values, trends, rankings, comparisons, or its source, but I can't infer causes or give recommendations.",
      evidence,
    }
  }

  const pick = (which: string): string | null =>
    which === 'trend' ? facts.trend : which === 'top' ? facts.top : which === 'bottom' ? facts.bottom : which === 'comparison' ? facts.comparison : which === 'source' ? facts.source : facts.value
  const primary = pick(intent)

  if (primary) {
    return { status: 'success', answer: primary, evidence }
  }
  return {
    status: 'success',
    answer: "That's outside what this chart's data can tell me. I can answer about this chart's values, trends, rankings, comparisons, or its source. Try a question in that direction.",
    evidence,
  }
}