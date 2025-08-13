"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
// Añadir la importación del componente LockedBadge
import LockedBadge from "./LockedBadge"

/**
 * Componente tipo drawer para mostrar detalles de eventos del calendario
 * Optimizado para móviles con diseño de bottom sheet en pantallas pequeñas
 * @param {boolean} isOpen - Si el drawer está abierto
 * @param {function} onClose - Función para cerrar el drawer
 * @param {object} event - Evento a mostrar
 */
function EventDetailsDrawer({ isOpen, onClose, event }) {
  if (!isOpen || !event) return null

  // Formatear tiempo para mostrar
  const formatTime = (date) => {
    if (!date) return "N/A"
    return typeof date === "string" ? date : format(date, "HH:mm", { locale: es })
  }

  // Formatear fecha para mostrar
  const formatDate = (date) => {
    if (!date) return "N/A"
    return typeof date === "string" ? date : format(date, "dd/MM/yyyy", { locale: es })
  }

  // Obtener el título del evento
  const getEventTitle = () => {
    if (event.eventType === "clock") {
      return `Fichaje en ${event.positionName}`
    } else if (event.eventType === "absence") {
      return getAbsenceTypeText(event.type)
    }
    return "Evento"
  }

  // Obtener el texto del tipo de ausencia
  const getAbsenceTypeText = (type) => {
    switch (type) {
      case "vacation":
        return "Vacaciones"
      case "medical":
        return "Permiso médico"
      case "personal":
        return "Asuntos personales"
      case "family":
        return "Asuntos familiares"
      default:
        return type
    }
  }

  // Obtener el texto del estado del evento
  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completado"
      case "in-progress":
        return "En curso"
      case "incident":
        return "Incidencia"
      case "approved":
        return "Aprobado"
      case "pending":
        return "Pendiente"
      case "rejected":
        return "Rechazado"
      default:
        return status
    }
  }

  // Obtener el color del estado
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "status-completed"
      case "in-progress":
        return "status-in-progress"
      case "incident":
        return "status-incident"
      case "approved":
        return "status-approved"
      case "pending":
        return "status-pending"
      case "rejected":
        return "status-rejected"
      default:
        return ""
    }
  }

  // Obtener el texto del tipo de incidencia
  const getIncidentTypeText = (type) => {
    switch (type) {
      case "early-leave":
        return "Salida anticipada"
      case "late-arrival":
        return "Llegada tardía"
      case "missing-clock-out":
        return "Falta de fichaje de salida"
      case "missing-clock-in":
        return "Falta de fichaje de entrada"
      default:
        return type || "Otro"
    }
  }

  // Obtener el texto del tipo de pausa
  const getPauseTypeText = (type) => {
    switch (type) {
      case "lunch":
        return "Comida"
      case "break":
        return "Descanso"
      case "personal":
        return "Personal"
      default:
        return type || "Pausa"
    }
  }

  return (
    <div id="event-details-drawer" className={`event-details-drawer ${isOpen ? "open" : ""}`}>
      <div className="drawer-header">
        <h3>{getEventTitle()}</h3>
        <button className="drawer-close-btn" onClick={onClose}>
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
      </div>

      <div className="drawer-content">
        {/* Mostrar detalles según el tipo de evento */}
        {event.eventType === "clock" && (
          <div className="event-details-content">
            <div className="detail-section">
              {/* Mostrar la información general del fichaje */}
              {/* y añadir el indicador de bloqueo */}
              <div className="detail-header">
                <h4>Información general</h4>
                <div className="flex items-center gap-2">
                  <span className={`status-badge ${getStatusColor(event.status)}`}>{getStatusText(event.status)}</span>
                  {event.locked && <LockedBadge isLocked={true} />}
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Puesto:</span>
                  <span className="detail-value">{event.positionName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fecha:</span>
                  <span className="detail-value">{formatDate(event.date)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Hora inicio:</span>
                  <span className="detail-value">{formatTime(event.startTime)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Hora fin:</span>
                  <span className="detail-value">{event.endTime ? formatTime(event.endTime) : "En curso"}</span>
                </div>
                {event.duration && (
                  <div className="detail-item">
                    <span className="detail-label">Duración:</span>
                    <span className="detail-value">{event.duration} horas</span>
                  </div>
                )}
                {event.overtime > 0 && (
                  <div className="detail-item">
                    <span className="detail-label">Horas extra:</span>
                    <span className="detail-value overtime">{event.overtime} horas</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mostrar incidencias si las hay */}
            {event.status === "incident" && (
              <div className="detail-section">
                <h4>Detalles de la incidencia</h4>
                <div className="incident-details">
                  <div className="detail-item">
                    <span className="detail-label">Tipo:</span>
                    <span className="detail-value incident">{getIncidentTypeText(event.incidentType)}</span>
                  </div>
                  {event.incidentReason && (
                    <div className="detail-item">
                      <span className="detail-label">Motivo:</span>
                      <span className="detail-value">{event.incidentReason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mostrar pausas si las hay */}
            {event.pauses && event.pauses.length > 0 && (
              <div className="detail-section">
                <h4>Pausas registradas</h4>
                <div className="pauses-list">
                  {event.pauses.map((pause, index) => (
                    <div key={index} className="pause-item">
                      <div className="pause-header">
                        <span className="pause-type">{getPauseTypeText(pause.type)}</span>
                        <span className="pause-duration">{pause.duration} min</span>
                      </div>
                      <div className="pause-time">
                        {formatTime(pause.start)} - {formatTime(pause.end)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mostrar detalles de ausencias */}
        {event.eventType === "absence" && (
          <div className="event-details-content">
            <div className="detail-section">
              <div className="detail-header">
                <h4>Información general</h4>
                <span className={`status-badge ${getStatusColor(event.status)}`}>{getStatusText(event.status)}</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Tipo:</span>
                  <span className="detail-value">{getAbsenceTypeText(event.type)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fecha inicio:</span>
                  <span className="detail-value">{formatDate(event.startDate)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fecha fin:</span>
                  <span className="detail-value">{formatDate(event.endDate)}</span>
                </div>
                {event.reason && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Motivo:</span>
                    <span className="detail-value">{event.reason}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mostrar motivo de rechazo si está rechazada */}
            {event.status === "rejected" && event.rejectionReason && (
              <div className="detail-section">
                <h4>Motivo de rechazo</h4>
                <div className="rejection-reason">{event.rejectionReason}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="drawer-footer">
        <button className="drawer-action-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default EventDetailsDrawer
