import { apiRequest } from '@/shared/api/apiClient'
import type {
  LoginResponse,
  VerifyTwoFactorResponse,
  RefreshTokenResponse,
  ResendCodeResponse,
  ForgotPasswordResponse,
  ValidatePasswordResetResponse,
  ResetPasswordResponse,
  AuthenticatedUserResponse,
  PatientRegistrationCheckResponse,
  PatientRegistrationRequest,
  PatientRegistrationResponse,
  PatientRegistrationInitRequest,
  PatientRegistrationInitResponse,
  PatientRegistrationConfirmRequest,
  VerifyRegistrationEmailResponse,
  StaffInvitationResponse,
  StaffActivationStartResponse,
  StaffActivationCompleteResponse,
} from './authApi.types'

export * from './authApi.types'

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    })
  },

  verifyTwoFactor(challengeId: number, codigo: string) {
    return apiRequest<VerifyTwoFactorResponse>(
      '/api/auth/verify-2fa',
      {
        method: 'POST',
        body: JSON.stringify({
          challengeId,
          codigo,
        }),
      },
    )
  },

  resendCode(challengeId: number) {
    return apiRequest<ResendCodeResponse>('/api/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({
        challengeId,
      }),
    })
  },

  refresh() {
    return apiRequest<RefreshTokenResponse>('/api/auth/refresh', {
      method: 'POST',
    })
  },

  logout() {
    return apiRequest<void>('/api/auth/logout', {
      method: 'POST',
    })
  },

  forgotPassword(correo: string) {
    return apiRequest<ForgotPasswordResponse>(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({
          correo,
        }),
      },
    )
  },

  validatePasswordReset(token: string) {
    return apiRequest<ValidatePasswordResetResponse>(
      '/api/auth/reset-password/validate',
      {
        method: 'POST',
        body: JSON.stringify({
          token,
        }),
      },
    )
  },

  resetPassword(
    token: string,
    nuevaContrasena: string,
    confirmarContrasena: string,
  ) {
    return apiRequest<ResetPasswordResponse>(
      '/api/auth/reset-password',
      {
        method: 'POST',
        body: JSON.stringify({
          token,
          nuevaContrasena,
          confirmarContrasena,
        }),
      },
    )
  },

  me(accessToken: string) {
    return apiRequest<AuthenticatedUserResponse>('/api/auth/me', {
      method: 'GET',
      accessToken,
    })
  },

  checkPatientDocument(tipoDocumento: string, numeroDocumento: string, turnstileToken: string) {
    return apiRequest<PatientRegistrationCheckResponse>(
      '/api/auth/patient-registration/check-documento',
      {
        method: 'POST',
        body: JSON.stringify({ 
          tipoDocumento,
          numeroDocumento,
          turnstileToken,
        }),
      },
    )
  },

  initPatientRegistration(data: PatientRegistrationInitRequest) {
    return apiRequest<PatientRegistrationInitResponse>(
      '/api/auth/patient-registration/init',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  },

  confirmPatientRegistration(data: PatientRegistrationConfirmRequest) {
    return apiRequest<PatientRegistrationResponse>(
      '/api/auth/patient-registration/confirm',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  },

  registerPatient(data: PatientRegistrationRequest) {
    return apiRequest<PatientRegistrationResponse>(
      '/api/auth/patient-registration',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  },

  verifyRegistrationEmail(challengeId: number, codigo: string) {
    return apiRequest<VerifyRegistrationEmailResponse>(
      '/api/auth/patient-registration/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({
          challengeId,
          codigo,
        }),
      },
    )
  },

  restartRegistrationVerification(email: string, password: string, turnstileToken: string) {
    return apiRequest<ResendCodeResponse>('/api/auth/patient-registration/restart-verification', {
      method: 'POST',
      body: JSON.stringify({ email, password, turnstileToken }),
    })
  },

  validateStaffInvitation(token: string) {
    return apiRequest<StaffInvitationResponse>('/api/auth/staff-activation/validate', {
      method: 'POST', body: JSON.stringify({ token }),
    })
  },

  startStaffActivation(token: string, tipoDocumento: string, numeroDocumento: string, turnstileToken: string) {
    return apiRequest<StaffActivationStartResponse>('/api/auth/staff-activation/start', {
      method: 'POST',
      body: JSON.stringify({ token, tipoDocumento, numeroDocumento, turnstileToken }),
    })
  },

  startPatientActivation(token: string, tipoDocumento: string, numeroDocumento: string, turnstileToken: string) {
    return apiRequest<StaffActivationStartResponse>('/api/auth/account-activation/start', {
      method: 'POST',
      body: JSON.stringify({ token, tipoDocumento, numeroDocumento, turnstileToken }),
    })
  },

  completeStaffActivation(token: string, challengeId: number, codigo: string, password: string) {
    return apiRequest<StaffActivationCompleteResponse>('/api/auth/staff-activation/complete', {
      method: 'POST', body: JSON.stringify({ token, challengeId, codigo, password }),
    })
  },

  validatePatientInvitation(token: string) {
    return apiRequest<StaffInvitationResponse>('/api/auth/account-activation/validate', {
        method: 'POST',
        body: JSON.stringify({ token }),
      },
    )
  },

  completePatientActivation(token: string, challengeId: number, codigo: string, password: string,) {
    return apiRequest<StaffActivationCompleteResponse>('/api/auth/account-activation/complete', {
        method: 'POST',
        body: JSON.stringify({ token, challengeId, codigo, password }),
      },
    )
  },
}
