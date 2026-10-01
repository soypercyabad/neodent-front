import { Turnstile } from '@marsidev/react-turnstile'

interface SecurityVerificationProps {
  onToken: (token: string | null) => void
  resetKey: number
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export function SecurityVerification({
  onToken,
  resetKey,
}: SecurityVerificationProps) {
  if (!SITE_KEY) {
    return (
      <p role="alert" className="text-sm text-danger">
        No está configurada la verificación de seguridad.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Turnstile
        key={resetKey}
        siteKey={SITE_KEY}
        options={{
          theme: 'light',
          size: 'normal',
        }}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />

      <p className="text-center text-xs text-muted">
        Verificación de seguridad de Cloudflare.
      </p>
    </div>
  )
}