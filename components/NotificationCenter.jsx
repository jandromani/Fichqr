"use client"

import { useState, useEffect, useRef } from "react"
import notificationService from "../services/notificationService"
import { useToast } from "../contexts/ToastContext"

function NotificationCenter({ user }) {
  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Estado para las notificaciones
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissionGranted, setPermissionGranted] = useState(false)

  // Referencia al panel de notificaciones para detectar clics fuera
  const notificationPanelRef = useRef(null)

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    loadNotifications()

    // Verificar si tenemos permiso para mostrar notificaciones
    setPermissionGranted(notificationService.hasPermission())

    // Actualizar notificaciones cada minuto
    const interval = setInterval(loadNotifications, 60000)

    // Añadir event listener para cerrar el panel al hacer clic fuera
    const handleClickOutside = (event) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target) &&
        !event.target.closest(".notification-button")
      ) {
        setShowNotifications(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      clearInterval(interval)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Efecto para cargar notificaciones específicas del usuario
  useEffect(() => {
    if (user && user.id) {
      loadNotificationsForUser()
    }
  }, [user])

  // Cargar notificaciones desde el servicio
  const loadNotifications = () => {
    const allNotifications = notificationService.getNotifications()
    setNotifications(allNotifications)

    // Contar notificaciones no leídas
    const unread = allNotifications.filter((notification) => !notification.read).length
    setUnreadCount(unread)
  }

  // Cargar notificaciones específicas del usuario
  const loadNotificationsForUser = () => {
    if (!user || !user.id) return

    const userNotifications = notificationService.getNotificationsForUser(user.id)
    setNotifications(userNotifications)

    // Contar notificaciones no leídas
    const unread = userNotifications.filter((notification) => !notification.read).length
    setUnreadCount(unread)
  }

  // Solicitar permiso para mostrar notificaciones
  const requestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission()
    setPermissionGranted(granted)

    if (granted) {
      // Mostrar notificación de prueba
      notificationService.showNotification("Notificaciones activadas", {
        body: "Ahora recibirás recordatorios importantes sobre tus fichajes y solicitudes.",
        tag: "welcome-notification",
      })

      // Mostrar toast de éxito
      toast.showSuccess("Notificaciones activadas correctamente")
    } else {
      // Mostrar toast de error
      toast.showError("No se pudo activar las notificaciones")
    }
  }

  // Marcar una notificación como leída
  const handleMarkAsRead = (notificationId) => {
    notificationService.markAsRead(notificationId)
    loadNotifications()
  }

  // Eliminar una notificación
  const handleDeleteNotification = (notificationId) => {
    notificationService.deleteNotification(notificationId)
    loadNotifications()
  }

  // Marcar todas las notificaciones como leídas
  const handleMarkAllAsRead = () => {
    notifications.forEach((notification) => {
      if (!notification.read) {
        notificationService.markAsRead(notification.id)
      }
    })
    loadNotifications()
    toast.showSuccess("Todas las notificaciones marcadas como leídas")
  }

  // Eliminar todas las notificaciones
  const handleDeleteAllNotifications = () => {
    notifications.forEach((notification) => {
      notificationService.deleteNotification(notification.id)
    })
    loadNotifications()
    toast.showSuccess("Todas las notificaciones eliminadas")
  }

  // Ejecutar acción de notificación
  const handleNotificationAction = (notification, event) => {
    event.stopPropagation() // Evitar que se marque como leída

    // Marcar como leída
    notificationService.markAsRead(notification.id)

    // Cerrar panel de notificaciones
    setShowNotifications(false)

    // Ejecutar acción según el tipo de notificación
    if (notification.action) {
      if (typeof notification.action === "function") {
        notification.action()
      } else if (notification.action.url) {
        window.location.href = notification.action.url
      }
    } else {
      // Acciones por defecto según el tipo
      switch (notification.type) {
        case "clock-out-reminder":
          // Redirigir a la página de fichaje
          window.location.href = window.location.origin
          break
        case "vacation-request-approved":
        case "vacation-request-rejected":
          // Redirigir a la sección de vacaciones
          window.location.href = `${window.location.origin}?section=vacations`
          break
        case "absence-reminder":
          // Redirigir al calendario
          window.location.href = `${window.location.origin}?section=calendar`
          break
        default:
          // No hacer nada
          break
      }
    }

    // Recargar notificaciones
    loadNotifications()
  }

  // Formatear fecha de la notificación
  const formatNotificationDate = (timestamp) => {
    const now = new Date()
    const date = new Date(timestamp)

    // Si es hoy, mostrar solo la hora
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // Si es ayer, mostrar "Ayer" y la hora
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }

    // Si es esta semana, mostrar el día de la semana y la hora
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (daysDiff < 7) {
      return (
        date.toLocaleDateString([], { weekday: "long" }) +
        `, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      )
    }

    // Si es más antiguo, mostrar la fecha completa
    return date.toLocaleString()
  }

  // Obtener icono según el tipo de notificación
  const getNotificationIcon = (type) => {
    switch (type) {
      case "clock-out-reminder":
      case "clock-in-reminder":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="notification-type-icon clock"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        )
      case "vacation-request-approved":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="notification-type-icon approved"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        )
      case "vacation-request-rejected":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="notification-type-icon rejected"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        )
      case "absence-reminder":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="notification-type-icon absence"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        )
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="notification-type-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        )
    }
  }

  return (
    <div className="notification-center">
      {/* Botón de notificaciones */}
      <div className="notification-button" onClick={() => setShowNotifications(!showNotifications)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="notification-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </div>

      {/* Panel de notificaciones */}
      {showNotifications && (
        <div className="notification-panel" ref={notificationPanelRef}>
          <div className="notification-header">
            <h3>Notificaciones</h3>
            <div className="notification-header-actions">
              {notifications.length > 0 && (
                <>
                  <button
                    className="notification-header-btn"
                    onClick={handleMarkAllAsRead}
                    title="Marcar todas como leídas"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </button>
                  <button
                    className="notification-header-btn"
                    onClick={handleDeleteAllNotifications}
                    title="Eliminar todas"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </>
              )}
              <button className="notification-close" onClick={() => setShowNotifications(false)}>
                ×
              </button>
            </div>
          </div>

          {!permissionGranted && (
            <div className="notification-permission">
              <p>Activa las notificaciones para recibir recordatorios importantes.</p>
              <button className="notification-permission-btn" onClick={requestNotificationPermission}>
                Activar notificaciones
              </button>
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="notification-empty-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-gray-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? "unread" : ""}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="notification-icon-container">{getNotificationIcon(notification.type)}</div>
                  <div className="notification-content">
                    <h4 className="notification-title">{notification.title}</h4>
                    <p className="notification-body">{notification.body}</p>
                    <span className="notification-time">{formatNotificationDate(notification.timestamp)}</span>

                    {/* Acciones rápidas */}
                    {!notification.read && (notification.action || notification.type) && (
                      <div className="notification-actions">
                        <button
                          className="notification-action-btn"
                          onClick={(e) => handleNotificationAction(notification, e)}
                        >
                          {notification.action && notification.action.label
                            ? notification.action.label
                            : notification.type === "clock-out-reminder"
                              ? "Ir a fichar"
                              : notification.type === "vacation-request-approved" ||
                                  notification.type === "vacation-request-rejected"
                                ? "Ver solicitudes"
                                : notification.type === "absence-reminder"
                                  ? "Ver calendario"
                                  : "Ver detalles"}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className="notification-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNotification(notification.id)
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Botones para simular notificaciones (solo para pruebas) */}
          <div className="notification-test-actions">
            <h4 className="notification-test-title">Simular notificaciones</h4>
            <div className="notification-test-buttons">
              <button
                className="notification-test-btn"
                onClick={() => {
                  notificationService.showNotification("Notificación de prueba", {
                    body: "Esta es una notificación de prueba.",
                    tag: "test-notification",
                  })
                  loadNotifications()
                }}
              >
                Notificación básica
              </button>

              <button
                className="notification-test-btn"
                onClick={() => {
                  if (user) {
                    const startTime = new Date()
                    startTime.setHours(startTime.getHours() - 9) // Simulamos que empezó hace 9 horas
                    notificationService.simulateClockOutReminder(user.name, startTime)
                    loadNotifications()
                  }
                }}
              >
                Recordatorio de fichaje
              </button>

              <button
                className="notification-test-btn"
                onClick={() => {
                  if (user) {
                    // Simular recordatorio de ausencia
                    const startDate = new Date()
                    startDate.setDate(startDate.getDate() + 1)
                    const endDate = new Date(startDate)
                    endDate.setDate(endDate.getDate() + 3)

                    notificationService.sendAbsenceReminder(user.name, {
                      type: "vacation",
                      startDate,
                      endDate,
                    })
                    loadNotifications()
                  }
                }}
              >
                Recordatorio de ausencia
              </button>

              <button
                className="notification-test-btn"
                onClick={() => {
                  if (user) {
                    // Simular aprobación de solicitud
                    const startDate = new Date()
                    startDate.setDate(startDate.getDate() + 5)
                    const endDate = new Date(startDate)
                    endDate.setDate(endDate.getDate() + 2)

                    notificationService.sendRequestApprovalNotification(user.name, {
                      type: "vacation",
                      startDate,
                      endDate,
                      approvalComment: "Disfruta tus vacaciones",
                    })
                    loadNotifications()
                  }
                }}
              >
                Solicitud aprobada
              </button>

              <button
                className="notification-test-btn"
                onClick={() => {
                  if (user) {
                    // Simular rechazo de solicitud
                    const startDate = new Date()
                    startDate.setDate(startDate.getDate() + 5)
                    const endDate = new Date(startDate)
                    endDate.setDate(endDate.getDate() + 2)

                    notificationService.sendRequestRejectionNotification(user.name, {
                      type: "vacation",
                      startDate,
                      endDate,
                      rejectionReason: "Alta carga de trabajo en esas fechas",
                    })
                    loadNotifications()
                  }
                }}
              >
                Solicitud rechazada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter
