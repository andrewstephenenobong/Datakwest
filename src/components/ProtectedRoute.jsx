import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OwlLoading from './OwlLoading'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <OwlLoading message="Restoring your learner profile…" />

  return user ? children : <Navigate to="/login" replace />
}
