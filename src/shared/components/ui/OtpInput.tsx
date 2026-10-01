import {
  useRef,
  useEffect,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from 'react'
import { cn } from '@/shared/lib/cn'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  autoFocus?: boolean
  disabled?: boolean
  isError?: boolean
  onComplete?: (code: string) => void
  className?: string
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  disabled = false,
  isError = false,
  onComplete,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus()
    }
  }, [autoFocus])

  const digits = Array.from({ length }, (_, i) => value[i] || '')

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const rawVal = e.target.value.replace(/\D/g, '')
    if (!rawVal) {
      const newDigits = [...digits]
      newDigits[index] = ''
      onChange(newDigits.join(''))
      return
    }

    const char = rawVal.slice(-1)
    const newDigits = [...digits]
    newDigits[index] = char
    const nextValue = newDigits.join('')
    onChange(nextValue)

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    if (nextValue.length === length && onComplete) {
      onComplete(nextValue)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault()
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, length)

    if (!pasted) return

    onChange(pasted)
    const nextIndex = Math.min(pasted.length, length - 1)
    inputRefs.current[nextIndex]?.focus()

    if (pasted.length === length && onComplete) {
      onComplete(pasted)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 sm:gap-3',
        className,
      )}
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          disabled={disabled}
          value={digits[index] || ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={cn(
            'h-14 w-12 rounded-xl text-center text-2xl font-bold transition-all duration-150 sm:h-15 sm:w-13',
            'bg-surface text-ink outline-none select-none',
            'border-2 border-line',
            'focus:border-brand focus:ring-4 focus:ring-brand/15',
            digits[index] && 'border-line/90',
            isError &&
              'border-danger text-danger focus:border-danger focus:ring-danger/15',
            disabled && 'cursor-not-allowed bg-canvas opacity-50',
          )}
          aria-label={`Dígito ${index + 1}`}
        />
      ))}
    </div>
  )
}
