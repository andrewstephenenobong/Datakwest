import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getMyNotifications, markNotificationRead } from '../lib/notifications'

function notificationTitle(notification) {
  const titles = {
    mission_completed: 'Daily mission completed',
    project_reviewed: 'Project review updated',
    badge_awarded: 'New badge earned',
    tutor_follow_up: 'Tutor follow-up',
  }
  return titles[notification.notification_type] || 'DataKwest update'
}

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadNotifications() {
      const { notifications: rows, error: notificationsError } = await getMyNotifications(user.id)
      setNotifications(rows)
      setError(notificationsError?.message || '')
      setLoading(false)
    }

    if (user) loadNotifications()
  }, [user])

  async function handleRead(notificationId) {
    const { error: readError } = await markNotificationRead(notificationId)
    if (readError) {
      setError(readError.message)
      return
    }
    setNotifications(current => current.map(item => item.id === notificationId ? { ...item, read_at: item.read_at || new Date().toISOString() } : item))
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/dashboard" className="text-sm font-semibold" style={{ color: '#6B7A99' }}>← Back to dashboard</Link>
        <div className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D4AF37' }}>Stay on track</p>
          <h1 className="text-3xl font-bold mt-2" style={{ color: '#0A2342' }}>Notifications</h1>
          <p className="mt-2" style={{ color: '#6B7A99' }}>Important learning and review updates from your DataKwest journey.</p>
        </div>

        {error && <div className="rounded-xl p-4 mb-6" style={{ background: '#FEE2E2', color: '#991B1B' }} role="alert">{error}</div>}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <section className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}>
            <h2 className="text-lg font-bold" style={{ color: '#0A2342' }}>You are all caught up</h2>
            <p className="text-sm mt-2" style={{ color: '#6B7A99' }}>New mission, project, and learning updates will appear here.</p>
          </section>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article key={notification.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)', borderLeft: notification.read_at ? '4px solid #E2E8F0' : '4px solid #D4AF37' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold" style={{ color: '#0A2342' }}>{notificationTitle(notification)}</h2>
                    <p className="text-sm mt-2 leading-relaxed" style={{ color: '#6B7A99' }}>{notification.payload?.message || notification.payload?.description || 'You have a new update waiting in your learning journey.'}</p>
                    <time className="block text-xs mt-3" style={{ color: '#6B7A99' }} dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
                  </div>
                  {!notification.read_at && <button type="button" onClick={() => handleRead(notification.id)} className="text-xs font-bold whitespace-nowrap px-3 py-2 rounded-lg" style={{ background: '#0A2342', color: 'white' }}>Mark read</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
