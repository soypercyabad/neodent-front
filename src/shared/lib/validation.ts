/** Expresión regular básica para validar el formato de un correo electrónico. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Longitud mínima y máxima de contraseña exigida al registrarse. */
export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 100

export interface PasswordRule {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special'
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'Mínimo 8 caracteres',
    test: (pwd: string) => pwd.length >= MIN_PASSWORD && pwd.length <= MAX_PASSWORD,
  },
  {
    id: 'uppercase',
    label: 'Al menos una mayúscula (A-Z)',
    test: (pwd: string) => /[A-Z]/.test(pwd),
  },
  {
    id: 'lowercase',
    label: 'Al menos una minúscula (a-z)',
    test: (pwd: string) => /[a-z]/.test(pwd),
  },
  {
    id: 'number',
    label: 'Al menos un número (0-9)',
    test: (pwd: string) => /\d/.test(pwd),
  },
  {
    id: 'special',
    label: 'Al menos un carácter especial (ej. !@#$%&*.)',
    test: (pwd: string) => /[^A-Za-z0-9\s]/.test(pwd),
  },
]

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong' | 'very-strong'

export interface PasswordValidationState {
  rules: Array<PasswordRule & { passed: boolean }>
  passedCount: number
  totalCount: number
  isValid: boolean
  strength: PasswordStrength
  strengthLabel: string
  strengthPercent: number
  strengthColor: string
}

export function validatePassword(password: string): PasswordValidationState {
  const rules = PASSWORD_RULES.map(rule => ({
    ...rule,
    passed: rule.test(password),
  }))

  const passedCount = rules.filter(r => r.passed).length
  const totalCount = rules.length
  const isValid = rules.every(r => r.passed)

  let strength: PasswordStrength = 'empty'
  let strengthLabel = ''
  let strengthPercent = 0
  let strengthColor = 'bg-line'

  if (password.length > 0) {
    if (passedCount <= 2) {
      strength = 'weak'
      strengthLabel = 'Débil'
      strengthPercent = 25
      strengthColor = 'bg-danger'
    } else if (passedCount <= 3) {
      strength = 'medium'
      strengthLabel = 'Media'
      strengthPercent = 55
      strengthColor = 'bg-warn'
    } else if (passedCount === 4) {
      strength = 'strong'
      strengthLabel = 'Fuerte'
      strengthPercent = 80
      strengthColor = 'bg-brand'
    } else {
      strength = 'very-strong'
      strengthLabel = 'Muy segura'
      strengthPercent = 100
      strengthColor = 'bg-success'
    }
  }

  return {
    rules,
    passedCount,
    totalCount,
    isValid,
    strength,
    strengthLabel,
    strengthPercent,
    strengthColor,
  }
}

export function isPasswordSecure(password: string): boolean {
  return validatePassword(password).isValid
}
