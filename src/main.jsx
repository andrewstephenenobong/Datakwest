import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const checkForServiceWorkerUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await registration.update()
    } catch {
      // Offline support is progressive enhancement; the app remains usable online.
    }
  }

  window.addEventListener('load', checkForServiceWorkerUpdate)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForServiceWorkerUpdate()
  })
}
