"use client"

import { useState, useEffect } from "react"
import ReportExporter from "../ReportExporter"
import { useAuth } from "../../contexts/AuthContext"
import { useToast } from "../../contexts/ToastContext"
import { clockRecordService, workerService } from "../../services/storageService"

function ReportsWorkersSection() {
  // Usar el contexto de autenticación
  const { user } = useAuth()

  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Estado para los filtros del informe
  const [filters, setFilters] = useState({
    worker: "",
    startDate: "",
    endDate: "",
    showIncidents: false,
    showOvertime: false,
  })

  // Estado para los datos del informe
  const [reportData, setReportData] = useState([])
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Estado para almacenar los trabajadores
  const [workers, setWorkers] = useState([])

  // Cargar trabajadores al montar el componente
  useEffect(() => {
    const storedWorkers = workerService.getAll()
    setWorkers(storedWorkers)
  }, [])

  // Función para generar el informe con datos reales
  const handleGenerateReport = () => {
    // Validar fechas
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate)
      const end = new Date(filters.endDate)

      if (start > end) {
        toast.showError("La fecha de inicio no puede ser posterior a la fecha de fin")
        return
      }
    }

    setIsGenerating(true)

    // Obtener todos los registros de fichaje
    let allClockRecords = clockRecordService.getAll()

    // Filtrar por trabajador si se ha seleccionado uno
    if (filters.worker) {
      allClockRecords = allClockRecords.filter((record) => record.userId === filters.worker)
    }

    // Filtrar por fechas si se han especificado
    if (filters.startDate) {
      const startDate = new Date(filters.startDate)
      startDate.setHours(0, 0, 0, 0)
      allClockRecords = allClockRecords.filter((record) => {
        const recordDate = new Date(record.date)
        return recordDate >= startDate
      })
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999)
      allClockRecords = allClockRecords.filter((record) => {
        const recordDate = new Date(record.date)
        return recordDate <= endDate
      })
    }

    // Procesar los registros para el informe
    const processedRecords = allClockRecords.map((record) => {
      // Calcular horas extra (si las hay)
      const overtime = record.overtime || 0

      // Calcular duración total de pausas
      const totalPauseDuration = record.pauses
        ? record.pauses.reduce((total, pause) => total + (pause.duration || 0), 0)
        : 0

      return {
        id: record.id,
        worker: record.userName,
        workerId: record.userId,
        position: record.positionName,
        date: new Date(record.date),
        startTime: record.startTime ? new Date(record.startTime) : null,
        endTime: record.endTime ? new Date(record.endTime) : null,
        hours: record.duration ? Math.round((record.duration / 60) * 10) / 10 : null, // Convertir minutos a horas con 1 decimal
        overtime: overtime,
        pausesDuration: totalPauseDuration,
        status: record.status,
        incidentType: record.incidentType,
        incidentReason: record.incidentReason,
      }
    })

    setReportData(processedRecords)
    setHasGeneratedReport(true)
    setIsGenerating(false)

    if (processedRecords.length === 0) {
      toast.showInfo("No se encontraron registros con los filtros seleccionados")
    } else {
      toast.showSuccess(`Informe generado con ${processedRecords.length} registros`)
    }
  }

  // Filtrar los datos según los filtros adicionales
  const filteredReportData = reportData.filter((record) => {
    // Filtrar por incidencias si está activado
    if (filters.showIncidents && record.status !== "incident") {
      return false
    }

    // Filtrar por horas extra si está activado
    if (filters.showOvertime && (!record.overtime || record.overtime <= 0)) {
      return false
    }

    return true
  })

  return (
    <div className="section">
      <h2>Informes por Trabajador</h2>

      <div className="report-filters">
        <div className="form-group">
          <label htmlFor="filter-worker">Trabajador:</label>
          <select
            id="filter-worker"
            value={filters.worker}
            onChange={(e) => setFilters({ ...filters, worker: e.target.value })}
          >
            <option value="">Todos</option>
            {workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="filter-start-date">Fecha inicio:</label>
          <input
            type="date"
            id="filter-start-date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="filter-end-date">Fecha fin:</label>
          <input
            type="date"
            id="filter-end-date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={filters.showIncidents}
              onChange={(e) => setFilters({ ...filters, showIncidents: e.target.checked })}
            />
            Solo incidencias
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={filters.showOvertime}
              onChange={(e) => setFilters({ ...filters, showOvertime: e.target.checked })}
            />
            Solo horas extra
          </label>
        </div>

        <button onClick={handleGenerateReport} className="action-btn" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <span className="loading-spinner"></span>
              <span>Generando...</span>
            </>
          ) : (
            "Generar Informe"
          )}
        </button>
      </div>

      <div className="report-results">
        <div className="report-header">
          <h3>Resultados</h3>

          {hasGeneratedReport && reportData.length > 0 && (
            <ReportExporter
              data={filteredReportData}
              reportType="workers"
              filters={filters}
              title="Informe de Trabajadores"
              user={user}
            />
          )}
        </div>

        {!hasGeneratedReport ? (
          <div className="no-data-message">
            <p>Selecciona los filtros y haz clic en "Generar Informe" para ver los resultados.</p>
            <p>Aquí podrás ver los informes una vez haya datos de fichajes.</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="no-data-message">
            <p>No hay datos disponibles para los filtros seleccionados.</p>
          </div>
        ) : filteredReportData.length === 0 ? (
          <div className="no-data-message">
            <p>No hay datos que cumplan con los filtros adicionales seleccionados.</p>
          </div>
        ) : (
          <div className="report-table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Trabajador</th>
                  <th>Puesto</th>
                  <th>Hora Inicio</th>
                  <th>Hora Fin</th>
                  <th>Horas</th>
                  <th>Extra</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredReportData.map((record, index) => (
                  <tr
                    key={index}
                    className={
                      record.status === "incident" ? "row-incident" : record.overtime > 0 ? "row-overtime" : ""
                    }
                  >
                    <td>{record.date.toLocaleDateString()}</td>
                    <td>{record.worker}</td>
                    <td>{record.position}</td>
                    <td>
                      {record.startTime
                        ? record.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "-"}
                    </td>
                    <td>
                      {record.endTime
                        ? record.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "-"}
                    </td>
                    <td>{record.hours || "-"}</td>
                    <td className={record.overtime > 0 ? "overtime-cell" : ""}>{record.overtime || 0}</td>
                    <td className={`status-cell ${record.status}`}>
                      {record.status === "completed"
                        ? "Completado"
                        : record.status === "incident"
                          ? "Incidencia"
                          : record.status === "in-progress"
                            ? "En curso"
                            : record.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsWorkersSection
