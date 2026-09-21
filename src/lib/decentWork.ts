// Decent-work helpers. The wage figures are whole-MSIC-industry medians (DOSM
// Salaries & Wages Survey), so they describe *the industries that carry tourism
// jobs*, not tourism jobs in isolation — the per-industry `note` explains each
// coverage caveat. Attributable-jobs weighting focuses the summary on the parts
// of those industries that actually depend on tourism.

export interface DecentWorkRow {
  industry_code: string
  industry_en: string
  employment_attributable_k: number
  median_salary_rm: number
  mean_salary_rm: number
  median_vs_national_pct: number
  national_median_rm: number
  confidence: 'high' | 'medium' | 'low' | string
  note: string
}

export interface Wage2024Row {
  industry_en: string
  median_salary_rm: number
  median_vs_national_pct: number
  recipients_k: number
  is_national_total: number
}

export interface WageTrendRow {
  year: number
  industry_en: string
  median_salary_rm: number
  median_vs_national_pct: number
}

/** The distinct MSIC industry_en labels that carry tourism jobs (from decent_work). */
export function tourismIndustryEn(rows: DecentWorkRow[]): Set<string> {
  return new Set(rows.map((r) => r.industry_en))
}

export interface DecentWorkSummary {
  weightedMedian: number
  weightedPctOfNational: number
  nationalMedian: number
  belowNational: number
  total: number
}

/** Attributable-jobs-weighted pay summary across the tourism-carrying industries. */
export function decentWorkSummary(rows: DecentWorkRow[]): DecentWorkSummary | null {
  if (rows.length === 0) return null
  const w = rows.reduce((s, r) => s + r.employment_attributable_k, 0) || 1
  const weightedMedian = rows.reduce((s, r) => s + r.median_salary_rm * r.employment_attributable_k, 0) / w
  const nationalMedian = rows[0].national_median_rm
  return {
    weightedMedian,
    weightedPctOfNational: (weightedMedian / nationalMedian) * 100,
    nationalMedian,
    belowNational: rows.filter((r) => r.median_vs_national_pct < 100).length,
    total: rows.length,
  }
}
