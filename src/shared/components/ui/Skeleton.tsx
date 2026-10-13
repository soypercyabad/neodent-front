import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rounded' | 'rectangular'
  width?: string | number
  height?: string | number
}

/**
 * Componente Skeleton base para estados de carga tipo "shimmer".
 * Utiliza tonos suaves y luminosos con brillo translúcido para evitar el efecto "plomo/tosco".
 */
export function Skeleton({
  variant = 'rounded',
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-3.5 w-full rounded-md',
    circular: 'rounded-full shrink-0',
    rounded: 'rounded-xl',
    rectangular: 'rounded-none',
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      className={cn(
        'relative overflow-hidden bg-slate-100/90 dark:bg-slate-800/40',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}

export interface TableSkeletonProps {
  rows?: number
  cols?: number
  colWidths?: (string | number)[]
}

/**
 * Filas de Skeleton genéricas para colocar dentro del <tbody> de una tabla.
 */
export function TableSkeletonRows({
  rows = 5,
  cols = 5,
  colWidths = [],
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="hover:bg-transparent">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-5 py-4">
              <Skeleton
                className="h-3.5 rounded-full"
                width={colWidths[cIdx] || (cIdx === cols - 1 ? '60%' : cIdx === 0 ? '70%' : '85%')}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/**
 * Skeleton especializado para tablas de citas (simula código, paciente con avatar, especialista, fecha, badge y acción).
 */
export function AppointmentsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="hover:bg-transparent">
          {/* Referencia */}
          <td className="px-4 py-3.5">
            <Skeleton className="h-6 w-16 rounded-md" />
          </td>

          {/* Paciente con Avatar y Servicio */}
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="size-9 shrink-0" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="mt-1 h-3 w-24 rounded-full opacity-70" />
              </div>
            </div>
          </td>

          {/* Especialista */}
          <td className="px-4 py-3.5">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="mt-1 h-3 w-20 rounded-full opacity-70" />
          </td>

          {/* Fecha y hora */}
          <td className="px-4 py-3.5">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-20 rounded-full" />
              <Skeleton className="h-3 w-14 rounded-full opacity-70" />
            </div>
          </td>

          {/* Estado (badge) */}
          <td className="px-4 py-3.5 text-center">
            <Skeleton className="mx-auto h-5 w-20 rounded-full" />
          </td>

          {/* Acción (RowActions / Kebab) */}
          <td className="px-4 py-3.5 text-center">
            <Skeleton className="mx-auto size-7 rounded-lg" />
          </td>
        </tr>
      ))}
    </>
  )
}

/**
 * Skeleton para tarjetas de Servicios Odontológicos.
 */
export function ServicesCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid items-start gap-3 bg-alt/40 p-3 sm:p-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="min-w-0 rounded-xl border border-line border-l-[3px] border-l-brand/40 bg-surface p-3 shadow-sm sm:p-4"
        >
          {/* Encabezado: Icono + Título/Especialidad + Badge */}
          <div className="flex items-start gap-3">
            <Skeleton variant="rounded" className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="mt-1.5 h-3 w-24 rounded-full opacity-70" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Descripción */}
          <div className="mt-2.5 space-y-1">
            <Skeleton className="h-3 w-full rounded-full opacity-60" />
            <Skeleton className="h-3 w-3/4 rounded-full opacity-60" />
          </div>

          {/* Duración y Precio */}
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>

          {/* Sedes */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <Skeleton className="h-3 w-10 rounded-full opacity-50" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          {/* Botones de acción */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-line/60 pt-3">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para filas de Especialidades.
 */
export function EspecialidadesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 bg-alt/40 p-3 sm:p-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-line bg-surface p-3 shadow-sm sm:px-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Icono + Nombre + Descripción */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Skeleton variant="rounded" className="size-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-36 rounded-full" />
                <Skeleton className="mt-1.5 h-3 w-56 rounded-full opacity-70" />
              </div>
            </div>

            {/* Badge de estado + Botones */}
            <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-line pt-3 sm:w-auto sm:justify-end sm:border-0 sm:pt-0">
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para tarjetas de Sedes.
 */
export function SedesCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 bg-alt/40 p-3 sm:p-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex min-w-0 flex-col justify-between rounded-xl border border-line border-l-[3px] border-l-brand/40 bg-surface p-4 shadow-sm"
        >
          <div>
            {/* Icono + Nombre y Dirección + Badge */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Skeleton variant="rounded" className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="mt-1.5 h-3 w-48 rounded-full opacity-70" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Ubicación y Teléfono */}
            <div className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <Skeleton className="h-3 w-36 rounded-full opacity-70" />
              <Skeleton className="h-3 w-28 rounded-full opacity-70" />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-line/60 pt-3">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para la tabla de Usuarios.
 */
export function UsersTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="hover:bg-transparent">
          {/* Avatar + Nombre y Especialidad */}
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="size-11" />
              <div>
                <Skeleton className="h-4 w-36 rounded-full" />
                <Skeleton className="mt-1.5 h-3 w-24 rounded-full opacity-70" />
              </div>
            </div>
          </td>

          {/* Documento y contacto */}
          <td className="px-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28 rounded-full" />
              <Skeleton className="h-3 w-40 rounded-full opacity-70" />
            </div>
          </td>

          {/* Rol */}
          <td className="px-4 py-4">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>

          {/* Especialidades */}
          <td className="px-4 py-4">
            <Skeleton className="h-6 w-28 rounded-full opacity-70" />
          </td>

          {/* Estado */}
          <td className="px-4 py-4 text-center">
            <Skeleton className="mx-auto h-5 w-20 rounded-full" />
          </td>

          {/* Acciones (KebabMenu) */}
          <td className="px-4 py-4 text-right">
            <Skeleton variant="circular" className="ml-auto size-8" />
          </td>
        </tr>
      ))}
    </>
  )
}

