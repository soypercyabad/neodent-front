import { useEffect, useState, type ReactNode } from 'react'
import { apiBlob } from '@/shared/api/apiClient'
import { cn } from '@/shared/lib/cn'

interface ProtectedImageProps {
  path?: string | null
  accessToken?: string | null
  alt: string
  className?: string
  fallback?: ReactNode
}

export function ProtectedImage({
  path,
  accessToken,
  alt,
  className,
  fallback = null,
}: ProtectedImageProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!path || !accessToken) {
      setSrc(null)
      return
    }

    let activo = true
    let url: string | null = null

    apiBlob(path, accessToken)
      .then(blob => {
        if (!activo) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {
        if (activo) setSrc(null)
      })

    return () => {
      activo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [path, accessToken])

  if (!src) return <>{fallback}</>

  return (
    <img
      src={src}
      alt={alt}
      className={cn('object-cover', className)}
    />
  )
}