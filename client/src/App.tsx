import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoadingState from './components/ui/LoadingState'
import { useDemoSession } from './demo/session'
import AppShell from './layout/AppShell'
import DecisionsPage from './pages/DecisionsPage'
import LoginPage from './pages/LoginPage'
import NewDecisionPage from './pages/NewDecisionPage'
import NotFoundPage from './pages/NotFoundPage'
import PlaceholderPage from './pages/PlaceholderPage'
import RegisterPage from './pages/RegisterPage'

const AuthPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./pages/AuthPreviewPage'))
  : null

const DecisionsPreviewPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DecisionsPreviewPage'))
  : null

function App() {
  const { user } = useDemoSession()
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
                state={{ returnTo: '/decisions/new' }}
              />
            )
          }
        />
        <Route
          path="/decisions/:id/result"
          element={
            <PlaceholderPage
              eyebrow="Decision results"
              title="Results"
              description="The ranked options and explanations will appear here after the decision is calculated by the backend."
            />
          }
        />
        <Route
          path="/decisions/:id"
          element={
            <PlaceholderPage
              eyebrow="Decision workspace"
              title="Build your decision"
              description="Add options, define weighted criteria, and score each option in the workspace."
            />
          }
        />
        <Route
          path="/templates"
          element={
            <PlaceholderPage
              eyebrow="Get a head start"
              title="Decision templates"
              description="Browse reusable starting points for common decisions."
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
