"use client"

import Modal from "./Modal"

/**
 * Componente unificado para modales de confirmación y validación
 * Reemplaza tanto a ConfirmationModal como a PauseValidationModal
 */
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title = "Confirmar acción",
  message = "¿Estás seguro de que deseas realizar esta acción?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "info", // info, warning, danger, success, validation
  icon = null, // Permite pasar un icono personalizado
  canOverride = false, // Para casos de validación donde se puede ignorar la advertencia
  size = "medium",
}) {
  // Determinar el icono según el tipo si no se proporciona uno personalizado
  const getIcon = () => {
    if (icon) return icon

    switch (type) {
      case "warning":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-yellow-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      case "danger":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-red-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        )
      case "success":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-green-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case "validation":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-blue-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      default: // info
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-blue-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  // Determinar el color del botón de confirmación según el tipo
  const getConfirmButtonClass = () => {
    switch (type) {
      case "warning":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "danger":
        return "bg-red-500 hover:bg-red-600"
      case "success":
        return "bg-green-500 hover:bg-green-600"
      case "validation":
        return "bg-blue-500 hover:bg-blue-600"
      default: // info
        return "bg-blue-500 hover:bg-blue-600"
    }
  }

  // Manejar la respuesta del usuario
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    }
    onClose()
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="confirmation-modal text-center">
        {getIcon()}

        <p className="confirmation-message text-lg mb-6">{message}</p>

        <div className="confirmation-actions flex flex-col sm:flex-row gap-3 justify-center">
          {canOverride ? (
            <>
              <button
                onClick={handleConfirm}
                className={`px-6 py-2 rounded-lg text-white transition-colors ${getConfirmButtonClass()}`}
              >
                {confirmText}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
              >
                {cancelText}
              </button>
            </>
          ) : type === "validation" ? (
            <button
              onClick={handleCancel}
              className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
            >
              Entendido
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                className={`px-6 py-2 rounded-lg text-white transition-colors ${getConfirmButtonClass()}`}
              >
                {confirmText}
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
              >
                {cancelText}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmationModal
