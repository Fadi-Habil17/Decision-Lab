import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './layout/AppShell'
import NotFoundPage from './pages/NotFoundPage'
import PlaceholderPage from './pages/PlaceholderPage'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/decisions" replace />} />
        <Route
          path="/decisions"
          element={
            <PlaceholderPage
              eyebrow="Decision library"
              title="Your decisions"
              description="Create a decision, compare your options, and keep track of the choices that matter."
            />
          }
        />
        <Route
          path="/decisions/new"
          element={
            <PlaceholderPage
              eyebrow="Start here"
              title="Create a decision"
              description="Start with a blank decision or use a template to organize your criteria."
            />
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
