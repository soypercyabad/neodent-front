export interface Credentials {
  correo: string
  password: string
  recordarme: boolean
}

export type DocumentType = string

export interface RegisterInput {
  tipoDocumento: DocumentType
  numeroDocumento: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  fechaNacimiento: string
  telefono: string
  correo: string
  password: string
  confirmPassword: string
  aceptaTerminos: boolean
}