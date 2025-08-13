"use client"

import { createContext, useContext, useState, useEffect } from "react"
import Toast from "../components/ui/Toast"

// Crear el contexto
const ToastContext = createContext(null)

// ID único para cada toast
let toastId = 0

// Proveedor del contexto
export function ToastProvider({ children }) {
  // Estado para almacenar los toasts activos
  const [toasts, setToasts] = useState([])
  // Estado para almacenar notificaciones
  const [notifications, setNotifications] = useState([])

  // Efecto para cargar notificaciones almacenadas al iniciar
  useEffect(() => {
    try {
      const storedNotifications = localStorage.getItem("notifications")
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications))
      }
    } catch (error) {
      console.error("Error al cargar notificaciones:", error)
    }
  }, [])

  // Función para añadir un nuevo toast
  const addToast = (message, type = "info", duration = 5000) => {
    const id = ++toastId
    setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }])
    return id
  }

  // Función para eliminar un toast
  const removeToast = (id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  // Funciones de conveniencia para diferentes tipos de toasts
  const showSuccess = (message, duration) => addToast(message, "success", duration)
  const showError = (message, duration) => addToast(message, "error", duration)
  const showWarning = (message, duration) => addToast(message, "warning", duration)
  const showInfo = (message, duration) => addToast(message, "info", duration)

  // Funciones para notificaciones del sistema (anteriormente en notificationService.js)

  // Verificar si las notificaciones están soportadas
  const isNotificationSupported = () => {
    return "Notification" in window
  }

  // Solicitar permiso para mostrar notificaciones
  const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
      console.warn("Las notificaciones no están soportadas en este navegador")
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === "granted"
    } catch (error) {
      console.error("Error al solicitar permiso para notificaciones:", error)
      return false
    }
  }

  // Verificar si tenemos permiso para mostrar notificaciones
  const hasNotificationPermission = () => {
    if (!isNotificationSupported()) return false
    return Notification.permission === "granted"
  }

  // Mostrar una notificación
  const showNotification = (title, options = {}) => {
    if (!hasNotificationPermission()) {
      console.warn("No hay permiso para mostrar notificaciones")
      return null
    }

    // Opciones por defecto
    const defaultOptions = {
      icon: "/logo192.png", // Asumimos que existe este icono en la carpeta public
      badge: "/logo192.png",
      vibrate: [200, 100, 200],
      ...options,
    }

    try {
      const notification = new Notification(title, defaultOptions)

      // Manejar el clic en la notificación
      if (options.onClick) {
        notification.onclick = options.onClick
      } else if (options.action) {
        notification.onclick = () => {
          window.focus()
          notification.close()

          // Ejecutar la acción especificada
          if (typeof options.action === "function") {
            options.action()
          } else if (options.action.url) {
            window.location.href = options.action.url
          }
        }
      } else {
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      }

      // Registrar la notificación en el almacenamiento local
      const notificationData = {
        id: options.id || `notification-${Date.now()}`,
        title,
        body: options.body || "",
        timestamp: new Date().getTime(),
        read: false,
        type: options.tag || "general",
        data: options.data || {},
        action: options.action || null,
      }

      addNotification(notificationData)

      return notification
    } catch (error) {
      console.error("Error al mostrar notificación:", error)
      return null
    }
  }

  // Obtener todas las notificaciones almacenadas
  const getNotifications = () => {
    return notifications
  }

  // Obtener notificaciones para un usuario específico
  const getNotificationsForUser = (userId) => {
    return notifications.filter((notification) => !notification.userId || notification.userId === userId)
  }

  // Añadir una notificación al almacenamiento
  const addNotification = (notification) => {
    const updatedNotifications = [...notifications, notification]
    setNotifications(updatedNotifications)
    try {
      localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
    } catch (error) {
      console.error("Error al guardar notificaciones:", error)
    }
  }

  // Añadir una notificación para un usuario específico
  const addNotificationForUser = (userId, notification) => {
    const notificationWithUser = {
      ...notification,
      userId,
    }
    addNotification(notificationWithUser)
  }

  // Marcar una notificación como leída
  const markNotificationAsRead = (notificationId) => {
    const updatedNotifications = notifications.map((notification) => {
      if (notification.id === notificationId) {
        return { ...notification, read: true }
      }
      return notification
    })

    setNotifications(updatedNotifications)
    try {
      localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
    } catch (error) {
      console.error("Error al actualizar notificaciones:", error)
    }
  }

  // Eliminar una notificación
  const deleteNotification = (notificationId) => {
    const updatedNotifications = notifications.filter((notification) => notification.id !== notificationId)
    setNotifications(updatedNotifications)
    try {
      localStorage.setItem("notifications", JSON.stringify(updatedNotifications))
    } catch (error) {
      console.error("Error al eliminar notificación:", error)
    }
  }

  // Simular notificación de recordatorio de fichaje
  const simulateClockOutReminder = (userName, startTime) => {
    // Calculamos cuánto tiempo ha pasado desde que el usuario inició su jornada
    const now = new Date()
    const hoursWorked = (now - startTime) / (1000 * 60 * 60)

    // Si han pasado más de 8 horas, enviamos un recordatorio
    if (hoursWorked >= 8) {
      showNotification("¡Recordatorio de fichaje!", {
        id: `clock-reminder-${Date.now()}`,
        body: `Hola ${userName}, parece que llevas más de 8 horas trabajando. ¿Has olvidado fichar tu salida?`,
        tag: "clock-out-reminder", // Para evitar notificaciones duplicadas
        requireInteraction: true, // La notificación permanece visible hasta que el usuario interactúe con ella
        data: { type: "clock-out-reminder", timestamp: now.getTime() },
        action: {
          url: window.location.origin,
          label: "Ir a fichar",
        },
      })

      return true
    }

    return false
  }

  // Valor del contexto (combinando toast y notificaciones)
  const value = {
    // Funciones de toast
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Funciones de notificaciones
    isNotificationSupported,
    requestNotificationPermission,
    hasNotificationPermission,
    showNotification,
    getNotifications,
    getNotificationsForUser,
    addNotification,
    addNotificationForUser,
    markNotificationAsRead: markNotificationAsRead,
    deleteNotification,
    simulateClockOutReminder,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Hook personalizado para usar el contexto
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast debe ser usado dentro de un ToastProvider")
  }
  return context
}
