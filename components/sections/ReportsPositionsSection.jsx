"use client"

import { useState, useEffect } from "react"
import ReportExporter from "../ReportExporter"
import { useAuth } from "../../contexts/AuthContext"
import { useToast } from "../../contexts/ToastContext"
import { clockRecordService, positionService } from "../../services/storageService"

function ReportsPositionsSection() {
  // Usar el contexto de autenticación
  const { user } = useAuth()

  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Estado para los filtros del informe
  const [filters, setFilters] = useState({
    position: "",
    startDate: "",
    endDate: "",
    showIncidents: false,
    minHours: "",
  })

  // Estado para los datos del informe
  const [reportData, setReportData] = useState([])
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Estado para almacenar las posiciones
  const [positions, setPositions] = useState([])

  // Cargar posiciones al montar el componente
  useEffect(() => {
    const storedPositions = positionService.getAll()
    setPositions(storedPositions)
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

    // Filtrar por posición si se ha seleccionado una
    if (filters.position) {
      allClockRecords = allClockRecords.filter((record) => record.positionId === filters.position)
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

    // Agrupar registros por posición y fecha
    const positionDateMap = {}

    allClockRecords.forEach((record) => {
      const positionId = record.positionId
      const dateStr = record.date.split("T")[0] // Formato YYYY-MM-DD

      const key = `${positionId}_${dateStr}`

      if (!positionDateMap[key]) {
        positionDateMap[key] = {
          positionId,
          positionName: record.positionName,
          date: new Date(dateStr),
          totalHours: 0,
          normalHours: 0,
          overtime: 0,
          workers: new Set(),
          incidents: 0,
        }
      }

      // Añadir horas trabajadas
      if (record.duration) {
        const hours = record.duration / 60 // Convertir minutos a horas
        positionDateMap[key].totalHours += hours

        // Añadir horas extra si las hay
        const overtime = record.overtime || 0
        positionDateMap[key].overtime += overtime
        positionDateMap[key].normalHours += hours - overtime
      }

      // Añadir trabajador único
      positionDateMap[key].workers.add(record.userId)

      // Contar incidencias
      if (record.status === "incident") {
        positionDateMap[key].incidents += 1
      }
    })

    // Convertir el mapa a un array para el informe
    const processedData = Object.values(positionDateMap).map((item) => ({
      ...item,
      workers: item.workers.size,
      totalHours: Math.round(item.totalHours * 10) / 10, // Redondear a 1 decimal
      normalHours: Math.round(item.normalHours * 10) / 10,
      overtime: Math.round(item.overtime * 10) / 10,
      position: item.positionName,
    }))

    setReportData(processedData)
    setHasGeneratedReport(true)
    setIsGenerating(false)

    if (processedData.length === 0) {
      toast.showInfo("No se encontraron registros con los filtros seleccionados")
    } else {
      toast.showSuccess(`Informe generado con datos de ${processedData.length} posiciones/días`)
    }
  }

  // Filtrar los datos según los filtros adicionales
  const filteredReportData = reportData.filter((record) => {
    // Filtrar por incidencias si está activado
    if (filters.showIncidents && record.incidents <= 0) {
      return false
    }

    // Filtrar por horas mínimas si está especificado
    if (filters.minHours && Number.parseFloat(filters.minHours) > 0) {
      if (record.totalHours < Number.parseFloat(filters.minHours)) {
        return false
      }
    }

    return true
  })

  return (
    <div className="section">
      <h2>Informes por Puesto</h2>

      <div className="report-filters">
        <div className="form-group">
          <label htmlFor="filter-position">Puesto:</label>
          <select
            id="filter-position"
            value={filters.position}
            onChange={(e) => setFilters({ ...filters, position: e.target.value })}
          >
            <option value="">Todos</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.name}
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
            Solo con incidencias
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="filter-min-hours">Horas mínimas:</label>
          <input
            type="number"
            id="filter-min-hours"
            value={filters.minHours}
            onChange={(e) => setFilters({ ...filters, minHours: e.target.value })}
            min="0"
            step="1"
          />
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
              reportType="positions"
              filters={filters}
              title="Informe de Puestos"
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
                  <th>Puesto</th>
                  <th>Horas Totales</th>
                  <th>Horas Normales</th>
                  <th>Horas Extra</th>
                  <th>Trabajadores</th>
                  <th>Incidencias</th>
                </tr>
              </thead>
              <tbody>
                {filteredReportData.map((record, index) => (
                  <tr
                    key={index}
                    className={record.incidents > 0 ? "row-incident" : record.overtime > 0 ? "row-overtime" : ""}
                  >
                    <td>{record.date.toLocaleDateString()}</td>
                    <td>{record.position}</td>
                    <td>{record.totalHours}</td>
                    <td>{record.normalHours}</td>
                    <td className={record.overtime > 0 ? "overtime-cell" : ""}>{record.overtime}</td>
                    <td>{record.workers}</td>
                    <td className={record.incidents > 0 ? "incident-cell" : ""}>{record.incidents}</td>
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

export default ReportsPositionsSection
