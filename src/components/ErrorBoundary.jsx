import { Component } from 'react'
import RecoveryState from './RecoveryState'

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

  render() {
    if (!this.state.hasError) return this.props.children
    return <RecoveryState type="error" />
  }
}
