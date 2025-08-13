/**
 * Servicio unificado de notificaciones
 * Combina notificaciones del sistema y notificaciones push
 */

// Importar el contexto de toast (se usará a través de una función de inicialización)
let showToast = null

// Función para inicializar el servicio con el contexto de toast
export const initNotificationService = (toastContext) => {
  showToast = toastContext
}

// Verificar si las notificaciones están soportadas
export const isNotificationSupported = () => {
  return "Notification" in window
}

// Verificar si tenemos permiso para mostrar notificaciones
export const hasNotificationPermission = () => {
  return isNotificationSupported() && Notification.permission === "granted"
}

// Solicitar permiso para mostrar notificaciones
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

// Mostrar una notificación del sistema
export const showSystemNotification = (title, options = {}) => {
  if (!hasNotificationPermission()) {
    console.warn("No hay permiso para mostrar notificaciones")
    return false
  }

  try {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      ...options,
    })

    // Manejar clic en la notificación
    if (options.onClick) {
      notification.onclick = options.onClick
    }

    return true
  } catch (error) {
    console.error("Error al mostrar notificación:", error)
    return false
  }
}

// Mostrar una notificación toast
export const showToastNotification = (type, message, duration = 5000) => {
  if (!showToast) {
    console.warn("El servicio de toast no está inicializado")
    return false
  }

  switch (type) {
    case "success":
      showToast.showSuccess(message, duration)
      break
    case "error":
      showToast.showError(message, duration)
      break
    case "warning":
      showToast.showWarning(message, duration)
      break
    case "info":
    default:
      showToast.showInfo(message, duration)
      break
  }

  return true
}

// Mostrar una notificación (sistema + toast)
export const showNotification = (title, message, type = "info", options = {}) => {
  // Intentar mostrar notificación del sistema
  const systemShown = showSystemNotification(title, {
    body: message,
    ...options,
  })

  // Mostrar toast como respaldo o complemento
  showToastNotification(type, message)

  return systemShown
}

// Gestionar notificaciones almacenadas
const STORAGE_KEY = "notifications"

// Importar funciones de storage
import { getData, setData } from "./storage"

// Obtener todas las notificaciones
export const getNotifications = () => {
  try {
    const stored = getData(STORAGE_KEY)
    // La función getData ya devuelve un objeto parseado, no necesitamos hacer JSON.parse nuevamente
    return stored || []
  } catch (error) {
    console.error("Error al obtener notificaciones:", error)
    return []
  }
}

// Obtener notificaciones para un usuario específico
export const getNotificationsForUser = (userId) => {
  try {
    const allNotifications = getNotifications()
    return allNotifications.filter((notification) => !notification.userId || notification.userId === userId)
  } catch (error) {
    console.error("Error al obtener notificaciones para usuario:", error)
    return []
  }
}

