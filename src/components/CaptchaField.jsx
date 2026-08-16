import { useEffect, useRef, useState } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY

export default function CaptchaField({ onToken }) {
  const captchaRef = useRef(null)
  const [status, setStatus] = useState('')
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 379px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  if (!siteKey) {
    return (
      <div role="status" className="auth-captcha rounded-xl border px-4 py-3 text-xs leading-5">
        CAPTCHA is not configured in this environment yet. Add <code>VITE_HCAPTCHA_SITE_KEY</code> before testing password authentication.
      </div>
    )
  }

  return (
    <div className="auth-captcha min-w-0 max-w-full overflow-hidden rounded-xl border p-3">
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
        size={compact ? 'compact' : 'normal'}
        onVerify={(token) => {
          setStatus('Verification complete.')
          onToken(token)
        }}
        onExpire={() => {
          setStatus('Verification expired. Please complete it again.')
          onToken('')
        }}
        onError={() => {
          setStatus('CAPTCHA could not load. Check your connection and try again.')
          onToken('')
        }}
      />
      <p className={`auth-captcha-status mt-2 text-xs ${status.includes('could not') ? 'auth-error-text' : ''}`} role="status">
        {status || 'Complete the security check before continuing.'}
      </p>
    </div>
  )
}
