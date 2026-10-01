import { useState } from 'react'
import { AnimatedSelect, Button, Card, Field, Input } from '@/shared/components/ui'
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type Appointment,
  type PaymentInput,
  type PaymentMethod,
  type PaymentStatus,
} from '../model/appointments.types'

interface PaymentFormProps {
  appointment: Appointment
  onSubmit: (input: PaymentInput) => void
}

/** Devuelve el mensaje del primer campo inválido, o null si el formulario es válido. */
function validate(pago: PaymentStatus, precio: string): string | null {
  if (precio !== '' && Number(precio) < 0) return 'El precio no puede ser negativo.'
  if (pago === 'Pagado' && precio === '') return 'Indica el monto cobrado.'
  return null
}

/** Tarjeta "Pago": estado, precio, medio de cobro y referencia. */
export function PaymentForm({ appointment, onSubmit }: PaymentFormProps) {
  const [pago, setPago] = useState<PaymentStatus>(appointment.pago)
  const [precio, setPrecio] = useState(appointment.precio != null ? String(appointment.precio) : '')
  const [tipoPago, setTipoPago] = useState<PaymentMethod | ''>(appointment.tipoPago ?? '')
  const [codigo, setCodigo] = useState(appointment.codigoTransaccion)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const problem = validate(pago, precio)
    setError(problem)
    if (problem) return
    onSubmit({
      pago,
      precio: precio === '' ? null : Number(precio),
      tipoPago: tipoPago === '' ? null : tipoPago,
      codigoTransaccion: codigo.trim(),
    })
  }

  return (
    <Card className="p-6">
      <h2 className="mb-5 text-[1.35rem] font-bold">Pago</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Estado del pago">
          <AnimatedSelect
            label="Estado del pago"
            options={PAYMENT_STATUSES.map(s => ({ value: s, label: s }))}
            value={pago}
            onChange={valor => setPago(valor as PaymentStatus)}
          />
        </Field>
        <Field label="Precio" hint="Monto en soles (S/)." error={error}>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="Ej. 120.00"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Tipo de pago">
          <AnimatedSelect
            label="Tipo de pago"
            placeholder="Sin definir"
            options={[
              { value: '', label: 'Sin definir' },
              ...PAYMENT_METHODS.map(m => ({ value: m, label: m })),
            ]}
            value={tipoPago}
            onChange={valor => setTipoPago(valor as PaymentMethod | '')}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Código de transacción">
          <Input
            placeholder="Ingresa el código de transacción"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={submit}>Guardar pago</Button>
      </div>
    </Card>
  )
}
