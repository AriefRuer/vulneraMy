// Deterministic analytics (server side). These run BEFORE any LLM call so the
// model never does arithmetic or touches raw data - it only explains computed
// facts. Mirrors the client offline answerer's approach.
export interface Facts {
  value: string | null
  trend: string | null
  source: string | null
  top: string | null
  bottom: string | null
  comparison: string | null
}

const EMPTY: Facts = { value: null, trend: null, source: null, top: null, bottom: null, comparison: null }

type Row = Record<string, unknown>
function num(r: Row, k: string): number { const v = r[k]; return typeof v === 'number' && Number.isFinite(v) ? v : NaN }
function latest<T extends Row>(arr: T[]): T | undefined { return arr.length ? arr[arr.length - 1] : undefined }
function latestYear(rowsArr: Row[], prefer: number): Row[] { const years = Array.from(new Set(rowsArr.map((r) => Number(r.year)))).sort((a, b) => b - a); const y = years.includes(prefer) ? prefer : years[0] ?? prefer; return rowsArr.filter((r) => Number(r.year) === y) }
function fmtM(m: number): string { return m >= 1000 ? `RM${(m / 1000).toFixed(1)}B` : `RM${m.toFixed(0)}M` }
function fmtK(k: number): string { return k >= 1000 ? `${(k / 1000).toFixed(1)}M` : `${k.toFixed(1)}K` }
function pctDir(c: number): string { if (!Number.isFinite(c)) return ''; if (Math.abs(c) < 0.05) return 'broadly flat'; return c > 0 ? 'risen' : 'fallen' }

const SECTOR: Record<string, string> = { ACC: 'Accommodation', CSR: 'Arts & Entertainment', FNB: 'Food & Beverage', FUE: 'Wholesale & Retail', RET: 'Retail Trade', SVC: 'Other Services', TAG: 'Admin & Support', TRN: 'Transport & Storage' }
const sectorName = (c: string): string => SECTOR[c] || c
const countryName = (c: string): string => ({ SGP: 'Singapore', IDN: 'Indonesia', THA: 'Thailand', CHN: 'China', IND: 'India', AUS: 'Australia', JPN: 'Japan', KOR: 'South Korea' } as Record<string, string>)[c] || c

