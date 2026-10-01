import { useEffect, type RefObject } from 'react'

/** Llama a `onOutside` cuando se hace clic fuera del elemento referenciado. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    const handle = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [ref, onOutside, enabled])
}
