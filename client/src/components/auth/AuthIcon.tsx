type AuthIconName = 'name' | 'email' | 'password' | 'eye' | 'eye-off'

function AuthIcon({ name }: { name: AuthIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'name' ? (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
        </>
      ) : null}
      {name === 'email' ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </>
      ) : null}
      {name === 'password' ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </>
      ) : null}
      {name === 'eye' || name === 'eye-off' ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {name === 'eye-off' ? <path d="m3 3 18 18" /> : null}
        </>
      ) : null}
    </svg>
  )
}

export default AuthIcon
