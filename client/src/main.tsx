import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import DemoSessionProvider from './demo/DemoSessionProvider'
import DecisionStoreProvider from './decisions/DecisionStoreProvider'
import './index.css'
import './styles/shell.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('The root element was not found in index.html.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <DemoSessionProvider>
        <DecisionStoreProvider>
          <App />
        </DecisionStoreProvider>
      </DemoSessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
