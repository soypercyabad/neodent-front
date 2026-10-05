import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Button, Card, Icon } from '@/shared/components/ui'
import { useAuth } from '@/features/auth'
import { legalApi } from '@/features/legal'

export function TermsPage() {
  const { user } = useAuth()
  const s3Url = legalApi.getUrlDescarga()
  const isAdmin = user?.rol === 'Administrador'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-4xl py-6"
    >
      <Card className="p-6 sm:p-10">
        <header className="border-b border-border pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1 text-xs font-semibold text-brand">
                <Icon name="file" size={13} />
                Documento Legal Oficial
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink">
                Términos y Condiciones del Servicio
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                NeoDent Clínicas Odontológicas • Última actualización: Octubre 2026
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <Link to="/terminos-admin">
                  <Button variant="outline" className="gap-2">
                    <Icon name="edit" size={15} />
                    Administrar (S3)
                  </Button>
                </Link>
              )}

              <a
                href={s3Url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="primary" className="gap-2 shadow-sm">
                  <Icon name="externalLink" size={15} />
                  Abrir documento oficial (PDF)
                </Button>
              </a>
            </div>
          </div>
        </header>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
          <section>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">1</span>
              Aceptación de los Términos
            </h2>
            <p className="mt-2 text-ink-muted">
              Al registrarse en la plataforma web de NeoDent Clínicas Odontológicas y marcar la casilla de verificación correspondiente, el usuario declara haber leído, comprendido y aceptado en su totalidad los presentes Términos y Condiciones, así como nuestra Política de Privacidad y Tratamiento de Datos Personales.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">2</span>
              Registro, Cuenta y Seguridad
            </h2>
            <p className="mt-2 text-ink-muted">
              El usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso y de su código de verificación (OTP). Toda actividad realizada desde su cuenta será atribuible a dicho usuario. La clínica implementa mecanismos de autenticación de dos factores (2FA) para proteger la información médica y personal de cada paciente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">3</span>
              Agendamiento y Cancelación de Citas Odontológicas
            </h2>
            <p className="mt-2 text-ink-muted">
              Las citas médicas reservadas a través del portal están sujetas a la disponibilidad del especialista y de los consultorios. En caso de no poder asistir, el paciente se compromete a reprogramar o cancelar su cita con al menos 24 horas de anticipación a través del sistema o comunicándose directamente con la recepción.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">4</span>
              Protección de Datos Personales (Ley N° 29733)
            </h2>
            <p className="mt-2 text-ink-muted">
              En cumplimiento de la Ley N° 29733 (Ley de Protección de Datos Personales de la República del Perú) y su Reglamento, los datos personales y de salud proporcionados serán tratados de forma estrictamente confidencial en nuestro banco de datos de historias clínicas, utilizándose exclusivamente para fines asistenciales, de recordatorio de citas y gestión de servicios odontológicos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">5</span>
              Consentimiento Informado
            </h2>
            <p className="mt-2 text-ink-muted">
              Todo procedimiento clínico, quirúrgico o tratamiento odontológico requiere previamente de una evaluación presencial y la suscripción del consentimiento informado respectivo emitido por el odontólogo colegiado a cargo.
            </p>
          </section>
        </div>

        <footer className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6">
          <Link to="/registro">
            <Button variant="outline" className="gap-2">
              <Icon name="arrowLeft" size={15} />
              Volver al registro
            </Button>
          </Link>

          <a
            href={s3Url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-brand hover:underline inline-flex items-center gap-1"
          >
            <Icon name="externalLink" size={13} />
            Descargar archivo original en PDF (S3)
          </a>
        </footer>
      </Card>
    </motion.div>
  )
}
