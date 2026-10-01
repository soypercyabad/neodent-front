import { cloneElement, useId, type ReactElement } from 'react'

interface ControlProps {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

interface FieldProps {
  label: string
  hint?: string
  error?: string | null
  children: ReactElement<ControlProps>
}

/**
 * Etiqueta + control + ayuda. Enlaza el `label` con el control y le anuncia el
 * mensaje de error, para que los lectores de pantalla lo lean junto al campo.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error ?? hint

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[0.92rem] font-bold text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {note && (
        <p id={noteId} className={error ? 'mt-1.5 text-[0.82rem] text-danger' : 'mt-1.5 text-[0.82rem] text-muted'}>
          {note}
        </p>
      )}
    </div>
  )
}
