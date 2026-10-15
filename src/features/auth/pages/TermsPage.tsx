import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_URL } from '@/shared/api/config'
import { Icon } from '@/shared/components/ui'
import { NotFoundPage } from '@/app/pages/NotFoundPage'

export function TermsPage() {
  const { filename } = useParams<{ filename: string }>()

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [is404, setIs404] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filename) {
      setIs404(true)
      setLoading(false)
      return
    }

    document.title = `${filename} - NeoDent`

    let objetoUrl: string | null = null
    let activo = true

    const cargarPdf = async () => {
      setLoading(true)
      setError(null)
      setIs404(false)

      try {
        const endpoint = `${API_URL}/api/terminos-condiciones/archivo/${encodeURIComponent(filename)}`
        const res = await fetch(endpoint)

        if (res.status === 404) {
          if (activo) {
            setIs404(true)
            setLoading(false)
          }
          return
        }

        if (!res.ok) {
          throw new Error('No se pudo cargar el documento de términos y condiciones.')
        }

        const blob = await res.blob()
        if (!activo) return

        objetoUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        setPdfUrl(objetoUrl)
      } catch (err) {
        if (!activo) return
        setError(err instanceof Error ? err.message : 'Error al cargar el documento.')
      } finally {
        if (activo) setLoading(false)
      }
    }

    cargarPdf()

    return () => {
      activo = false
      if (objetoUrl) {
        URL.revokeObjectURL(objetoUrl)
      }
    }
  }, [filename])

  if (is404 || !filename) {
    return <NotFoundPage />
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-slate-900 text-white">
        <Icon name="spinner" size={34} className="animate-spin text-brand" />
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-200">
          Cargando documento oficial...
        </p>
      </div>
    )
  }

  if (error || !pdfUrl) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
        <div className="grid size-14 place-items-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
          <Icon name="xCircle" size={28} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-100">
          No se pudo visualizar el documento
        </h2>
        <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-400">
          {error || 'El archivo solicitado no está disponible en este momento.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 transition cursor-pointer"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-brand text-white hover:bg-brand-dark transition inline-flex items-center cursor-pointer"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 h-screen w-screen overflow-hidden bg-slate-900">
      <iframe
        src={`${pdfUrl}#toolbar=1&navpanes=0`}
        className="h-full w-full border-0"
        title={filename}
      />
    </div>
  )
}
