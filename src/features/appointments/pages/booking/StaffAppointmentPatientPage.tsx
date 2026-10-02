import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatedSelect, Badge, Button, Card, Field, Icon, Input, Toast, type ToastAviso } from '@/shared/components/ui'
import { ApiError } from '@/shared/api/apiClient'
import { documentTypesApi, type TipoDocumentoOption, } from '@/shared/api/documentTypesApi'
import { useAuth } from '@/features/auth'
import { PatientForm, } from '@/features/patients/components/PatientForm'
import { patientsApi, type CrearPacienteRequest, type PacienteResponse, } from '@/features/patients/api/patientsApi'
import { BookingLayout } from '../../components/booking/BookingLayout'
import { STAFF_BOOKING_STEPS } from '../../model/catalog'

const nombrePaciente = (p: PacienteResponse) =>
  [
    p.nombres,
    p.apellidoPaterno,
    p.apellidoMaterno,
  ].filter(Boolean).join(' ')

export function StaffAppointmentPatientPage() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const { state: locationState } = useLocation()

  const [tipos, setTipos] = useState<TipoDocumentoOption[]>([])
  const [tipoDocumento, setTipoDocumento] = useState('DNI')
  const [numeroDocumento, setNumeroDocumento] = useState('')

  const [paciente, setPaciente] = useState<PacienteResponse | null>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)
  const [mostrarRegistro, setMostrarRegistro] = useState(false)

  const [buscando, setBuscando] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [activando, setActivando] = useState(false)

  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<ToastAviso | null>(null)

  useEffect(() => {
    const s = locationState as {
      paciente?: PacienteResponse
      pacienteId?: number
    } | null

    if (s?.paciente) {
      setPaciente(s.paciente)
      setTipoDocumento(s.paciente.tipoDocumento)
      setNumeroDocumento(s.paciente.numeroDocumento)
    } else if (s?.pacienteId && accessToken) {
      patientsApi
        .obtener(accessToken, s.pacienteId)
        .then(p => {
          setPaciente(p)
          setTipoDocumento(p.tipoDocumento)
          setNumeroDocumento(p.numeroDocumento)
        })
        .catch(() => {})
    }
  }, [locationState, accessToken])

  useEffect(() => {
    documentTypesApi.listar()
      .then(data => {
        setTipos(data)

        const inicial =
          data.find(t => t.codigo === 'DNI') ??
          data[0]

        if (inicial) {
          setTipoDocumento(inicial.codigo)
        }
      })
      .catch(() => {
        setError('No se pudieron cargar los tipos de documento.')
      })
  }, [])

  const tipo = tipos.find(t => t.codigo === tipoDocumento)

  const esDni = tipoDocumento === 'DNI'
  const minDocumento = tipo?.longitudMin ?? (esDni ? 8 : 1)
  const maxDocumento = tipo?.longitudMax ?? (esDni ? 8 : 20)

  const errorDocumento = useMemo(() => {
    const valor = numeroDocumento.trim()

    if (!valor) { return 'Ingresa el número de documento.' }

    if ( valor.length < minDocumento || valor.length > maxDocumento ) {
      return minDocumento === maxDocumento
        ? `El documento debe tener ${minDocumento} caracteres.`
        : `El documento debe tener entre ${minDocumento} y ${maxDocumento} caracteres.`
    }

    if (esDni && !/^\d{8}$/.test(valor)) {  return 'El DNI debe contener exactamente 8 dígitos.'  }

    return ''
  }, [numeroDocumento, minDocumento, maxDocumento, esDni,])

  const limpiarResultado = () => { 
    setPaciente(null)
    setNoEncontrado(false)
    setMostrarRegistro(false)
    setAviso(null)
    setError('')
  }

  const cambiarTipo = (valor: string) => {
    setTipoDocumento(valor)
    setNumeroDocumento('')
    limpiarResultado()
  }

  const cambiarDocumento = (valor: string) => {
    const nuevo = esDni
      ? valor.replace(/\D/g, '').slice(0, maxDocumento)
      : valor.toUpperCase().replace(/\s/g, '').slice(0, maxDocumento)

    setNumeroDocumento(nuevo)
    limpiarResultado()
  }

  const buscarPaciente = async (
    e?: FormEvent<HTMLFormElement>,
  ) => {
    e?.preventDefault()

    if (!accessToken || buscando) return

    const validation = errorDocumento

    if (validation) {
      setError(validation)
      return
    }

    setBuscando(true)
    setPaciente(null)
    setNoEncontrado(false)
    setMostrarRegistro(false)
    setAviso(null)
    setError('')

    try {
      const encontrado = await patientsApi.buscarPorDocumento(
        accessToken,
        tipoDocumento,
        numeroDocumento.trim(),
      )

      setPaciente(encontrado)
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.status === 404
      ) {
        setNoEncontrado(true)
        return
      }

      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo buscar al paciente.',
      )
    } finally {
      setBuscando(false)
    }
  }

  const registrarPaciente = async (
    data: CrearPacienteRequest,
  ) => {
    if (!accessToken || registrando) return

    setRegistrando(true)
    setError('')

    try {
      const creado = await patientsApi.crear(
        accessToken,
        data,
      )

      setPaciente(creado)
      setMostrarRegistro(false)
      setNoEncontrado(false)
      setAviso({
        tipo: 'success',
        texto: 'Paciente registrado correctamente. Ya puedes continuar con la cita.',
      })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo registrar el paciente.',
      )
    } finally {
      setRegistrando(false)
    }
  }

  const activarPaciente = async () => {
    if (
      !accessToken ||
      !paciente ||
      activando
    ) return

    setActivando(true)
    setError('')

    try {
      await patientsApi.activar(
        accessToken,
        paciente.id,
      )

      setPaciente(current =>
        current
          ? { ...current, activo: true }
          : current,
      )

      setAviso({
        tipo: 'success',
        texto: 'Paciente activado correctamente.',
      })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo activar el paciente.',
      )
    } finally {
      setActivando(false)
    }
  }

  const continuar = () => {
    if (!paciente?.activo) return

    navigate('/citas/nueva/datos', {
      state: {
        paciente,
        pacienteId: paciente.id,
        pacienteNombre: nombrePaciente(paciente),
        pacienteDocumento:
          `${paciente.tipoDocumento} ${paciente.numeroDocumento}`,
      },
    })
  }

  return (
    <BookingLayout
      step={0}
      steps={STAFF_BOOKING_STEPS}
      exitTo="/citas"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 text-sm max-sm:w-full">
            {paciente && (
              <>
                <p className="text-xs text-muted">Paciente seleccionado</p>
                <p className="truncate font-semibold text-ink">
                  {nombrePaciente(paciente)}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-end">
            <Button variant="ghost" onClick={() => navigate('/citas')}>
              Cancelar
            </Button>

            <Button onClick={continuar} disabled={!paciente?.activo}>
              Continuar
            </Button>
          </div>
        </div>
      }
    >
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-6 w-full max-w-5xl"
      >
        <Card className="p-5 sm:p-7">
          <div>
            <h2 className="text-lg font-bold text-ink">
              Selecciona al paciente
            </h2>

            <p className="mt-1 text-sm text-muted">
              Primero busca al paciente por su documento. Si ya está registrado,
              utilizaremos sus datos existentes.
            </p>
          </div>

          <form onSubmit={buscarPaciente} className="mt-5 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end">
            <Field label="Tipo de documento">
              <AnimatedSelect
                value={tipoDocumento}
                options={tipos.map(t => ({ value: t.codigo, label: `${t.codigo} · ${t.nombre}` }))}
                onChange={cambiarTipo}
                disabled={buscando}
              />
            </Field>

            <Field label="Número de documento">
              <Input
                icon="idCard"
                value={numeroDocumento}
                inputMode={esDni ? 'numeric' : 'text'}
                maxLength={maxDocumento}
                placeholder={esDni ? 'Ej. 75195320' : tipoDocumento === 'CE' ? 'Ej. 001234567' : 'Ej. AB123456'}
                disabled={buscando}
                onChange={e => cambiarDocumento(e.target.value)}
              />
            </Field>

            <Button type="submit" icon="search" disabled={buscando || !numeroDocumento.trim()} className="h-[42px]">
              {buscando ? 'Buscando…' : 'Buscar paciente'}
            </Button>
          </form>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {paciente && (
              <motion.div
                key={`paciente-${paciente.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 rounded-2xl border border-line bg-alt/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-ink">
                        {nombrePaciente(paciente)}
                      </h3>

                      <Badge tone={paciente.activo ? 'green' : 'red'}>
                        {paciente.activo ? 'Activo' : 'Inactivo'}
                      </Badge>

                      <Badge tone={paciente.tieneCuenta ? 'blue' : 'amber'}>
                        {paciente.tieneCuenta ? 'Con cuenta' : 'Sin cuenta'}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-ink-soft">
                      {paciente.tipoDocumento} · {paciente.numeroDocumento}
                    </p>
                  </div>

                  {!paciente.activo && (
                    <Button variant="outline" onClick={() => void activarPaciente()} disabled={activando}>
                      {activando ? 'Activando…' : 'Activar paciente'}
                    </Button>
                  )}
                </div>

                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <Icon name="phone" size={14} className="text-brand" />
                      Teléfono
                    </dt>
                    <dd className="mt-1 font-semibold text-ink">
                      {paciente.telefono || 'No registrado'}
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <Icon name="mail" size={14} className="text-brand" />
                      Correo
                    </dt>
                    <dd className="mt-1 break-all font-semibold text-ink">
                      {paciente.email || 'No registrado'}
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-center gap-1.5 text-muted">
                      <Icon name="calendar" size={14} className="text-brand" />
                      Fecha de nacimiento
                    </dt>
                    <dd className="mt-1 font-semibold text-ink">
                      {paciente.fechaNacimiento || 'No registrada'}
                    </dd>
                  </div>
                </dl>

                {!paciente.activo && (
                  <p className="mt-4 text-sm text-danger">
                    Este paciente está inactivo. Debes activarlo antes de programar una cita.
                  </p>
                )}
              </motion.div>
            )}

            {noEncontrado && !mostrarRegistro && (
              <motion.div
                key="no-encontrado"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-amber-900">
                      Paciente no registrado
                    </h3>

                    <p className="mt-1 text-sm text-amber-800">
                      No existe un paciente con {tipoDocumento} {numeroDocumento}.
                      Regístralo antes de continuar con la cita.
                    </p>
                  </div>

                  <Button onClick={() => setMostrarRegistro(true)}>
                    Registrar paciente
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {mostrarRegistro && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <div className="mb-3">
              <h2 className="text-lg font-bold text-ink">
                Registrar nuevo paciente
              </h2>

              <p className="mt-1 text-sm text-muted">
                El documento buscado ya está precargado.
              </p>
            </div>

            <PatientForm
              initialTipoDocumento={tipoDocumento}
              initialNumeroDocumento={numeroDocumento}
              saving={registrando}
              onSubmit={data => registrarPaciente(data as CrearPacienteRequest)}
              onCancel={() => setMostrarRegistro(false)}
            />
          </motion.div>
        )}
      </motion.section>

      <Toast aviso={aviso} onClose={() => setAviso(null)} />
    </BookingLayout>
  )
}