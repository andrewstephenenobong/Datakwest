import { useState } from 'react'

export default function PasswordField({ id, label = 'Password', value, onChange, placeholder = 'Enter your password', autoComplete = 'current-password', hint, showRequirements = false }) {
  const [visible, setVisible] = useState(false)
  const requirements = [{ label: 'At least 8 characters', valid: value.length >= 8 }, { label: 'One uppercase letter', valid: /[A-Z]/.test(value) }, { label: 'One lowercase letter', valid: /[a-z]/.test(value) }, { label: 'One number', valid: /\d/.test(value) }]
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <label htmlFor={id} className="text-sm font-bold" style={{ color: 'var(--auth-ink)' }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: 'var(--auth-subtle)' }}>{hint}</span>}
      </div>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required className="w-full rounded-xl border-2 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:ring-4" style={{ borderColor: 'var(--auth-border)', color: 'var(--auth-ink)', background: 'var(--auth-input)', '--tw-ring-color': 'rgba(212,175,55,0.2)' }} />
        <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-2 text-xs font-bold" style={{ color: 'var(--auth-link)' }} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? 'Hide' : 'Show'}</button>
      </div>
      {showRequirements && <div className="mt-3 grid gap-1.5 sm:grid-cols-2" aria-live="polite">{requirements.map((item) => <p key={item.label} className={`password-requirement text-xs font-semibold ${item.valid ? 'is-valid' : 'is-pending'}`}><span aria-hidden="true">{item.valid ? '✓' : '○'}</span> <span>{item.label}</span></p>)}</div>}
    </div>
  )
}
