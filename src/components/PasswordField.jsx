import { useState } from 'react'

export default function PasswordField({ id, label = 'Password', value, onChange, placeholder = 'Enter your password', autoComplete = 'current-password', hint }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label htmlFor={id} className="text-sm font-bold" style={{ color: '#0A2342' }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: '#8290A5' }}>{hint}</span>}
      </div>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required className="w-full rounded-xl border-2 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:ring-4" style={{ borderColor: '#DCE5F0', color: '#0A2342', '--tw-ring-color': 'rgba(212,175,55,0.16)' }} />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-2 text-xs font-bold" style={{ color: '#2456A6' }} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button>
      </div>
    </div>
  )
}
