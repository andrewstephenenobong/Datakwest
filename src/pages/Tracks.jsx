import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

const AVAILABLE_TRACKS = [
  {
    skill: 'python',
    emoji: '🐍',
    title: 'Python',
    description: 'From absolute basics to advanced, job-ready Python for data analysis.'
  }
]

export default function Tracks() {
  const navigate = useNavigate()
  const [loadingSkill, setLoadingSkill] = useState(null)
  const [error, setError] = useState('')

  async function openTrack(skill) {
    setLoadingSkill(skill)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-skill-track', {
        body: { skill }
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))

      navigate(`/tracks/${skill}`)
    } catch (err) {
      console.error('Skill track load error:', err)
      setError("We couldn't load this track right now. Please try again.")
    } finally {
      setLoadingSkill(null)
    }
  }

  return (
    <div className="tracks-page min-h-screen" style={{ background: '#F5F7FA' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0A2342' }}>Skill Tracks</h1>
        <p className="text-sm mb-8" style={{ color: '#6B7A99' }}>
          Go deeper on one skill, beginner to advanced — open to everyone, at your own pace, separate from your personalized roadmap.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>{error}</div>
        )}

        <div className="space-y-4">
          {AVAILABLE_TRACKS.map((track) => (
            <button
              key={track.skill}
              onClick={() => openTrack(track.skill)}
              disabled={loadingSkill === track.skill}
              className="w-full text-left bg-white rounded-2xl p-6 flex items-center gap-4 transition-all"
              style={{ boxShadow: '0 2px 12px rgba(10,35,66,0.06)', opacity: loadingSkill && loadingSkill !== track.skill ? 0.5 : 1 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: '#0A2342' }}>
                {track.emoji}
              </div>
              <div>
                <h3 className="font-bold" style={{ color: '#0A2342' }}>{track.title}</h3>
                <p className="text-sm" style={{ color: '#6B7A99' }}>
                  {loadingSkill === track.skill ? 'Preparing this track...' : track.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
