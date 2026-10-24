import type { ReactNode } from 'react'
import Navbar from './Navbar'

interface AppShellProps {
  children: ReactNode
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Navbar />

      <main id="main-content" className="main-content">
        <div className="page-container">{children}</div>
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span className="footer-brand">DecisionLab</span>
          <span>Make decisions with clarity.</span>
        </div>
      </footer>
    </div>
  )
}

export default AppShell
