import { create } from 'zustand'
import dashboardData from '../public/dashboard_data.json'

// Data is bundled at build time (imported above) so the dashboard works
// out of the box as static files — no server, no fetch, no CORS needed.
export const dashboardDataBundle = dashboardData as Record<string, unknown>

interface FilterState {
  year: number | 'all'
  state: string | 'all'
  sector: string | 'all'
  activePage: string
  setYear: (y: number | 'all') => void
  setState: (s: string | 'all') => void
  setSector: (s: string | 'all') => void
  setPage: (p: string) => void
  resetFilters: () => void
}

export const useFilters = create<FilterState>((set) => ({
  year: 'all',
  state: 'all',
  sector: 'all',
  activePage: 'overview',
  setYear: (year) => set({ year }),
  setState: (state) => set({ state }),
  setSector: (sector) => set({ sector }),
  setPage: (activePage) => set({ activePage }),
  resetFilters: () => set({ year: 'all', state: 'all', sector: 'all' }),
}))

// Page-local filters (progressive disclosure — each page owns its contextual
// controls, per DESIGN_GUIDE). Reset to defaults when leaving the page.
interface PageFilterState {
  // Structural waterfall: comparison years
  wfStart: number
  wfEnd: number
  // Geographic: tier filter
  tier: string
  // Geographic: recovery base/compare years
  recBase: number
  recCompare: number
  // Simulation: LP budget (RM millions). Default is the studied scenario (RM5,000M).
  simBudget: number
  setWfStart: (y: number) => void
  setWfEnd: (y: number) => void
  setTier: (t: string) => void
  setRecBase: (y: number) => void
  setRecCompare: (y: number) => void
  setSimBudget: (b: number) => void
  resetPageFilters: () => void
}

export const usePageFilters = create<PageFilterState>((set) => ({
  wfStart: 2019,
  wfEnd: 2024,
  tier: 'all',
  recBase: 2019,
  recCompare: 2024,
  simBudget: 5000,
  setWfStart: (wfStart) => set({ wfStart }),
  setWfEnd: (wfEnd) => set({ wfEnd }),
  setTier: (tier) => set({ tier }),
  setRecBase: (recBase) => set({ recBase }),
  setRecCompare: (recCompare) => set({ recCompare }),
  setSimBudget: (simBudget) => set({ simBudget }),
  resetPageFilters: () =>
    set({ wfStart: 2019, wfEnd: 2024, tier: 'all', recBase: 2019, recCompare: 2024, simBudget: 5000 }),
}))

// Formatting helpers
export function fmtK(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}M`
  return `${v.toFixed(1)}K`
}

export function fmtRM(v: number): string {
  if (v >= 1000) return `RM${(v / 1000).toFixed(1)}B`
  return `RM${v.toFixed(0)}M`
}

export function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}