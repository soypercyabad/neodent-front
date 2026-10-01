import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHead } from '@/shared/components/ui'
import { ApiError } from '@/shared/api/apiClient'
import { useAuth } from '@/features/auth'
import { PatientForm } from '../components/PatientForm'
import { patientsApi, type CrearPacienteRequest } from '../api/patientsApi'

export function NewPatientPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (
    data: CrearPacienteRequest,
  ) => {
    if (!accessToken || saving) return

    setSaving(true)
    setError('')

    try {
      await patientsApi.crear(accessToken, data)

      navigate('/pacientes', {
        replace: true,
        state: {
          aviso: {
            tipo: 'success',
            texto: 'Paciente registrado correctamente.',
          },
        },
      })
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo registrar el paciente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHead
        title="Registrar paciente"
        description="Registra los datos administrativos del paciente."
      />

      {error && (
        <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <PatientForm
        saving={saving}
        onSubmit={data =>
          guardar(data as CrearPacienteRequest)
        }
        onCancel={() => navigate('/pacientes')}
      />
    </>
  )
}