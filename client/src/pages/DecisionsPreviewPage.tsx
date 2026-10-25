import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useLocalDecisions } from '../decisions/store'
import { useDemoSession } from '../demo/session'

function DecisionsPreviewPage() {
  const {
    items,
    scenario,
    setScenario,
    creationScenario,
    templateScenario,
    setCreationScenario,
    setTemplateScenario,
  } = useLocalDecisions()
  const { user, previewAsUser, logout } = useDemoSession()
  return (
    <section className="demo-preview">
      <p className="eyebrow">Development only</p>
      <h1>Decisions preview</h1>
      <div className="demo-preview-card">
        <p role="status">Current preview: {user?.name ?? 'Guest'}</p>
        <div className="demo-preview-actions">
          <Button onClick={previewAsUser}>Preview as Hamid</Button>
          <Button onClick={logout} variant="secondary">
            Reset to guest
          </Button>
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="list-scenario">
            List scenario
          </label>
          <select
            className="text-input"
            id="list-scenario"
            value={scenario}
            onChange={(event) => {
              const value = event.target.value
              if (
                value === 'ready' ||
                value === 'loading' ||
                value === 'error' ||
                value === 'empty'
              )
                setScenario(value)
            }}
          >
            <option value="ready">Ready</option>
            <option value="loading">Loading</option>
            <option value="error">Error</option>
            <option value="empty">Empty</option>
          </select>
          <p className="field-hint">
            Loading stays visible until you select another scenario. Retry
            clears the error scenario. Empty hides the data without deleting it.
          </p>
        </div>
        <nav className="demo-preview-actions" aria-label="Preview destinations">
          <Link className="button button--primary" to="/decisions/new">
            New decision form
          </Link>
          <Link className="button button--primary" to="/decisions">
            Open decisions
          </Link>
          <Link className="button button--secondary" to="/__preview/auth">
            Authentication preview
          </Link>
        </nav>
        <div className="form-field">
          <label className="field-label" htmlFor="creation-outcome">
            Creation outcome
          </label>
          <select
            className="text-input"
            id="creation-outcome"
            value={creationScenario}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'success' || value === 'error' || value === 'slow')
                setCreationScenario(value)
            }}
          >
            <option value="success">Success after 0.7 seconds</option>
            <option value="error">Error once, then allow retry</option>
            <option value="slow">Slow success after 5 seconds</option>
          </select>
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="template-outcome">
            Template loading
          </label>
          <select
            className="text-input"
            id="template-outcome"
            value={templateScenario}
            onChange={(event) => {
              const value = event.target.value
              if (value === 'success' || value === 'error')
                setTemplateScenario(value)
            }}
          >
            <option value="success">Success after 0.4 seconds</option>
            <option value="error">Error until Retry</option>
          </select>
        </div>
        <details>
          <summary>Inspect local decisions</summary>
          <pre className="decision-debug-snapshot">
            {JSON.stringify(items, null, 2)}
          </pre>
        </details>
      </div>
    </section>
  )
}

export default DecisionsPreviewPage
