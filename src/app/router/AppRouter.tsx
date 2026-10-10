import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/app/layouts/AppShell'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import {
  HomeRedirect, LoginPage, RegisterPage, RequireAuth, TwoFactorPage,
  ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage,
  RestartVerificationPage, AccountActivationPage, MyProfilePage, TermsPage,
} from '@/features/auth'
import {
  AppointmentsPage, AppointmentDetailPage, MyAppointmentsPage,
  StaffAppointmentPatientPage, NewAppointmentPage, ReprogramAppointmentPage,
  NewAppointmentSchedulePage, NewAppointmentConfirmPage,
} from '@/features/appointments'
import { UsersPage, UserDetailPage, NewUserPage, EditUserPage } from '@/features/users'
import { PatientsPage, PatientDetailPage, NewPatientPage, EditPatientPage } from '@/features/patients'
import { DashboardPage } from '@/features/dashboard'
import { RolesPage } from '@/features/roles'
import { ModulosPage } from '@/features/modulos'
import { SedesPage } from '@/features/sedes/pages/SedesPage'
import { EspecialidadesPage } from '@/features/especialidades/pages/EspecialidadesPage'
import { ServiciosPage } from '@/features/servicios/pages/ServiciosPage'
import { ForbiddenPage } from '@/app/pages/ForbiddenPage'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { PATIENT_ROLES, STAFF_ROLES, type Role } from '@/domain/identity'
import { SchedulesPage, ScheduleHistoryPage, ScheduleBlocksPage, BlockTypesPage } from '@/features/schedules'
import { AdminTermsPage } from '@/features/legal'

const ADMIN_ROLES: readonly Role[] = ['Administrador']
const ADMIN_RECEPTION_ROLES: readonly Role[] = ['Administrador', 'Recepcionista']

export function AppRouter() {
  return (
    <Routes>
      {/* PÚBLICO */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verificar-2fa" element={<TwoFactorPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verificar-correo" element={<VerifyEmailPage />} />
        <Route path="/activar-cuenta-pendiente" element={<RestartVerificationPage />} />
        <Route path="/terminos" element={<TermsPage />} />
        <Route path="/activar-personal" element={<AccountActivationPage type="staff" />} />
        <Route path="/activate-account" element={<AccountActivationPage type="patient" />} />
      </Route>

      {/* RUTAS PROTEGIDAS CON APPSHELL */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          {/* Citas */}
          <Route element={<RequireAuth module="CITAS" roles={STAFF_ROLES} />}>
            <Route path="/citas" element={<AppointmentsPage />} />
            <Route path="/citas/:id" element={<AppointmentDetailPage />} />
            <Route path="/citas/nueva" element={<StaffAppointmentPatientPage />} />
            <Route path="/citas/nueva/datos" element={<NewAppointmentPage />} />
            <Route path="/citas/nueva/fecha-y-hora" element={<NewAppointmentSchedulePage />} />
            <Route path="/citas/nueva/confirmar" element={<NewAppointmentConfirmPage />} />
            <Route path="/citas/:id/reprogramar" element={<ReprogramAppointmentPage />} />
          </Route>

          {/* Pacientes */}
          <Route element={<RequireAuth module="PACIENTES" roles={STAFF_ROLES} />}>
            <Route path="/pacientes" element={<PatientsPage />} />
            <Route path="/pacientes/:id" element={<PatientDetailPage />} />
            <Route path="/pacientes/nuevo" element={<NewPatientPage />} />
            <Route path="/pacientes/:id/editar" element={<EditPatientPage />} />
          </Route>

          {/* Horarios */}
          <Route element={<RequireAuth module="HORARIOS" roles={ADMIN_RECEPTION_ROLES} />}>
            <Route path="/horarios" element={<SchedulesPage />} />
            <Route path="/horarios/cronogramas" element={<ScheduleHistoryPage />} />
            <Route path="/horarios/bloqueos" element={<ScheduleBlocksPage />} />
            <Route path="/tipos-bloqueo" element={<BlockTypesPage />} />
          </Route>

          {/* Personal */}
          <Route element={<RequireAuth module="PERSONAL" roles={ADMIN_ROLES} />}>
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/usuarios/nuevo" element={<NewUserPage />} />
            <Route path="/usuarios/:id" element={<UserDetailPage />} />
            <Route path="/usuarios/:id/editar" element={<EditUserPage />} />
          </Route>

          {/* Catálogo y Administración */}
          <Route element={<RequireAuth module="ROLES" roles={ADMIN_ROLES} />}>
            <Route path="/roles" element={<RolesPage />} />
          </Route>
          <Route element={<RequireAuth module="MODULOS" roles={ADMIN_ROLES} />}>
            <Route path="/modulos" element={<ModulosPage />} />
          </Route>
          <Route element={<RequireAuth module="SEDES" roles={ADMIN_ROLES} />}>
            <Route path="/sedes" element={<SedesPage />} />
          </Route>
          <Route element={<RequireAuth module="ESPECIALIDADES" roles={ADMIN_ROLES} />}>
            <Route path="/especialidades" element={<EspecialidadesPage />} />
          </Route>
          <Route element={<RequireAuth module="SERVICIOS" roles={ADMIN_ROLES} />}>
            <Route path="/servicios" element={<ServiciosPage />} />
          </Route>
          <Route element={<RequireAuth module="LEGALES" roles={ADMIN_ROLES} />}>
            <Route path="/terminos-admin" element={<AdminTermsPage />} />
          </Route>

          {/* Portal del paciente */}
          <Route element={<RequireAuth module="MIS_CITAS" roles={PATIENT_ROLES} />}>
            <Route path="/mis-citas" element={<MyAppointmentsPage />} />
            <Route path="/mis-citas/:id" element={<AppointmentDetailPage />} />
            <Route path="/mis-citas/nueva" element={<NewAppointmentPage />} />
            <Route path="/mis-citas/nueva/fecha-y-hora" element={<NewAppointmentSchedulePage />} />
            <Route path="/mis-citas/nueva/confirmar" element={<NewAppointmentConfirmPage />} />
          </Route>
        </Route>
      </Route>

      {/* CUALQUIER USUARIO AUTENTICADO */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/perfil" element={<MyProfilePage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}