/**
 * Skeleton para la tabla de Pacientes.
 */
export function PatientsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="hover:bg-transparent">
          {/* Avatar + Nombre y Documento */}
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="size-9 shrink-0" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-36 rounded-full" />
                <Skeleton className="mt-1 h-3 w-28 rounded-full opacity-70" />
              </div>
            </div>
          </td>

          {/* Contacto (Email + Teléfono) */}
          <td className="px-4 py-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="size-3.5 shrink-0" />
                <Skeleton className="h-3 w-36 rounded-full opacity-80" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="size-3.5 shrink-0" />
                <Skeleton className="h-3 w-24 rounded-full opacity-70" />
              </div>
            </div>
          </td>

          {/* Cuenta (Badge) */}
          <td className="px-4 py-4 text-center">
            <Skeleton className="mx-auto h-5 w-20 rounded-full" />
          </td>

          {/* Estado (Badge) */}
          <td className="px-4 py-4 text-center">
            <Skeleton className="mx-auto h-5 w-16 rounded-full" />
          </td>

          {/* Acciones */}
          <td className="px-4 py-4 text-center">
            <Skeleton className="mx-auto h-8 w-20 rounded-lg" />
          </td>
        </tr>
      ))}
    </>
  )
}

/**
 * Skeleton para la tabla de Roles.
 */
export function RolesTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="hover:bg-transparent">
          {/* Nombre de Rol */}
          <td className="px-4 py-4">
            <Skeleton className="h-4 w-28 rounded-full" />
          </td>

          {/* Descripción */}
          <td className="px-4 py-4">
            <Skeleton className="h-3.5 w-72 max-w-full rounded-full opacity-80" />
          </td>

          {/* Módulos */}
          <td className="px-4 py-4">
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          </td>

          {/* Tipo (Badge) */}
          <td className="px-4 py-4 text-center">
            <Skeleton className="mx-auto h-5 w-20 rounded-full" />
          </td>

          {/* Estado (Badge) */}
          <td className="px-4 py-4 text-center">
            <Skeleton className="mx-auto h-5 w-16 rounded-full" />
          </td>

          {/* Acciones */}
          <td className="px-4 py-4 text-center">
            <Skeleton className="mx-auto h-8 w-20 rounded-lg" />
          </td>
        </tr>
      ))}
    </>
  )
}

/**
 * Skeleton para tarjetas de Tipos de Bloqueo de Agenda.
 */
export function BlockTypesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 bg-alt/40 p-3 sm:p-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex min-w-0 flex-col justify-between rounded-xl border border-l-[3px] border-line border-l-brand/40 bg-surface p-4 shadow-sm"
        >
          <div>
            <div className="flex items-start gap-3">
              <Skeleton variant="rounded" className="size-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-36 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-3 w-4/5 rounded-full opacity-70" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-line/60 pt-3">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para bloqueos de Agenda.
 */
export function ScheduleBlocksSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="mt-3 h-5 w-44 rounded-full" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
          <div className="mt-4">
            <Skeleton className="h-3 w-3/4 rounded-full opacity-70" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton completo para el Panel de Control / Dashboard.
 * Muestra los 4 KPIs principales, 3 gráficos analíticos y tablas de distribución.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 4 KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="size-10 rounded-xl" />
            </div>
            <Skeleton className="mt-4 h-8 w-28 rounded-lg" />
            <Skeleton className="mt-2.5 h-3.5 w-36 rounded-md opacity-70" />
          </div>
        ))}
      </div>

      {/* 3 Gráficos Analíticos */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col justify-between h-80">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-3.5 w-48 rounded-md opacity-60" />
            </div>
            <div className="mt-4 flex items-end gap-2 h-44 w-full pt-4">
              <Skeleton className="h-2/3 flex-1 rounded-t-lg" />
              <Skeleton className="h-full flex-1 rounded-t-lg" />
              <Skeleton className="h-1/2 flex-1 rounded-t-lg" />
              <Skeleton className="h-4/5 flex-1 rounded-t-lg" />
              <Skeleton className="h-3/4 flex-1 rounded-t-lg" />
              <Skeleton className="h-1/3 flex-1 rounded-t-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Tablas / Listas de distribución inferior */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="mt-2 h-3.5 w-52 rounded-md opacity-60" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-line/50">
                <div className="flex items-center gap-2.5 flex-1">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="mt-2 h-3.5 w-56 rounded-md opacity-60" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-line/50">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-full" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Componente interactivo para secciones cargando de manera compacta pero atractiva.
 */
export function LoadingBlock({
  message = 'Cargando información…',
  submessage,
  className,
}: {
  message?: string
  submessage?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 rounded-2xl border border-line bg-surface shadow-xs text-center', className)}>
      <div className="relative mb-3.5">
        <div className="size-10 rounded-full border-3 border-brand/20 border-t-brand animate-spin" />
        <div className="absolute inset-0 size-10 rounded-full bg-brand/5 blur-sm -z-10 animate-pulse" />
      </div>
      <p className="text-sm font-semibold text-ink">{message}</p>
      {submessage && <p className="text-xs text-muted mt-1">{submessage}</p>}
    </div>
  )
}

/**
 * Skeleton para el Dashboard del Paciente.
 */
export function PatientDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Próxima cita destacada placeholder */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-6 w-64 rounded-lg" />
            <div className="flex flex-wrap gap-4 pt-1">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-4 shadow-xs">
              <Skeleton className="size-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido inferior: Citas y recordatorios */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-4">
          <Skeleton className="h-5 w-40 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-line/60">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md opacity-60" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-3">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl opacity-70" />
        </div>
      </div>
    </div>
  )
}