export function computeFacts(dataset: string, data: Record<string, unknown>): Facts {
  const rows = (k: string): Row[] => { const v = data[k]; return Array.isArray(v) ? (v as Row[]) : [] }
  switch (dataset) {
    case 'national_employment': {
      const arr = rows('employment_national'); const first = arr[0]; const last = latest(arr)
      if (!first || !last) return EMPTY
      const attr = num(last, 'employment_attributable_k'); const head = num(last, 'employment_k')
      const a0 = num(first, 'employment_attributable_k'); const ch = a0 ? ((attr - a0) / a0) * 100 : NaN
      return {
        value: Number.isFinite(attr) ? `In ${last.year}, tourism-attributable employment was about ${fmtK(attr)}; headcount was about ${fmtK(head)}.` : null,
        trend: Number.isFinite(ch) ? `Since ${first.year}, attributable employment has ${pctDir(ch)} by ${Math.abs(ch).toFixed(0)}%.` : null,
        source: 'DOSM Tourism Satellite Account (TSA) Table 7, 2015-2024.',
        top: null, bottom: null,
        comparison: (Number.isFinite(attr) && head > 0) ? `Attributable jobs are about ${((attr / head) * 100).toFixed(1)}% of the industry headcount.` : null,
      }
    }
    case 'industry_employment': {
      const by = new Map<string, { code: string; jobs: number }>()
      rows('employment_industry').filter((r) => Number(r.year) === 2024 || r.year === undefined).forEach((r) => { const code = String(r.industry_code ?? ''); const j = num(r, 'employment_attributable_k'); if (code && Number.isFinite(j)) by.set(code, { code, jobs: Math.max(by.get(code)?.jobs ?? -1, j) }) })
      const sorted = Array.from(by.values()).sort((a, b) => b.jobs - a.jobs)
      if (!sorted.length) return EMPTY
      const top = sorted[0]; const bottom = sorted[sorted.length - 1]
      return {
        value: `The largest attributable tourism employment was ${sectorName(top.code)} (~${fmtK(top.jobs)}).`,
        trend: null, source: 'DOSM TSA Table 7 employment by industry.',
        top: `The top sector was ${sectorName(top.code)} (~${fmtK(top.jobs)}).`,
        bottom: `The smallest was ${sectorName(bottom.code)} (~${fmtK(bottom.jobs)}).`,
        comparison: sorted.length >= 2 ? `${sectorName(top.code)} carries ${
          (top.jobs / Math.max(sorted[1].jobs, 1e-9)).toFixed(1)}x the attributable jobs of second-ranked ${sectorName(sorted[1].code)}.` : null,
      }
    }
    case 'arrivals': {
      const arr = rows('arrivals_national'); const last = latest(arr); const first = arr[0]
      if (!last) return EMPTY
      const hhi = num(last, 'hhi_country'); const share = num(last, 'top_country_share_pct')
      const topName = countryName(String(last.top_country ?? '')); const month = String(last.month_start ?? '').slice(0, 7)
      const fh = first ? num(first, 'hhi_country') : NaN
      return {
        value: `In ${month}, the inbound market HHI was about ${hhi.toFixed(0)}, above the high-concentration threshold of 2500.`,
        trend: (first && Number.isFinite(fh)) ? `Since ${String(first.month_start ?? '').slice(0, 7)}, the HHI has ${pctDir(hhi - fh)} from ${fh.toFixed(0)} to ${hhi.toFixed(0)}.` : null,
        source: 'DOSM monthly international arrivals.',
        top: `The largest source market is ${topName}, at about ${share.toFixed(0)}% of arrivals.`,
        bottom: null,
        comparison: `About ${share.toFixed(0)}% of inbound arrivals come from one source market (${topName}).`,
      }
    }
    case 'wages_2024': {
      const arr = rows('wages_2024'); const national = arr.find((r) => (r as Row).is_national_total === 1) ?? arr[0]
      const nat = num(national, 'median_salary_rm')
      const dw = rows('decent_work').map((r) => ({ code: String(r.industry_code ?? ''), vs: num(r, 'median_vs_national_pct') })).filter((r) => r.code && Number.isFinite(r.vs))
      const below = dw.filter((r) => r.vs < 100).sort((a, b) => a.vs - b.vs)
      return {
        value: Number.isFinite(nat) ? `The national median monthly wage is RM${nat.toLocaleString()}.` : null,
        trend: null, source: 'DOSM Salaries and Wages Survey 2024.',
        top: below.length ? `The highest relative pay among tourism-carrying industries is ${sectorName(below[below.length - 1].code)} at ${below[below.length - 1].vs.toFixed(0)}% of national.` : null,
        bottom: below.length ? `${below.length} of ${dw.length} tourism-carrying industries pay below the national median; the lowest is ${sectorName(below[0].code)} at ${below[0].vs.toFixed(0)}%.` : null,
        comparison: below.length >= 2 ? `Pay ranges from ${below[0].vs.toFixed(0)}% (${sectorName(below[0].code)}) to ${below[below.length - 1].vs.toFixed(0)}% (${sectorName(below[below.length - 1].code)}) of the national median.` : null,
      }
    }
    case 'state_revenue': {
      const byState = rows('state_2024').map((r) => ({ label: String(r.state_label ?? ''), receipts: num(r, 'receipts_rm_m') })).filter((s) => s.label && Number.isFinite(s.receipts)).sort((a, b) => b.receipts - a.receipts)
      if (!byState.length) return EMPTY
      const top = byState[0]; const bottom = byState[byState.length - 1]; const totalR = byState.reduce((s, r) => s + r.receipts, 0)
      return {
        value: `In 2024 the largest tourism receipts were in ${top.label} at about ${fmtM(top.receipts)}; total state receipts in the bundle are about ${fmtM(totalR)}.`,
        trend: null, source: 'DOSM Domestic Tourism Survey 2024 (receipts by state).',
        top: `The leading state by tourism receipts is ${top.label} (~${fmtM(top.receipts)}).`,
        bottom: `The state with the lowest receipts in the bundle is ${bottom.label} (~${fmtM(bottom.receipts)}).`,
        comparison: totalR ? `${top.label} accounts for about ${((top.receipts / totalR) * 100).toFixed(1)}% of the total.` : null,
      }
    }
    case 'state_panel': {
      const arr = rows('state_panel'); const base = 2019; const cmp = 2024
      const baseM = new Map(arr.filter((r) => Number(r.year) === base).map((r) => [String(r.state_code), num(r, 'receipts_rm_m')] as [string, number]))
      const cmpM = new Map(arr.filter((r) => Number(r.year) === cmp).map((r) => [String(r.state_code), num(r, 'receipts_rm_m')] as [string, number]))
      const out: { label: string; recovery: number }[] = []
      baseM.forEach((b, code) => { const c = cmpM.get(code); const label = String(arr.find((r) => r.state_code === code)?.state_label ?? code); if (b && typeof c === 'number' && Number.isFinite(c) && b > 0) out.push({ label, recovery: (c / b) * 100 }) })
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
    case 'allocation': {
      const byInd = rows('allocation').map((r) => ({ code: String(r.industry_code ?? ''), jobsPerM: num(r, 'jobs_per_rm1m_attributable') })).filter((r) => r.code && Number.isFinite(r.jobsPerM)).sort((a, b) => b.jobsPerM - a.jobsPerM)
      if (!byInd.length) return EMPTY
      const top = byInd[0]; const bottom = byInd[byInd.length - 1]
      const s = rows('allocation_summary')[0] ?? {}
      const optJobs = num(s, 'jobs_created_optimal_k'); const bauJobs = num(s, 'jobs_created_bau_k')
      const haveSummary = Number.isFinite(optJobs) && Number.isFinite(bauJobs)
      const uplift = haveSummary && bauJobs ? ((optJobs - bauJobs) / bauJobs) * 100 : NaN
      return {
        value: `The most job-dense industry is ${sectorName(top.code)} at ${top.jobsPerM.toFixed(1)} attributable jobs per RM1M.${haveSummary ? ` At a RM5,000M budget the optimal allocation creates about ${optJobs.toFixed(0)}K jobs versus ${bauJobs.toFixed(0)}K under the status quo.` : ''}`,
        trend: null, source: 'LP allocation model on the DOSM TSA-linked allocation grain (attributable jobs per RM1M).',
        top: `${sectorName(top.code)} creates the most attributable jobs per RM1M (${top.jobsPerM.toFixed(1)}).`,
        bottom: `${sectorName(bottom.code)} creates the fewest attributable jobs per RM1M (${bottom.jobsPerM.toFixed(1)}).`,
        comparison: Number.isFinite(uplift) ? `Targeting job-dense industries first creates about ${uplift.toFixed(0)}% more attributable jobs than spreading the budget by current spending shares.` : null,
      }
    }
    case 'wages_trend': {
      const trend = rows('wages_trend'); const dw = rows('decent_work')
      const codes = Array.from(new Set(dw.map((r) => String(r.industry_code ?? '')).filter(Boolean)))
      const lastRows = latestYear(trend, 2024)
      const ratios = codes.map((code) => {
        const en = dw.find((row) => row.industry_code === code)?.industry_en
        const match = lastRows.find((r) => r.industry_en === en)
        return { code, vs: match ? num(match, 'median_vs_national_pct') : NaN }
      }).filter((r) => Number.isFinite(r.vs))
      if (!ratios.length) return EMPTY
      const low = [...ratios].sort((a, b) => a.vs - b.vs)[0]
      return {
        value: `Over 2010-2024, ${sectorName(low.code)} has stayed furthest below the national median (${low.vs.toFixed(0)}% in 2024).`,
        trend: 'Across the tourism-carrying industries, median wages as a share of the national median have remained below 100% throughout 2010-2024.',
        source: 'DOSM Salaries and Wages Survey, median as % of national, 2010-2024.',
        top: null, bottom: `${sectorName(low.code)} is the furthest below the national median (${low.vs.toFixed(0)}%).`,
        comparison: null,
      }
    }
    case 'sdg_891': {
      const arr = rows('sdg_891')
      const sorted = [...arr].sort((a, b) => Number(a.year) - Number(b.year))
      const last = sorted[sorted.length - 1]; const first = sorted[0]
      if (!last) return EMPTY
      const trough = sorted.reduce((p, c) => (Number(c.proportion_pct) < Number(p.proportion_pct) ? c : p))
      return {
        value: `In ${last.year}, Tourism Direct GDP was ${fmtM(num(last, 'tdgdp_rm_m'))}, about ${Number(last.proportion_pct).toFixed(1)}% of total GDP.`,
        trend: `Tourism Direct GDP as a share of GDP ${pctDir(Number(last.proportion_pct) - Number(first.proportion_pct))} from ${Number(first.proportion_pct).toFixed(1)}% (${first.year}) to ${Number(last.proportion_pct).toFixed(1)}% (${last.year}), with a pandemic trough of ${Number(trough.proportion_pct).toFixed(1)}% in ${trough.year}.`,
        source: 'DOSM Tourism Satellite Account, SDG indicator 8.9.1, 2015-2024.',
        top: `The highest share was ${Number(last.proportion_pct).toFixed(1)}% (${last.year}).`,
        bottom: `The lowest share was ${Number(trough.proportion_pct).toFixed(1)}% (${trough.year}).`,
        comparison: `The share swung from ${Number(first.proportion_pct).toFixed(1)}% (${first.year}) down to ${Number(trough.proportion_pct).toFixed(1)}% (${trough.year}) and back to ${Number(last.proportion_pct).toFixed(1)}% (${last.year}).`,
      }
    }
    case 'sdg_12b1': {
      const arr = rows('sdg_12b1')
      if (!arr.length) return EMPTY
      const tsa = arr.filter((r) => r.tool === 'TSA'); const seea = arr.filter((r) => r.tool === 'SEEA')
      const seeaDisagg = seea.filter((r) => Number(r.tourism_disaggregated) === 1).length
      const toolsPublished = arr.filter((r) => Number(r.published_nationally) === 1).length
      return {
        value: `Malaysia publishes ${toolsPublished} of ${arr.length} standard tourism measurement tools; ${tsa.length} are TSA tables and ${seea.length} are SEEA environmental accounts.`,
        trend: null, source: 'DOSM / UN SDG indicator 12.b.1, accounting tools.',
        top: null, bottom: `Only ${seeaDisagg} of ${seea.length} SEEA environmental accounts are tourism-disaggregated.`,
        comparison: `Measurement capacity (12.b.1) is strong on TSA but environmental accounts are not yet tourism-disaggregated (${seeaDisagg}/${seea.length}).`,
      }
    }
    case 'od_flows': {
      const arr = rows('od_flows')
      if (!arr.length) return EMPTY
      const total = arr.reduce((s, r) => s + num(r, 'tourists_k'), 0)
      const intraTotal = arr.filter((r) => Number(r.is_intra_state) === 1).reduce((s, r) => s + num(r, 'tourists_k'), 0)
      const inter = arr.filter((r) => Number(r.is_intra_state) !== 1 && Number.isFinite(num(r, 'tourists_k')))
      const byDest = new Map<string, number>(); const byOrigin = new Map<string, number>()
      inter.forEach((r) => {
        const d = String(r.dest_label ?? r.dest_state_code ?? ''); const o = String(r.origin_label ?? r.origin_state_code ?? '')
        byDest.set(d, (byDest.get(d) ?? 0) + num(r, 'tourists_k'))
        byOrigin.set(o, (byOrigin.get(o) ?? 0) + num(r, 'tourists_k'))
      })
      const topCorridor = [...inter].sort((a, b) => num(b, 'tourists_k') - num(a, 'tourists_k'))[0]
      const topDest = [...byDest.entries()].sort((a, b) => b[1] - a[1])[0]
      const topOrigin = [...byOrigin.entries()].sort((a, b) => b[1] - a[1])[0]
      const corridor = topCorridor ? `${String(topCorridor.origin_label ?? topCorridor.origin_state_code ?? '')} to ${String(topCorridor.dest_label ?? topCorridor.dest_state_code ?? '')}` : ''
      return {
        value: topCorridor ? `Among 2024 inter-state tourist flows, the largest corridor is ${corridor}, about ${fmtK(num(topCorridor, 'tourists_k'))} tourists (${num(topCorridor, 'share_of_all_flows_pct').toFixed(1)}% of all flows).` : null,
        trend: null,
        source: 'DOSM Domestic Tourism Survey 2024 - origin-to-destination tourist flows.',
        top: topDest ? `The top destination for out-of-state tourists is ${topDest[0]} (~${fmtK(topDest[1])} inbound).` : null,
        bottom: topOrigin ? `The largest source of out-of-state trips is ${topOrigin[0]} (~${fmtK(topOrigin[1])} outbound).` : null,
        comparison: total ? `About ${((intraTotal / total) * 100).toFixed(0)}% of recorded tourist volume stays within the home state; the rest crosses state lines.` : null,
      }
    }
    default:
      return EMPTY
  }
}