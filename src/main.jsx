import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

const rootElement = document.getElementById('root')

if (rootElement) {
  rootElement.innerHTML = '<div class="dk-boot-fallback" role="status"><strong>DataKwest</strong><span>Preparing your learning space…</span></div>'

  try {
    createRoot(rootElement).render(
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
  } catch (error) {
    console.error('DataKwest boot error:', error)
    rootElement.innerHTML = '<div class="dk-boot-fallback dk-boot-fallback-error" role="alert"><strong>DataKwest could not open</strong><span>Please refresh and try again.</span><button type="button" onclick="window.location.reload()">Refresh</button></div>'
  }
}

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
