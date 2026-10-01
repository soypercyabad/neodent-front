export async function normalizarImagenAJpeg(archivo: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // Si no parece imagen ni por type ni por extensión, dejamos que el backend lo valide
    const esImagen =
      archivo.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|avif|heic|bmp|jfif)$/i.test(archivo.name)

    if (!esImagen) {
      return resolve(archivo)
    }

    const img = new Image()
    const url = URL.createObjectURL(archivo)

    img.onload = () => {
      URL.revokeObjectURL(url)

      try {
        const canvas = document.createElement('canvas')
        const MAX_DIM = 1920
        let { naturalWidth: width, naturalHeight: height } = img

        if (width <= 0 || height <= 0) {
          return resolve(archivo)
        }

        // Redimensionar si supera 1920px para optimizar tamaño y rendimiento
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          } else {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return resolve(archivo)
        }

        // Fondo blanco para manejar transparencias de PNG/WebP sin fondos negros
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          blob => {
            if (blob) {
              const baseName =
                archivo.name.replace(/\.[^/.]+$/, '') || 'foto_perfil'
              const archivoJpeg = new File([blob], `${baseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(archivoJpeg)
            } else {
              resolve(archivo)
            }
          },
          'image/jpeg',
          0.92,
        )
      } catch {
        resolve(archivo)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      // Si el navegador no puede decodificarlo
      reject(
        new Error(
          'El archivo seleccionado no contiene una imagen legible.',
        ),
      )
    }

    img.src = url
  })
}
