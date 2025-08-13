"use client"

import { useState, useEffect, useRef } from "react"
import Calendar from "react-calendar"
import { format, isSameDay, isWithinInterval } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "../../contexts/ToastContext"
import EventDetailsDrawer from "../ui/EventDetailsDrawer"
import { clockRecordService, absenceRequestService } from "../../services/storageService"

/**
 * Componente de calendario interactivo que muestra fichajes, pausas, ausencias y otros eventos
 * @param {Object} user - Información del usuario actual
 */
function CalendarSection({ user }) {
  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Estado para la fecha seleccionada
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Estado para los eventos del día seleccionado
  const [dayEvents, setDayEvents] = useState([])

  // Estado para controlar la visibilidad del drawer de detalles
  const [showDrawer, setShowDrawer] = useState(false)

  // Estado para el evento seleccionado para ver detalles
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Referencia para el contenedor del calendario (para scroll en móviles)
  const calendarContainerRef = useRef(null)

  // Estado para almacenar los registros de fichaje
  const [clockRecords, setClockRecords] = useState([])

  // Estado para almacenar las solicitudes de ausencia
  const [absenceRequests, setAbsenceRequests] = useState([])

  // Cargar datos desde localStorage al montar el componente
  useEffect(() => {
    loadUserData()
  }, [user])

  // Función para cargar datos del usuario
  const loadUserData = () => {
    if (!user || !user.id) return

    // Cargar registros de fichaje del usuario
    const allClockRecords = clockRecordService.getAll()
    const userClockRecords = allClockRecords.filter((record) => record.userId === user.id)
    setClockRecords(userClockRecords)

    // Cargar solicitudes de ausencia del usuario
    const allAbsenceRequests = absenceRequestService.getAll()
    const userAbsenceRequests = allAbsenceRequests.filter((request) => request.employeeId === user.id)
    setAbsenceRequests(userAbsenceRequests)
  }

  // Efecto para cargar los eventos del día seleccionado
  useEffect(() => {
    // Filtramos los fichajes del día seleccionado
    const dayClockRecords = clockRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return isSameDay(recordDate, selectedDate)
    })

    // Filtramos las solicitudes de ausencia que incluyen el día seleccionado
    const dayAbsences = absenceRequests.filter((request) => {
      const startDate = new Date(request.startDate)
      const endDate = new Date(request.endDate)
      return isWithinInterval(selectedDate, {
        start: startDate,
        end: endDate,
      })
    })

    // Combinamos todos los eventos
    const allEvents = [
      ...dayClockRecords.map((record) => ({
        ...record,
        eventType: "clock",
        title: `Fichaje en ${record.positionName}`,
        time: record.endTime
          ? `${formatTime(new Date(record.startTime))} - ${formatTime(new Date(record.endTime))}`
          : `${formatTime(new Date(record.startTime))} - En curso`,
      })),
      ...dayAbsences.map((absence) => ({
        ...absence,
        eventType: "absence",
        title: getAbsenceTypeText(absence.type),
        time: isSameDay(new Date(absence.startDate), new Date(absence.endDate))
          ? "Todo el día"
          : `${format(new Date(absence.startDate), "dd/MM")} - ${format(new Date(absence.endDate), "dd/MM")}`,
      })),
    ]

    setDayEvents(allEvents)
  }, [selectedDate, clockRecords, absenceRequests])

  // Función para formatear la hora
  const formatTime = (date) => {
    return format(date, "HH:mm", { locale: es })
  }

  // Función para obtener el texto del tipo de ausencia
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

  /**
   * Función para obtener las clases CSS para cada día en el calendario
   * Cada clase representa un tipo de evento diferente y se visualiza con un color o indicador específico
   */
  const getTileClassName = ({ date, view }) => {
    if (view !== "month") return ""

    const classes = []

    // Verificar si hay fichajes en este día
    const clockRecord = clockRecords.find((record) => {
      const recordDate = new Date(record.date)
      return isSameDay(recordDate, date)
    })

    if (clockRecord) {
      // Añadir clase según el estado del fichaje
      if (clockRecord.status === "completed") {
        classes.push("has-clock-record") // Fichaje completado (punto azul)
      } else if (clockRecord.status === "in-progress") {
        classes.push("has-clock-in-progress") // Fichaje en curso (punto naranja)
      } else if (clockRecord.status === "incident") {
        classes.push("has-clock-incident") // Fichaje con incidencia (punto rojo)
      }

      // Si tiene horas extra, añadir indicador
      if (clockRecord.overtime > 0) {
        classes.push("has-overtime") // Horas extra (borde superior verde)
      }
    }

    // Verificar si hay ausencias aprobadas en este día
    const approvedAbsence = absenceRequests.find((request) => {
      const startDate = new Date(request.startDate)
      const endDate = new Date(request.endDate)
      return (
        request.status === "approved" &&
        isWithinInterval(date, {
          start: startDate,
          end: endDate,
        })
      )
    })

    if (approvedAbsence) {
      // Añadir clase según el tipo de ausencia
      if (approvedAbsence.type === "vacation") {
        classes.push("has-vacation") // Vacaciones (fondo verde claro)
      } else if (approvedAbsence.type === "medical") {
        classes.push("has-medical") // Permiso médico (fondo azul claro)
      } else {
        classes.push("has-approved-absence") // Otras ausencias aprobadas (fondo verde muy claro)
      }
    }

    // Verificar si hay ausencias pendientes en este día
    const pendingAbsence = absenceRequests.find((request) => {
      const startDate = new Date(request.startDate)
      const endDate = new Date(request.endDate)
      return (
        request.status === "pending" &&
        isWithinInterval(date, {
          start: startDate,
          end: endDate,
        })
      )
    })

    if (pendingAbsence) {
      classes.push("has-pending-absence") // Ausencia pendiente (borde punteado amarillo)
    }

    // Verificar si hay ausencias rechazadas en este día
    const rejectedAbsence = absenceRequests.find((request) => {
      const startDate = new Date(request.startDate)
      const endDate = new Date(request.endDate)
      return (
        request.status === "rejected" &&
        isWithinInterval(date, {
          start: startDate,
          end: endDate,
        })
      )
    })

    if (rejectedAbsence) {
      classes.push("has-rejected-absence") // Ausencia rechazada (borde punteado rojo)
    }

    return classes.join(" ")
  }

  // Función para formatear la fecha
  const formatDateHeader = (date) => {
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  }

  // Función para obtener el color del evento
  const getEventColor = (eventType, status, type) => {
    if (eventType === "clock") {
      if (status === "in-progress") return "bg-orange-100 border-orange-300"
      if (status === "incident") return "bg-red-100 border-red-300"
      return "bg-blue-100 border-blue-300"
    }

    if (eventType === "absence") {
      if (status === "approved") {
        if (type === "vacation") return "bg-green-100 border-green-300"
        if (type === "medical") return "bg-blue-100 border-blue-300"
        return "bg-teal-100 border-teal-300"
      }
      if (status === "pending") return "bg-yellow-100 border-yellow-300"
      if (status === "rejected") return "bg-red-100 border-red-300"
    }

    return "bg-gray-100 border-gray-300"
  }

  // Función para manejar el clic en un evento
  const handleEventClick = (event) => {
    setSelectedEvent(event)
    setShowDrawer(true)

    // En móviles, hacer scroll al drawer
    if (window.innerWidth < 768) {
      setTimeout(() => {
        const drawerElement = document.getElementById("event-details-drawer")
        if (drawerElement) {
          drawerElement.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    }
  }

  // Función para cerrar el drawer
  const handleCloseDrawer = () => {
    setShowDrawer(false)
    setSelectedEvent(null)
  }

  // Función para obtener el ícono del evento
  const getEventIcon = (eventType, status, type) => {
    if (eventType === "clock") {
      if (status === "in-progress") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="event-icon text-orange-500"
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
      }
      if (status === "incident") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="event-icon text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        )
      }
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="event-icon text-blue-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      )
    }

    if (eventType === "absence") {
      if (type === "vacation") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="event-icon text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.67 2.21"></path>
            <path d="M21 3v9h-9"></path>
          </svg>
        )
      }
      if (type === "medical") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="event-icon text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            <path d="M12 11h.01"></path>
            <path d="M8 8h.01"></path>
            <path d="M16 8h.01"></path>
            <path d="M12 8h.01"></path>
            <path d="M12 16h.01"></path>
            <path d="M16 11h.01"></path>
            <path d="M8 11h.01"></path>
          </svg>
        )
      }
      if (status === "pending") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="event-icon text-yellow-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )
      }
      if (status === "rejected") {
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="event-icon text-red-500"
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
      }
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="event-icon text-teal-500"
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
    }

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="event-icon text-gray-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    )
  }

  // Función para exportar los eventos del día seleccionado
  const handleExportDayEvents = () => {
    if (dayEvents.length === 0) {
      toast.showWarning("No hay eventos para exportar en este día")
      return
    }

    // Aquí se podría implementar la exportación de eventos
    // Por ahora, solo mostramos un mensaje
    toast.showInfo(`Exportando ${dayEvents.length} eventos del día ${format(selectedDate, "dd/MM/yyyy")}`)
  }

  return (
    <div className="section">
      <h2>Calendario de Fichajes y Ausencias</h2>

      <div className="calendar-container" ref={calendarContainerRef}>
        <div className="calendar-wrapper">
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            locale="es-ES"
            tileClassName={getTileClassName}
            className="react-calendar"
          />

          <div className="calendar-legend">
            {/* Leyenda para fichajes */}
            <div className="legend-section">
              <h4 className="legend-title">Fichajes</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-color legend-work"></span>
                  <span>Día trabajado</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color legend-in-progress"></span>
                  <span>En curso</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color legend-incident"></span>
                  <span>Incidencia</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color legend-overtime"></span>
                  <span>Horas extra</span>
                </div>
              </div>
            </div>

            {/* Leyenda para ausencias */}
            <div className="legend-section">
              <h4 className="legend-title">Ausencias</h4>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-color legend-vacation"></span>
                  <span>Vacaciones</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color legend-medical"></span>
                  <span>Médico</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color legend-absence"></span>
                  <span>Otras ausencias</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color legend-pending"></span>
                  <span>Pendiente</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color legend-rejected"></span>
                  <span>Rechazada</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="day-events">
          <div className="day-header-container">
            <h3 className="day-header">{formatDateHeader(selectedDate)}</h3>
            <button onClick={handleExportDayEvents} className="export-day-btn" title="Exportar eventos del día">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>

          {dayEvents.length === 0 ? (
            <div className="no-events">
              <p>No hay eventos para este día</p>
            </div>
          ) : (
            <div className="events-list">
              {dayEvents.map((event, index) => (
                <div
                  key={index}
                  className={`event-card ${getEventColor(event.eventType, event.status, event.type)}`}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="event-header">
                    <div className="event-title-container">
                      {getEventIcon(event.eventType, event.status, event.type)}
                      <h4 className="event-title">{event.title}</h4>
                    </div>
                    <span className="event-time">{event.time}</span>
                  </div>

                  {event.eventType === "clock" && (
                    <div className="event-details">
                      {event.status === "in-progress" ? (
                        <p className="event-status in-progress">En curso</p>
                      ) : event.status === "incident" ? (
                        <p className="event-status incident">
                          Incidencia: {event.incidentType === "early-leave" ? "Salida anticipada" : "Otro"}
                        </p>
                      ) : (
                        <p>Duración: {event.duration} minutos</p>
                      )}
                      {event.pauses && event.pauses.length > 0 && (
                        <p className="event-pauses-summary">
                          {event.pauses.length} {event.pauses.length === 1 ? "pausa" : "pausas"}
                        </p>
                      )}
                    </div>
                  )}

                  {event.eventType === "absence" && (
                    <div className="event-details">
                      <p className={`event-status ${event.status}`}>
                        {event.status === "approved"
                          ? "Aprobada"
                          : event.status === "pending"
                            ? "Pendiente"
                            : "Rechazada"}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer para detalles del evento */}
      <EventDetailsDrawer isOpen={showDrawer} onClose={handleCloseDrawer} event={selectedEvent} />
    </div>
  )
}

export default CalendarSection
