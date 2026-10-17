import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" to="/decisions" aria-label="DecisionLab home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <rect x="3" y="3" width="11" height="11" rx="3" fill="currentColor" />
              <rect x="18" y="3" width="11" height="11" rx="3" fill="currentColor" opacity=".55" />
              <rect x="3" y="18" width="11" height="11" rx="3" fill="currentColor" opacity=".55" />
              <path d="M18 23.5 22 27l7-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="brand-copy">
            <span className="brand-name">DecisionLab</span>
            <span className="brand-tagline">Think it through.</span>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Main navigation">
          <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
            end
            to="/decisions"
          >
            Decisions
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive
                ? 'nav-link nav-link--create nav-link--active'
                : 'nav-link nav-link--create'
            }
            to="/decisions/new"
          >
            <span className="nav-plus" aria-hidden="true">+</span>
            New Decision
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
            to="/templates"
          >
            Templates
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Navbar
