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
    default:
      return EMPTY
  }
}