import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}>
      <div className="w-8 h-8 rounded-full border-4 animate-spin"
        style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
    </div>
  )

  return user ? children : <Navigate to="/login" replace />
}
