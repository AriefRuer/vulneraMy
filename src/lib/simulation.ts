// Budget-allocation simulation — recomputed LIVE in JS from the `allocation` grain.
//
// The shipped LP maximises attributable jobs = Σ (allocₖ · jobs_per_rm1mₖ) subject to
// a single budget constraint and per-industry absorption caps. Because the objective
// is linear and the only per-industry constraint is a box (0 ≤ allocₖ ≤ capₖ), the
// optimum is a greedy fill by descending jobs-per-RM1M. This reproduces the shipped
// `allocation_summary` exactly at the studied budget (RM5,000M → 50.15k jobs), so the
// slider is a faithful live sweep of the same model, not an approximation.

// Slider bounds (RM millions). Max is 2× the studied RM5,000M scenario, enough to
// show the optimal curve bend as the high-efficiency industries hit their caps.
export const SIM_MIN_BUDGET = 500
export const SIM_MAX_BUDGET = 10000
export const SIM_STEP = 250
export const SIM_STUDIED_BUDGET = 5000

export interface AllocRow {
  industry_code: string
  current_expenditure_rm_m: number
  jobs_per_rm1m_attributable: number
  absorption_cap_rm_m: number
}

export interface AllocResult {
  /** RM millions allocated to each industry_code. */
  byIndustry: Record<string, number>
  /** Attributable jobs created (thousands). */
  jobsK: number
  /** Total budget actually deployable under the optimal caps (RM millions). */
  deployable: number
}

/** Optimal LP: greedy fill by descending jobs-per-RM1M up to each absorption cap. */
export function optimalAllocation(rows: AllocRow[], budget: number): AllocResult {
  const byIndustry: Record<string, number> = {}
  rows.forEach((r) => (byIndustry[r.industry_code] = 0))

  const sorted = [...rows].sort(
    (a, b) => b.jobs_per_rm1m_attributable - a.jobs_per_rm1m_attributable,
  )
  let remaining = Math.max(0, budget)
  let jobsK = 0
  for (const r of sorted) {
    const take = Math.min(r.absorption_cap_rm_m, remaining)
    byIndustry[r.industry_code] = take
    jobsK += (take * r.jobs_per_rm1m_attributable) / 1000
    remaining -= take
    if (remaining <= 0) break
  }
  const totalCap = rows.reduce((s, r) => s + r.absorption_cap_rm_m, 0)
  return { byIndustry, jobsK, deployable: Math.min(budget, totalCap) }
}

/** Status quo (BAU): allocate proportional to each industry's current expenditure. */
export function bauAllocation(rows: AllocRow[], budget: number): AllocResult {
  const totalCur = rows.reduce((s, r) => s + r.current_expenditure_rm_m, 0) || 1
  const byIndustry: Record<string, number> = {}
  let jobsK = 0
  rows.forEach((r) => {
    const a = (Math.max(0, budget) * r.current_expenditure_rm_m) / totalCur
    byIndustry[r.industry_code] = a
    jobsK += (a * r.jobs_per_rm1m_attributable) / 1000
  })
  return { byIndustry, jobsK, deployable: budget }
}
