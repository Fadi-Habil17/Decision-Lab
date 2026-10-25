import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { simulateAuthPreview } from '../../demo/authPreview'
import { useDemoSession } from '../../demo/session'
import Button from '../ui/Button'
import TextInput from '../ui/TextInput'
import BrandLogo from '../ui/BrandLogo'
import AuthArtwork from './AuthArtwork'
import AuthIcon from './AuthIcon'
import '../../styles/auth.css'

interface AuthFormProps {
  mode: 'login' | 'register'
}

type Field = 'name' | 'email' | 'password'
type FieldErrors = Partial<Record<Field, string>>

const emptyValues = { name: '', email: '', password: '' }

function AuthForm({ mode }: AuthFormProps) {
  const location = useLocation()
  const requestedReturnTo = location.state?.returnTo
  const returnTo =
    typeof requestedReturnTo === 'string' &&
    /^\/decisions\/new(?:\?templateId=\d+)?$/.test(requestedReturnTo)
      ? requestedReturnTo
      : undefined
  const isRegister = mode === 'register'
  const headingId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const pendingRequest = useRef<AbortController | null>(null)
  const { formScenario } = useDemoSession()
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
        setShowPassword(false)
      }
      if (pendingRequest.current === controller) pendingRequest.current = null
    }
  }

  return (
    <section className="auth-page" aria-labelledby={headingId}>
      <div className="auth-card">
        <div className="auth-card-heading">
          <span className="auth-preview-label">
            {isRegister ? 'Join DecisionLab' : 'Welcome to DecisionLab'}
          </span>
          <h1 id={headingId}>
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p>
            {isRegister
              ? 'Start making clearer decisions today.'
              : 'Make your next decision with confidence.'}
          </p>
        </div>

        <form
          aria-busy={busy}
          aria-labelledby={headingId}
          className="auth-form"
          noValidate
          onSubmit={handleSubmit}
          ref={formRef}
        >
          {isRegister ? (
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <AuthIcon name="name" />
              </span>
              <TextInput
                autoComplete="name"
                disabled={busy}
                error={errors.name}
                label="Full name"
                name="name"
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Alex Smith"
                required
                value={values.name}
              />
            </div>
          ) : null}
          <div className="auth-input-wrap">
            <span className="auth-input-icon">
              <AuthIcon name="email" />
            </span>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              disabled={busy}
              error={errors.email}
              label="Email address"
              name="email"
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@domain.com"
              required
              spellCheck={false}
              type="email"
              value={values.email}
            />
          </div>
          <div className="auth-input-wrap auth-input-wrap--password">
            <span className="auth-input-icon">
              <AuthIcon name="password" />
            </span>
            <TextInput
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              disabled={busy}
              error={errors.password}
              label="Password"
              name="password"
              onChange={(event) => updateField('password', event.target.value)}
              required
              type={showPassword ? 'text' : 'password'}
              placeholder={
                isRegister ? 'Choose a password' : 'Enter your password'
              }
              value={values.password}
            />
            <button
              className="auth-password-toggle"
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              disabled={busy}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <AuthIcon name={showPassword ? 'eye-off' : 'eye'} />
            </button>
          </div>

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
            {busy ? (
              <span className="auth-button-spinner" aria-hidden="true" />
            ) : null}
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </Button>
        </form>

        <div className="auth-divider" aria-hidden="true">
          <span>or</span>
        </div>
        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to DecisionLab?'}{' '}
          <Link
            to={isRegister ? '/login' : '/register'}
            state={returnTo ? { returnTo } : undefined}
          >
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>
        <p className="auth-preview-note">
          Preview only. No account will be created and you will not be signed
          in.
        </p>
      </div>

      <div className="auth-intro">
        <svg
          className="auth-waves"
          viewBox="0 0 600 720"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M0 440C170 570 260 380 375 210S540 100 600 160V720H0Z"
            fill="#dce3ff"
            opacity=".65"
          />
          <path
            d="M0 485C170 600 290 370 420 290S550 240 600 260V720H0Z"
            fill="#b6c5ff"
            opacity=".7"
          />
          <path
            d="M0 560C140 620 270 420 400 350S560 315 600 350V720H0Z"
            fill="#a7b9ff"
            opacity=".45"
          />
          <path
            d="M0 630C170 510 310 760 470 630S570 620 600 600V720H0Z"
            fill="#dce4ff"
            opacity=".7"
          />
          <path
            d="M0 700C180 710 220 590 360 665S510 690 600 650V720H0Z"
            fill="#9aafff"
            opacity=".4"
          />
          <path
            d="M50 600C180 620 270 365 412 270S530 210 600 220"
            stroke="#96aeff"
            strokeDasharray="7 7"
            opacity=".65"
          />
          <g fill="#9eafff" stroke="#e6edff" strokeWidth="2">
            <circle cx="455" cy="184" r="8" />
            <circle cx="377" cy="309" r="11" />
            <circle cx="310" cy="388" r="7" />
            <circle cx="420" cy="682" r="11" />
          </g>
        </svg>
        <div className="auth-intro-content">
          <BrandLogo />
          <h2 className="auth-intro-title">
            {isRegister
              ? 'Better questions lead to better decisions.'
              : 'Turn options into clarity.'}
          </h2>
          <p className="auth-intro-description">
            {isRegister
              ? 'Bring your options together, weigh what matters, and move forward with confidence.'
              : 'Compare what matters, weigh your priorities, and see the bigger picture — all in one place.'}
          </p>
        </div>
        <AuthArtwork isRegister={isRegister} />
        <Link className="auth-browse-link" to="/decisions">
          Continue browsing decisions <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

export default AuthForm
