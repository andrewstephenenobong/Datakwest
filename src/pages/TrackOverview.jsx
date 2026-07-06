import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { ensureTrackProgress } from '../lib/trackProgress'

export default function TrackOverview() {
  const { skill } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [track, setTrack] = useState(null)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      let { data: trackRow } = await supabase
        .from('skill_tracks')
        .select('skill, title, description, phases')
        .eq('skill', skill)
        .maybeSingle()

      if (!trackRow) {
        const { data, error: fnError } = await supabase.functions.invoke('generate-skill-track', {
          body: { skill }
        })
        if (fnError || data?.error) {
          setError("We couldn't load this track right now. Please try again.")
          setLoading(false)
          return
        }
        trackRow = data.track
      }

      const progressRow = await ensureTrackProgress(user.id, skill)

      setTrack(trackRow)
      setProgress(progressRow)
      setLoading(false)
    }

    if (user) load()
  }, [user, skill])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: '#0A2342', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error || !track) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F7FA' }}>
        <p style={{ color: '#991B1B' }}>{error || 'Track not found.'}</p>
      </div>
    )
  }

  const lessonState = progress?.lesson_state || {}

  function phaseProgressCount(phase) {
    const titles = phase.topics.split('·').map(t => t.trim()).filter(Boolean)
    const completedCount = titles.filter((_, i) => lessonState[`${phase.number}-${i}`]?.completed).length
    return { completedCount, total: titles.length }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/tracks" className="text-sm font-semibold mb-6 inline-block" style={{ color: '#6B7A99' }}>
          ← Back to Tracks
        </Link>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0A2342' }}>{track.title}</h1>
        <p className="text-sm mb-8" style={{ color: '#6B7A99' }}>{track.description}</p>

        <div className="space-y-4">
          {track.phases?.map((phase) => {
            const { completedCount, total } = phaseProgressCount(phase)
            return (
              <button
                key={phase.number}
                onClick={() => navigate(`/tracks/${skill}/phase/${phase.number}`)}
                className="w-full text-left bg-white rounded-2xl p-6 transition-all"
                style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)' }}
              >
                <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold" style={{ color: '#D4AF37' }}>
                      {String(phase.number).padStart(2, '0')}
                    </span>
                    <h4 className="font-bold" style={{ color: '#0A2342' }}>{phase.title}</h4>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap" style={{ background: '#F5F7FA', color: '#6B7A99' }}>
                    {phase.weeks}
                  </span>
                </div>
                <p className="text-sm mb-2" style={{ color: '#6B7A99' }}>{phase.topics}</p>
                <p className="text-xs font-semibold" style={{ color: completedCount === total ? '#2E7D32' : '#6B7A99' }}>
                  {completedCount} / {total} lessons completed
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
