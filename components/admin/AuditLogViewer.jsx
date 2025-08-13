"use client"

import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import { useAuth } from "../../contexts/AuthContext"
import ConfirmationModal from "../ui/ConfirmationModal"
import { auditLogService } from "../../services"

function AuditLogViewer() {
  const { user } = useAuth()
  const toast = useToast()

  // Estado para el log de auditoría
  const [auditLog, setAuditLog] = useState([])
  const [filteredLog, setFilteredLog] = useState([])

  // Estado para los filtros
  const [filters, setFilters] = useState({
    action: "",
    userId: "",
    targetId: "",
    context: "",
    startDate: "",
    endDate: "",
  })

  // Estado para la paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Estado para el modal de confirmación
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)

  // Cargar el log de auditoría al montar el componente
  useEffect(() => {
    loadAuditLog()
  }, [])

  // Aplicar filtros cuando cambien
  useEffect(() => {
    applyFilters()
  }, [filters, auditLog])

  // Función para cargar el log de auditoría
  const loadAuditLog = () => {
    const log = auditLogService.getAuditLog()
    setAuditLog(log)
    setFilteredLog(log)
  }

  // Función para aplicar filtros
  const applyFilters = () => {
    let filtered = [...auditLog]

    // Filtrar por acción
    if (filters.action) {
      filtered = filtered.filter((entry) => entry.action.toLowerCase().includes(filters.action.toLowerCase()))
    }

    // Filtrar por usuario
    if (filters.userId) {
      filtered = filtered.filter(
        (entry) =>
          entry.userId === filters.userId ||
          (entry.userName && entry.userName.toLowerCase().includes(filters.userId.toLowerCase())),
      )
    }

    // Filtrar por objetivo
    if (filters.targetId) {
      filtered = filtered.filter((entry) => entry.targetId.toLowerCase().includes(filters.targetId.toLowerCase()))
    }

    // Filtrar por contexto
    if (filters.context) {
      filtered = filtered.filter((entry) => entry.context.toLowerCase().includes(filters.context.toLowerCase()))
    }

    // Filtrar por fecha de inicio
    if (filters.startDate) {
      const startDate = new Date(filters.startDate)
      startDate.setHours(0, 0, 0, 0)
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        return entryDate >= startDate
      })
    }

    // Filtrar por fecha de fin
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp)
        return entryDate <= endDate
      })
    }

    setFilteredLog(filtered)
    setCurrentPage(1) // Resetear a la primera página al aplicar filtros
  }

  // Función para manejar cambios en los filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Función para resetear los filtros
  const resetFilters = () => {
    setFilters({
      action: "",
      userId: "",
      targetId: "",
      context: "",
      startDate: "",
      endDate: "",
    })
  }

  // Función para exportar el log
  const handleExport = () => {
    try {
      const url = auditLogService.exportAuditLog()

      if (!url) {
        toast.showError("Error al exportar el log de auditoría")
        return
      }

      // Crear un enlace para descargar el archivo
      const a = document.createElement("a")
      a.href = url
      a.download = `audit_log_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      document.body.appendChild(a)
      a.click()

      // Limpiar
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.showSuccess("Log de auditoría exportado correctamente")
    } catch (error) {
      console.error("Error al exportar el log:", error)
      toast.showError("Error al exportar el log de auditoría")
    }
  }

  // Función para limpiar el log
  const handleClearLog = () => {
    setShowClearConfirmation(true)
  }

  // Función para confirmar la limpieza del log
  const confirmClearLog = () => {
    if (user && user.role === "admin") {
      const success = auditLogService.clearAuditLog(user)

      if (success) {
        toast.showSuccess("Log de auditoría limpiado correctamente")
        loadAuditLog()
      } else {
        toast.showError("Error al limpiar el log de auditoría")
      }
    } else {
      toast.showError("Solo los administradores pueden limpiar el log de auditoría")
    }

    setShowClearConfirmation(false)
  }

  // Calcular paginación
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredLog.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredLog.length / itemsPerPage)

  // Función para cambiar de página
  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Función para obtener el nombre de la acción
  const getActionName = (action) => {
    const actionNames = {
      createClockRecord: "Crear fichaje",
      updateClockRecord: "Actualizar fichaje",
      deleteClockRecord: "Eliminar fichaje",
      endClockRecord: "Finalizar fichaje",
      createAbsenceRequest: "Crear solicitud de ausencia",
      updateAbsenceRequest: "Actualizar solicitud de ausencia",
      deleteAbsenceRequest: "Eliminar solicitud de ausencia",
      approveAbsenceRequest: "Aprobar solicitud de ausencia",
      rejectAbsenceRequest: "Rechazar solicitud de ausencia",
      updateLockedRecord: "Intento de modificar registro bloqueado",
      updateTamperedRecord: "Intento de modificar registro manipulado",
      clearAuditLog: "Limpiar log de auditoría",
    }

    return actionNames[action] || action
  }

  return (
    <div className="audit-log-viewer">
      <div className="audit-log-header">
        <h3 className="text-lg font-semibold mb-4">Log de Auditoría ({filteredLog.length} entradas)</h3>

        <div className="audit-log-actions mb-4 flex gap-2">
          <button onClick={handleExport} className="action-btn">
            Exportar Log
          </button>
          {user && user.role === "admin" && (
            <button onClick={handleClearLog} className="action-btn danger">
              Limpiar Log
            </button>
          )}
        </div>
      </div>

      <div className="audit-log-filters mb-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Filtros</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-group">
            <label htmlFor="action">Acción:</label>
            <input
              type="text"
              id="action"
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="Ej: createClockRecord"
            />
          </div>

          <div className="form-group">
            <label htmlFor="userId">Usuario:</label>
            <input
              type="text"
              id="userId"
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              className="form-input"
              placeholder="ID o nombre de usuario"
            />
          </div>

          <div className="form-group">
            <label htmlFor="startDate">Fecha inicio:</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">Fecha fin:</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button onClick={resetFilters} className="action-btn secondary">
            Resetear Filtros
          </button>
        </div>
      </div>

      {filteredLog.length === 0 ? (
        <div className="no-data-message">
          <p>No hay entradas en el log de auditoría que coincidan con los filtros.</p>
        </div>
      ) : (
        <>
          <div className="audit-log-table-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>Objetivo</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-200">
                    <td className="py-2">{formatDate(entry.timestamp)}</td>
                    <td>{getActionName(entry.action)}</td>
                    <td>{entry.userName || entry.userId}</td>
                    <td>{entry.targetId}</td>
                    <td>
                      <button
                        className="text-blue-500 hover:underline"
                        onClick={() => {
                          alert(JSON.stringify(entry.details, null, 2))
                        }}
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination mt-4 flex justify-center">
              <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="pagination-btn">
                &laquo; Anterior
              </button>

              <span className="pagination-info mx-4">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Siguiente &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de confirmación para limpiar el log */}
      <ConfirmationModal
        isOpen={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        onConfirm={confirmClearLog}
        title="Limpiar log de auditoría"
        message="¿Estás seguro de que deseas limpiar el log de auditoría? Esta acción no se puede deshacer, aunque se creará una copia de seguridad."
        confirmText="Limpiar log"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}

export default AuditLogViewer
