import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHead } from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { PatientForm } from '../components/PatientForm'
import { patientsApi, type ActualizarPacienteRequest, type PacienteResponse } from '../api/patientsApi'

export function EditPatientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [paciente, setPaciente] =
    useState<PacienteResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken || !id) return

    let activo = true
    setLoading(true)

    patientsApi.obtener(accessToken, Number(id))
      .then(response => {
        if (activo) setPaciente(response)
      })
      .catch(e => {
        if (activo) {
          setError(
            e instanceof Error
              ? e.message
              : 'No se pudo cargar el paciente.',
          )
        }
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [accessToken, id])

  const guardar = async (
    data: ActualizarPacienteRequest,
  ) => {
    if (!accessToken || !paciente || saving) return

    setSaving(true)
    setError('')

    try {
      await patientsApi.actualizar(
        accessToken,
        paciente.id,
        data,
      )

      navigate(`/pacientes/${paciente.id}`, {
        replace: true,
        state: {
          aviso: {
            tipo: 'success',
            texto: 'Paciente actualizado correctamente.',
          },
        },
      })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo actualizar el paciente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHead
        title="Editar paciente"
        description="Actualiza los datos administrativos permitidos."
      />

      {loading ? (
        <p className="text-sm text-muted">
          Cargando paciente…
        </p>
      ) : error && !paciente ? (
        <p className="rounded-xl bg-danger-soft p-4 text-danger">
          {error}
        </p>
      ) : paciente ? (
        <>
          {error && (
            <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
              {error}
            </p>
          )}

          <PatientForm
            paciente={paciente}
            saving={saving}
            onSubmit={data =>
              guardar(data as ActualizarPacienteRequest)
            }
            onCancel={() =>
              navigate(`/pacientes/${paciente.id}`)
            }
          />
        </>
      ) : null}
    </>
  )
}