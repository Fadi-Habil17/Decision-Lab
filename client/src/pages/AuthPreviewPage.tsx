import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useDemoSession } from '../demo/session'

function AuthPreviewPage() {
  const { user, previewAsUser, logout, formScenario, setFormScenario } = useDemoSession()

  return (
    <section className="demo-preview" aria-labelledby="preview-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Development only</p>
          <h1 id="preview-title">Authentication preview</h1>
          <p className="page-description">
            Inspect local interface states. These controls do not authenticate anyone
            or send credentials. A page refresh resets all preview settings.
          </p>
        </div>
      </div>

      <div className="demo-preview-card">
        <h2>Header session</h2>
        <p role="status">Current preview: {user ? user.name : 'Guest'}</p>
        <div className="demo-preview-actions">
          <Button onClick={previewAsUser}>Preview as Hamid</Button>
          <Button onClick={logout} variant="secondary">Reset to guest</Button>
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="submission-outcome">Submission outcome</label>
          <select
            className="text-input"
            id="submission-outcome"
            value={formScenario}
            aria-describedby="outcome-help"
            onChange={(event) => {
              const value = event.target.value
              if (value === 'success' || value === 'error' || value === 'slow') {
                setFormScenario(value)
              }
            }}
          >
            <option value="success">Success after 0.7 seconds</option>
            <option value="error">Error after 0.7 seconds</option>
            <option value="slow">Slow success after 5 seconds</option>
          </select>
          <p className="field-hint" id="outcome-help">
            Open a form below and enter valid fields to see the chosen outcome.
            Invalid fields always show local validation errors first.
          </p>
        </div>

        <nav className="demo-preview-actions" aria-label="Preview destinations">
          <Link className="button button--primary" to="/login">Login form</Link>
          <Link className="button button--secondary" to="/register">Register form</Link>
          <Link className="button button--ghost" to="/decisions">Browse decisions</Link>
        </nav>
      </div>
    </section>
  )
}

export default AuthPreviewPage
