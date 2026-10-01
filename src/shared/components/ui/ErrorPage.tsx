import { Link, useNavigate } from 'react-router-dom'

interface ErrorPageProps {
  code: '403' | '404' | '500'
  title: string
  description: string
  homePath?: string
}

export function ErrorPage({
  code,
  title,
  description,
  homePath = '/',
}: ErrorPageProps) {
  const navigate = useNavigate()

  const illustration =
    code === '500'
      ? '/illustrations/404.svg'
      : `/illustrations/${code}.svg`

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-6xl items-center justify-center py-8">

      <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-14">

        {/* Mensaje */}
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p
            aria-hidden="true"
            className="text-[clamp(5rem,14vw,10rem)] leading-none font-black tracking-tight text-brand"
          >
            {code}
          </p>

          <h1 className="mt-5 text-2xl font-bold text-ink sm:text-3xl">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[0.95rem] leading-7 text-ink-soft lg:mx-0">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              to={homePath}
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Volver al inicio
            </Link>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-control border border-line bg-surface px-6 py-3 text-sm font-bold text-ink-soft transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Página anterior
            </button>
          </div>
        </div>

        {/* Ilustración SVG */}
        <div className="order-1 flex items-center justify-center lg:order-2">
          <img
            src={illustration}
            alt=""
            aria-hidden="true"
            className="h-auto w-full max-w-[440px] object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>

      </div>
    </section>
  )
}