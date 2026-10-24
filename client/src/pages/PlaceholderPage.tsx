interface PlaceholderPageProps {
  eyebrow: string
  title: string
  description: string
}

function PlaceholderPage({ eyebrow, title, description }: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        <span className="stage-chip">Stage 1 · Foundation</span>
      </div>

      <div className="placeholder-panel">
        <div className="placeholder-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <rect x="7" y="7" width="34" height="34" rx="10" stroke="currentColor" strokeWidth="2" />
            <path d="M16 18h16M16 24h10M16 30h13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2>This screen is being prepared</h2>
        <p>
          The route and shared layout are ready. The page features will be added in a later stage.
        </p>
      </div>
    </section>
  )
}

export default PlaceholderPage
