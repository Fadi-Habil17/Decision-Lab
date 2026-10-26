import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import LoadingState from './components/ui/LoadingState'
import { useDemoSession } from './demo/session'
import AppShell from './layout/AppShell'
import DecisionResultsPage from './pages/DecisionResultsPage'
import DecisionWorkspacePage from './pages/DecisionWorkspacePage'
import DecisionsPage from './pages/DecisionsPage'
import LoginPage from './pages/LoginPage'
import NewDecisionPage from './pages/NewDecisionPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import TemplatesPage from './pages/TemplatesPage'

const AuthPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AuthPreviewPage'))
  : null

const DecisionsPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DecisionsPreviewPage'))
  : null

function App() {
  const { user } = useDemoSession()
  const location = useLocation()
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/decisions" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {AuthPreviewPage && (
          <Route
            path="/__preview/auth"
            element={
              <Suspense
                fallback={<LoadingState message="Loading preview tools…" />}
              >
                <AuthPreviewPage />
              </Suspense>
            }
          />
        )}
        {DecisionsPreviewPage && (
          <Route
            path="/__preview/decisions"
            element={
              <Suspense
                fallback={<LoadingState message="Loading preview tools…" />}
              >
                <DecisionsPreviewPage />
              </Suspense>
            }
          />
        )}
        <Route path="/decisions" element={<DecisionsPage />} />
        <Route
          path="/decisions/new"
          element={
            user ? (
              <NewDecisionPage />
            ) : (
              <Navigate
                to="/login"
                replace
                state={{ returnTo: `${location.pathname}${location.search}` }}
              />
            )
          }
        />
        <Route path="/decisions/:id/result" element={<DecisionResultsPage />} />
        <Route path="/decisions/:id" element={<DecisionWorkspacePage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
