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
 * Skeleton especializado para tablas de citas (simula códigos, nombres con subtítulo, fecha, badge y botón).
 */
export function AppointmentsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="hover:bg-transparent">
          {/* Referencia */}
          <td className="px-5 py-4">
            <Skeleton className="h-4 w-20 rounded-md" />
          </td>

          {/* Paciente y Servicio */}
          <td className="px-5 py-4">
            <Skeleton className="h-3.5 w-36 rounded-full" />
            <Skeleton className="mt-1.5 h-2.5 w-24 rounded-full opacity-70" />
          </td>

          {/* Especialista */}
          <td className="px-5 py-4">
            <Skeleton className="h-3.5 w-28 rounded-full" />
          </td>

          {/* Fecha y hora */}
          <td className="px-5 py-4">
            <Skeleton className="h-3.5 w-24 rounded-full" />
            <Skeleton className="mt-1.5 h-2.5 w-16 rounded-full opacity-70" />
          </td>

          {/* Estado (badge) */}
          <td className="px-5 py-4">
            <Skeleton className="h-5 w-24 rounded-full" />
          </td>

          {/* Acción (botón) */}
          <td className="px-5 py-4 text-right">
            <Skeleton className="ml-auto h-8 w-24 rounded-xl" />
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

          {/* Rol */}
          <td className="px-4 py-4">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>

          {/* Correo */}
          <td className="px-4 py-4">
            <Skeleton className="h-3.5 w-44 rounded-full opacity-80" />
          </td>

          {/* Estado */}
          <td className="px-4 py-4">
            <Skeleton className="h-5 w-20 rounded-full" />
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
          {/* Avatar + Nombre y Código */}
          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="size-11 shrink-0" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-36 rounded-full" />
                <Skeleton className="mt-1.5 h-3 w-20 rounded-full opacity-70" />
              </div>
            </div>
          </td>

          {/* Documento */}
          <td className="px-4 py-4">
            <Skeleton className="h-3.5 w-12 rounded-full" />
            <Skeleton className="mt-1.5 h-3 w-24 rounded-full opacity-70" />
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