// Añadir una notificación
export const addNotification = (notification) => {
  try {
    const notifications = getNotifications()

    const newNotification = {
      id: `notif_${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    }

    notifications.unshift(newNotification)

    // Limitar a 50 notificaciones
    const limitedNotifications = notifications.slice(0, 50)

    // setData ya hace JSON.stringify internamente, no necesitamos hacerlo aquí
    setData(STORAGE_KEY, limitedNotifications)

    return newNotification
  } catch (error) {
    console.error("Error al añadir notificación:", error)
    return null
  }
}

// Añadir una notificación para un usuario específico
export const addNotificationForUser = (userId, notification) => {
  try {
    const notificationWithUser = {
      ...notification,
      userId,
    }
    return addNotification(notificationWithUser)
  } catch (error) {
    console.error("Error al añadir notificación para usuario:", error)
    return null
  }
}

// Marcar notificación como leída
export const markNotificationAsRead = (id) => {
  try {
    const notifications = getNotifications()

    const updatedNotifications = notifications.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))

    // setData ya hace JSON.stringify internamente, no necesitamos hacerlo aquí
    setData(STORAGE_KEY, updatedNotifications)

    return true
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error)
    return false
  }
}

// Marcar todas las notificaciones como leídas
export const markAllNotificationsAsRead = () => {
  try {
    const notifications = getNotifications()

    const updatedNotifications = notifications.map((notif) => ({ ...notif, read: true }))

    // setData ya hace JSON.stringify internamente, no necesitamos hacerlo aquí
    setData(STORAGE_KEY, updatedNotifications)

    return true
  } catch (error) {
    console.error("Error al marcar todas las notificaciones como leídas:", error)
    return false
  }
}

// Eliminar una notificación
export const removeNotification = (id) => {
  try {
    const notifications = getNotifications()

    const filteredNotifications = notifications.filter((notif) => notif.id !== id)

    // setData ya hace JSON.stringify internamente, no necesitamos hacerlo aquí
    setData(STORAGE_KEY, filteredNotifications)

    return true
  } catch (error) {
    console.error("Error al eliminar notificación:", error)
    return false
  }
}

// Eliminar todas las notificaciones
export const clearNotifications = () => {
  try {
    // setData ya hace JSON.stringify internamente, no necesitamos hacerlo aquí
    setData(STORAGE_KEY, [])
    return true
  } catch (error) {
    console.error("Error al limpiar notificaciones:", error)
    return false
  }
}

// Obtener el número de notificaciones no leídas
export const getUnreadNotificationsCount = () => {
  try {
    const notifications = getNotifications()
    return notifications.filter((notif) => !notif.read).length
  } catch (error) {
    console.error("Error al contar notificaciones no leídas:", error)
    return 0
  }
}

// Simular una notificación de recordatorio de fichaje
export const simulateClockOutReminder = (userName, startTime) => {
  // Calculamos cuánto tiempo ha pasado desde que el usuario inició su jornada
  const now = new Date()
  const hoursWorked = (now - startTime) / (1000 * 60 * 60)

  // Si han pasado más de 8 horas, enviamos un recordatorio
  if (hoursWorked >= 8) {
    showNotification(
      "¡Recordatorio de fichaje!",
      `Hola ${userName}, parece que llevas más de 8 horas trabajando. ¿Has olvidado fichar tu salida?`,
      "warning",
      {
        tag: "clock-out-reminder",
        requireInteraction: true,
        data: { type: "clock-out-reminder", timestamp: now.getTime() },
        action: {
          url: window.location.origin,
          label: "Ir a fichar",
        },
      },
    )

    return true
  }

  return false
}

// Enviar recordatorio de fichaje de entrada
export const sendClockInReminder = (userName, scheduledTime) => {
  const now = new Date()
  const scheduledDate = new Date(scheduledTime)

  // Formatear la hora programada
  const formattedTime = scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  showNotification(
    "Recordatorio de fichaje de entrada",
    `Hola ${userName}, recuerda que debes fichar tu entrada a las ${formattedTime}.`,
    "info",
    {
      tag: "clock-in-reminder",
      requireInteraction: false,
      data: { type: "clock-in-reminder", scheduledTime },
      action: {
        url: window.location.origin,
        label: "Ir a fichar",
      },
    },
  )

  return true
}

// Enviar recordatorio de ausencia programada
export const sendAbsenceReminder = (userName, absenceData) => {
  const { type, startDate, endDate } = absenceData

  // Formatear las fechas
  const formattedStartDate = new Date(startDate).toLocaleDateString()
  const formattedEndDate = new Date(endDate).toLocaleDateString()

  // Determinar el tipo de ausencia
  let absenceType = "ausencia"
  switch (type) {
    case "vacation":
      absenceType = "vacaciones"
      break
    case "medical":
      absenceType = "permiso médico"
      break
    case "personal":
      absenceType = "permiso personal"
      break
    case "family":
      absenceType = "permiso familiar"
      break
  }

  showNotification(
    "Recordatorio de ausencia",
    `Hola ${userName}, recuerda que tienes ${absenceType} programada desde el ${formattedStartDate} hasta el ${formattedEndDate}.`,
    "info",
    {
      tag: "absence-reminder",
      requireInteraction: false,
      data: { type: "absence-reminder", absenceData },
      action: {
        url: `${window.location.origin}?section=calendar`,
        label: "Ver calendario",
      },
    },
  )

  return true
}

// Crear el objeto notificationService con todas las funciones
export const notificationService = {
  initNotificationService,
  isSupported: isNotificationSupported,
  hasPermission: hasNotificationPermission,
  requestPermission: requestNotificationPermission,
  showSystemNotification,
  showToastNotification,
  showNotification,
  getNotifications,
  getNotificationsForUser,
  addNotification,
  addNotificationForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  removeNotification,
  clearNotifications,
  getUnreadNotificationsCount,
  simulateClockOutReminder,
  sendClockInReminder,
  sendAbsenceReminder,
}

// Exportar el objeto como default también para mantener compatibilidad
export default notificationService
