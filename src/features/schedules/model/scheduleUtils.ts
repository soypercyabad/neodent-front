export const DIAS = [
  { value: '1', label: 'Lunes', short: 'LUN' },
  { value: '2', label: 'Martes', short: 'MAR' },
  { value: '3', label: 'Miércoles', short: 'MIÉ' },
  { value: '4', label: 'Jueves', short: 'JUE' },
  { value: '5', label: 'Viernes', short: 'VIE' },
  { value: '6', label: 'Sábado', short: 'SÁB' },
  { value: '7', label: 'Domingo', short: 'DOM' },
] as const

export const pad = (value: number) => String(value).padStart(2, '0')

export const isoFecha = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const fechaDesdeIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const hoyIso = () => isoFecha(new Date())

export const diaSemanaIso = (iso: string) => {
  const day = fechaDesdeIso(iso).getDay()
  return day === 0 ? 7 : day
}

export const hora12 = (hora: string) => {
  const [hStr = '00', mStr = '00'] = hora.split(':')
  const h = Number.parseInt(hStr, 10)
  const m = Number.parseInt(mStr, 10)
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export const fechaCorta = (iso: string) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fechaDesdeIso(iso.slice(0, 10)))
}

export interface ResumenVigencia {
  count: number
  primerDia: string | null
  ultimoDia: string | null
  aviso: string | null
  fechaAjustadaSugerida: string | null
  esIndefinido: boolean
}

export function calcularResumenVigencia(
  diaSemana: number,
  inicioIso: string,
  finIso: string | null,
): ResumenVigencia | null {
  if (!inicioIso) return null
  const diaBuscado = diaSemana

  if (!finIso) {
    return {
      count: Infinity,
      primerDia: null,
      ultimoDia: null,
      aviso: null,
      fechaAjustadaSugerida: null,
      esIndefinido: true,
    }
  }

  const start = new Date(`${inicioIso}T12:00:00`)
  const end = new Date(`${finIso}T12:00:00`)
  if (end < start) return null

  let count = 0
  let primerDia: string | null = null
  let ultimoDia: string | null = null

  const current = new Date(start)
  while (current <= end) {
    const dayIso = current.getDay() === 0 ? 7 : current.getDay()
    if (dayIso === diaBuscado) {
      count++
      const iso = current.toISOString().slice(0, 10)
      if (!primerDia) primerDia = iso
      ultimoDia = iso
    }
    current.setDate(current.getDate() + 1)
  }

  const finDayIso = end.getDay() === 0 ? 7 : end.getDay()
  let fechaAjustadaSugerida: string | null = null
  let aviso: string | null = null

  const diasNombres = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const nombreFin = diasNombres[finDayIso]
  const nombreBuscado = diasNombres[diaBuscado]

  if (finDayIso !== diaBuscado) {
    const diffNext = (diaBuscado - finDayIso + 7) % 7
    const nextDate = new Date(end)
    nextDate.setDate(nextDate.getDate() + diffNext)
    fechaAjustadaSugerida = nextDate.toISOString().slice(0, 10)

    if (count === 0) {
      aviso = `No hay ningún ${nombreBuscado} entre las fechas de inicio y fin. Este turno no se ejecutará ninguna fecha.`
    } else {
      aviso = `La vigencia termina un ${nombreFin} (${fechaCorta(finIso)}). El último día de atención efectivo será el ${nombreBuscado} ${fechaCorta(ultimoDia!)}.`
    }
  }

  return {
    count,
    primerDia,
    ultimoDia,
    aviso,
    fechaAjustadaSugerida,
    esIndefinido: false,
  }
}
