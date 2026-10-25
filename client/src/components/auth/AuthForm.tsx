import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { simulateAuthPreview } from '../../demo/authPreview'
import { useDemoSession } from '../../demo/session'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import '../../styles/auth.css'

interface AuthFormProps {
  mode: 'login' | 'register'
}

type Field = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

const emptyValues = { name: '', email: '', password: '' }

function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === 'register'
  const headingId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const pendingRequest = useRef<AbortController | null>(null)
  const { formScenario } = useDemoSession()
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    return () => {
      pendingRequest.current?.abort()
      pendingRequest.current = null
    }
  }, [])

  function updateField(field: Field, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setFeedback('idle')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // The ref also blocks two submissions before React renders disabled inputs.
    if (pendingRequest.current) return

    const nextErrors: FieldErrors = {}

    if (isRegister && !values.name.trim()) {
      nextErrors.name = 'Enter your name.'
    }

    if (!values.email.trim()) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!values.password) {
      nextErrors.password = 'Enter your password.'
    }

    setErrors(nextErrors)
    setFeedback('idle')

    const firstInvalidField = (['name', 'email', 'password'] as const).find(
      (field) => nextErrors[field],
    )

    if (firstInvalidField) {
      const input = formRef.current?.elements.namedItem(firstInvalidField)
      if (input instanceof HTMLInputElement) input.focus()
      return
    }

    const controller = new AbortController()
    pendingRequest.current = controller
    setBusy(true)

    try {
      // Form values are never passed to the simulation or used as credentials.
      await simulateAuthPreview(formScenario, controller.signal)
      if (!controller.signal.aborted) setFeedback('success')
    } catch {
      if (!controller.signal.aborted) setFeedback('error')
    } finally {
      if (!controller.signal.aborted) {
        setValues((previous) => ({ ...previous, password: '' }))
        setBusy(false)
      }
      if (pendingRequest.current === controller) pendingRequest.current = null
    }
  }

  return (
    <section className="auth-page" aria-labelledby={headingId}>
      <div className="auth-card">
        <div className="auth-card-heading">
          <span className="auth-preview-label">Interactive preview</span>
          <h1 id={headingId}>{isRegister ? 'Register' : 'Login'}</h1>
          <p>
            {isRegister
              ? 'Explore the account creation experience.'
              : 'Explore the sign-in experience.'}
          </p>
        </div>

        <p className="auth-preview-note">
          This is a preview only. No account will be created and you will not
          be signed in. You can browse without an account.
        </p>

        <form
          aria-busy={busy}
          aria-labelledby={headingId}
          className="auth-form"
          noValidate
          onSubmit={handleSubmit}
          ref={formRef}
        >
          {isRegister ? (
            <TextInput
              autoComplete="name"
              disabled={busy}
              error={errors.name}
              label="Name"
              name="name"
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Your name"
              required
              value={values.name}
            />
          ) : null}
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            disabled={busy}
            error={errors.email}
            label="Email"
            name="email"
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="you@example.com"
            required
            spellCheck={false}
            type="email"
            value={values.email}
          />
          <TextInput
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            disabled={busy}
            error={errors.password}
            label="Password"
            name="password"
            onChange={(event) => updateField('password', event.target.value)}
            required
            type="password"
            value={values.password}
          />

          {feedback === 'error' ? (
            <p className="auth-feedback auth-feedback--error" role="alert">
              This preview could not be completed. No account changes were made.
              Enter your password again and retry.
            </p>
          ) : null}
          <p
            aria-atomic="true"
            className={`auth-feedback${feedback === 'success' ? ' auth-feedback--success' : ''}`}
            role="status"
          >
            {busy
              ? 'Running the preview. Please wait…'
              : feedback === 'success'
                ? 'Preview complete. No account was created and no sign-in occurred.'
                : ''}
          </p>

          <Button disabled={busy} fullWidth type="submit">
            {busy ? <span className="auth-button-spinner" aria-hidden="true" /> : null}
            {busy ? 'Please wait…' : isRegister ? 'Register' : 'Login'}
          </Button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to DecisionLab?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Login' : 'Register'}
          </Link>
        </p>
      </div>

      <div className="auth-intro">
        <p className="eyebrow">Make room for a better decision</p>
        <h2 className="auth-intro-title">A little clarity goes a long way.</h2>
        <p className="auth-intro-description">
          Put your options side by side, focus on what matters, and understand
          the choices ahead of you.
        </p>
        <div className="auth-steps" aria-label="How DecisionLab works">
          <div className="auth-step">
            <span className="auth-step-number" aria-hidden="true">01</span>
            <div><h3>Explore your options</h3><p>Start with the choices on your mind.</p></div>
          </div>
          <div className="auth-step">
            <span className="auth-step-number" aria-hidden="true">02</span>
            <div><h3>Weigh what matters</h3><p>Give your priorities a clear place.</p></div>
          </div>
          <div className="auth-step">
            <span className="auth-step-number" aria-hidden="true">03</span>
            <div><h3>See the bigger picture</h3><p>Understand the reasons behind a result.</p></div>
          </div>
        </div>
        <Link className="auth-browse-link" to="/decisions">
          Continue browsing decisions <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

export default AuthForm
