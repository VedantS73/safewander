import { Layout } from 'antd'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppHeader } from './components/layout/AppHeader'
import { BottomNav } from './components/layout/BottomNav'
import { AssistantPage } from './components/pages/AssistantPage'
import { CommunityPage } from './components/pages/CommunityPage'
import { ExplorePage } from './components/pages/ExplorePage'
import { MonitorPage } from './components/pages/MonitorPage'
import { RoutesPage } from './components/pages/RoutesPage'
import { Analytics } from "@vercel/analytics/react"

function App() {
  const location = useLocation()
  const fullBleed =
    location.pathname === '/explore' ||
    location.pathname === '/routes' ||
    location.pathname === '/community'

  return (
    <Layout className="app-shell flex flex-col bg-slate-50 text-slate-900">
      <Layout.Header className="!h-auto shrink-0 !bg-transparent !p-0">
        <AppHeader />
      </Layout.Header>

      <Analytics/>

      <Layout.Content
        className={`app-shell-content flex min-h-0 flex-1 flex-col overflow-y-auto ${fullBleed ? '!p-0' : 'p-4'}`}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/explore" replace />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
      </Layout.Content>

      <Layout.Footer className="!bg-transparent !p-0">
        <BottomNav />
      </Layout.Footer>
    </Layout>
  )
}

export default App
