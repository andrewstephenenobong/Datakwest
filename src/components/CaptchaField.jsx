import { useRef, useState } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'

const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY

export default function CaptchaField({ onToken }) {
  const captchaRef = useRef(null)
  const [status, setStatus] = useState('')

  if (!siteKey) {
    return (
      <div role="status" className="rounded-xl border px-4 py-3 text-xs leading-5" style={{ borderColor: '#F0D58A', background: '#FFF9E8', color: '#7A5D10' }}>
        CAPTCHA is not configured in this environment yet. Add <code>VITE_HCAPTCHA_SITE_KEY</code> before testing password authentication.
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: '#DCE5F0', background: '#F8FBFF' }}>
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
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
      <p className="mt-2 text-xs" style={{ color: status.includes('could not') ? '#9C3F31' : '#8290A5' }} role="status">{status || 'Complete the security check before continuing.'}</p>
    </div>
  )
}
