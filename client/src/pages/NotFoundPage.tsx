import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="not-found-page">
      <p className="eyebrow">Error 404</p>
      <h1>We couldn't find that page</h1>
      <p className="page-description">
        The link may be incorrect, or the page may have moved. Return to your decisions to continue.
      </p>
      <Link className="button button--primary not-found-action" to="/decisions">
        Back to Decisions
      </Link>
    </section>
  )
}

export default NotFoundPage
