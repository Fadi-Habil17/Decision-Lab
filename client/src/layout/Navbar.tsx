import { Link, NavLink } from 'react-router-dom'
import Button from '../components/ui/Button'
import BrandLogo from '../components/ui/BrandLogo'
import { useAuth } from '../auth/session'

function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" to="/decisions" aria-label="DecisionLab home">
          <BrandLogo />
        </Link>

        <div className="header-links">
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
              <span className="nav-plus" aria-hidden="true">
                +
              </span>
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

          {user ? (
            <div className="account-session">
              <div className="account-profile">
                <span className="account-name">{user.name}</span>
              </div>
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <nav className="account-nav" aria-label="Account navigation">
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
                to="/login"
              >
                Login
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link nav-link--active' : 'nav-link'
                }
                to="/register"
              >
                Register
              </NavLink>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
