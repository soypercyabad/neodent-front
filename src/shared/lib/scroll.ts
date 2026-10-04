/**
 * Desplaza suavemente la vista hacia el formulario o hacia la parte superior del contenedor principal.
 * Evita la confusión del usuario cuando hace clic en "Editar" o "Nuevo" desde una fila inferior de la tabla.
 */
export function scrollToTopOrElement(element?: HTMLElement | null, delayMs = 60) {
  setTimeout(() => {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    // El contenedor con scroll en AppShell es <main class="flex-1 overflow-y-auto ...">
    const mainContainer = document.querySelector('main')
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, delayMs)
}
