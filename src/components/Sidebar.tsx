import React from 'react'
import { useFilters, usePageFilters } from '../store'
import Logo from './Logo'
import {
  OverviewIcon,
  StructuralIcon,
  GeographicIcon,
  MarketIcon,
  SimulationIcon,
  DecentWorkIcon,
  SdgIcon,
} from './icons'

const navItems: Array<{ id: string; label: string; icon: React.FC<{ size?: number; className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: OverviewIcon },
  { id: 'structural', label: 'Structural Analysis', icon: StructuralIcon },
  { id: 'geographic', label: 'Geographical Analysis', icon: GeographicIcon },
  { id: 'markets', label: 'Market & Flows', icon: MarketIcon },
  { id: 'simulation', label: 'Simulation', icon: SimulationIcon },
  { id: 'decent-work', label: 'Decent Work', icon: DecentWorkIcon },
  { id: 'sdg', label: 'SDG Alignment', icon: SdgIcon },
]

export default function Sidebar() {
  const { activePage, setPage, resetFilters } = useFilters()
  const resetPageFilters = usePageFilters((s) => s.resetPageFilters)

  const go = (page: string) => {
    setPage(page)
    resetPageFilters() // page-local controls reset when leaving the page
  }

  return (
    <aside className="w-[260px] min-w-[260px] flex flex-col h-screen"
      style={{ backgroundColor: '#1a1a1a' }}>
      {/* Logo + wordmark */}
      <div className="px-6 py-6 border-b border-white/10">
        <Logo size={54} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[11px] font-normal uppercase tracking-wider px-3 mb-2"
          style={{ fontFamily: "'Alexandria', sans-serif", color: '#7b7b7b' }}>
          Pages
        </p>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id
          return (
            <button
              key={id}
              onClick={() => go(id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 mb-1 ${
                active ? '' : 'hover:bg-white/10'
              }`}
              style={{
                fontFamily: "'Alexandria', sans-serif",
                backgroundColor: active ? '#ffffff' : 'transparent',
                color: active ? '#1a2b88' : '#7b7b7b',
                fontSize: '15px',
                fontWeight: 400,
              }}
            >
              <span className="shrink-0 flex items-center justify-center" style={{ width: 30, height: 30 }}>
                <Icon size={26} />
              </span>
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Reset Filters */}
      <div className="px-3 pb-5 border-t border-white/10 pt-3">
        <button
          onClick={resetFilters}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-normal text-[#7b7b7b] hover:text-gray-200 hover:bg-white/10 transition-all"
          style={{ fontFamily: "'Alexandria', sans-serif" }}
        >
          <span className="text-[18px] w-5 text-center">↻</span>
          Reset Filters
        </button>
      </div>
    </aside>
  )
}