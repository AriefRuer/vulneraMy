import './index.css'
import { dashboardDataBundle, useFilters } from './store'
import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'
import KPICardRow from './components/KPICardRow'
import AssistantPanel from './components/Assistant/AssistantPanel'

// Build-time toggle: set VITE_AI_ASSISTANT=false to ship the dashboard without
// the AI assistant feature. Used to recover the pre-assistant version.
const AI_ASSISTANT = (import.meta.env.VITE_AI_ASSISTANT ?? 'true') !== 'false'
import OverviewPage from './pages/OverviewPage'
import StructuralPage from './pages/StructuralPage'
import GeographicPage from './pages/GeographicPage'
import MarketPage from './pages/MarketPage'
import SimulationPage from './pages/SimulationPage'
import DecentWorkPage from './pages/DecentWorkPage'
import SdgPage from './pages/SdgPage'

function App() {
  const data = dashboardDataBundle
  const activePage = useFilters((s) => s.activePage)

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage data={data} />
      case 'structural':
        return <StructuralPage data={data} />
      case 'geographic':
        return <GeographicPage data={data} />
      case 'markets':
        return <MarketPage data={data} />
      case 'simulation':
        return <SimulationPage data={data} />
      case 'decent-work':
        return <DecentWorkPage data={data} />
      case 'sdg':
        return <SdgPage data={data} />
      default:
        return <OverviewPage data={data} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f8fafb' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <FilterBar data={data} />
        <div className="flex-1 overflow-y-auto p-6">
          {/* KPI row on Overview only - other pages carry their own lead visuals */}
          {activePage === 'overview' && <KPICardRow data={data} />}
          {renderPage()}
        </div>
      </main>
      {AI_ASSISTANT && <AssistantPanel />}
    </div>
  )
}

export default App