"use client"

import { useEffect, useRef } from "react"

/**
 * Componente Modal unificado y mejorado
 * Soporta diferentes tipos de modales: confirmación, validación, información, etc.
 */
function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "medium", // small, medium, large
  closeOnClickOutside = true,
  showCloseButton = true,
  className = "",
}) {
  const modalRef = useRef(null)

  // Manejar cierre con tecla Escape
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey)
      // Prevenir scroll en el body cuando el modal está abierto
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
      // Restaurar scroll cuando el modal se cierra
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])

  // Manejar clic fuera del modal
  const handleOutsideClick = (e) => {
    if (closeOnClickOutside && modalRef.current && !modalRef.current.contains(e.target)) {
      onClose()
    }
  }

  // Determinar clases de tamaño
  const sizeClasses = {
    small: "max-w-md",
    medium: "max-w-lg",
    large: "max-w-2xl",
    fullscreen: "max-w-full h-full m-0 rounded-none",
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleOutsideClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-lg shadow-xl overflow-hidden w-full ${sizeClasses[size]} ${className}`}
      >
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-medium">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export default Modal
