import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Application render error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F5F7FA' }}>
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center" style={{ boxShadow: '0 8px 32px rgba(10,35,66,0.1)' }}>
          <h1 className="text-xl font-bold" style={{ color: '#0A2342' }}>Something went wrong</h1>
          <p className="mt-2 text-sm" style={{ color: '#6B7A99' }}>
            DataKwest could not finish loading this page. Refresh and try again.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 rounded-xl px-6 py-3 text-sm font-bold"
            style={{ background: '#D4AF37', color: '#0A2342' }}
          >
            Refresh page
          </button>
        </section>
      </main>
    )
  }
}
