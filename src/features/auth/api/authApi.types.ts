export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  requiresTwoFactor: boolean
  challengeId: number | null
  message: string
}

export interface VerifyTwoFactorRequest {
  challengeId: number
  codigo: string
}

export interface VerifyTwoFactorResponse {
  verified: boolean
  accessToken: string
  tokenType: string
  expiresIn: number
  message: string
}

export interface RefreshTokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  message: string
}

export interface ResendCodeResponse {
  challengeId: number
  message: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface ValidatePasswordResetResponse {
  valid: boolean
  message: string
}

export interface ResetPasswordResponse {
  message: string
}

export interface AuthenticatedUserResponse {
  idUsuario: number
  correo: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  roles: string[]
  estado: string
  idPersonal: number | null
  idPaciente: number | null
}

export interface PatientRegistrationCheckResponse {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string | null
  apellidoPaterno: string | null
  apellidoMaterno: string | null
  manualEntryRequired: boolean
}

export interface PatientRegistrationRequest {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string | null
  fechaNacimiento: string | null
  telefono: string
  email: string
  direccion: string | null
  password: string
  turnstileToken: string
}

export interface PatientRegistrationResponse {
  pacienteId: number
  usuarioId: number
  challengeId: number
  message: string
}

export interface VerifyRegistrationEmailResponse {
  verified: boolean
  message: string
}

export interface StaffInvitationResponse {
  valid: boolean
  nombrePaciente: string
  emailMasked: string
}
export interface StaffActivationStartResponse {
  challengeId: number
  emailMasked: string
  message: string
}
export interface StaffActivationCompleteResponse {
  usuarioId: number
  pacienteId: number | null
  message: string
}
