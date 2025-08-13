"use client"

import { useState, useEffect } from "react"
import BaseReportSection from "./BaseReportSection"
import { clockRecordService, positionService } from "../../services/storage"

function ReportsPositionsSection({ user }) {
  // Estado para los filtros del informe
  const [filters, setFilters] = useState({
    position: "",
    startDate: "",
    endDate: "",
    showIncidents: false,
    minHours: "",
  })

  // Estado para almacenar las posiciones
  const [positions, setPositions] = useState([])

  // Cargar posiciones al montar el componente
  useEffect(() => {
    const storedPositions = positionService.getAll()
    setPositions(storedPositions)
  }, [])

  // Función para generar el informe con datos reales
  const generateReport = async () => {
    // Validar fechas
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate)
      const end = new Date(filters.endDate)

      if (start > end) {
        throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin")
      }
    }

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
    return Object.values(positionDateMap).map((item) => ({
      ...item,
      workers: item.workers.size,
      totalHours: Math.round(item.totalHours * 10) / 10, // Redondear a 1 decimal
      normalHours: Math.round(item.normalHours * 10) / 10,
      overtime: Math.round(item.overtime * 10) / 10,
      position: item.positionName,
    }))
  }

  // Filtros adicionales para aplicar después de generar el informe
  const additionalFilters = [
    // Filtro para incidencias
    (record, currentFilters) => {
      if (currentFilters.showIncidents && record.incidents <= 0) {
        return false
      }
      return true
    },
    // Filtro para horas mínimas
    (record, currentFilters) => {
      if (currentFilters.minHours && Number.parseFloat(currentFilters.minHours) > 0) {
        if (record.totalHours < Number.parseFloat(currentFilters.minHours)) {
          return false
        }
      }
      return true
    },
  ]

  // Renderizar controles de filtro
  const renderFilterControls = (applyFilters) => {
    const handleFilterChange = (e) => {
      const { name, value, type, checked } = e.target
      const newFilters = {
        ...filters,
        [name]: type === "checkbox" ? checked : value,
      }
      setFilters(newFilters)

      // Si cambian los filtros adicionales, aplicarlos
      if (type === "checkbox" || name === "minHours") {
        applyFilters(newFilters)
      }
    }

    return (
      <>
        <div className="form-group">
          <label htmlFor="filter-position">Puesto:</label>
          <select id="filter-position" name="position" value={filters.position} onChange={handleFilterChange}>
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
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="filter-end-date">Fecha fin:</label>
          <input
            type="date"
            id="filter-end-date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" name="showIncidents" checked={filters.showIncidents} onChange={handleFilterChange} />
            Solo con incidencias
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="filter-min-hours">Horas mínimas:</label>
          <input
            type="number"
            id="filter-min-hours"
            name="minHours"
            value={filters.minHours}
            onChange={handleFilterChange}
            min="0"
            step="1"
          />
        </div>
      </>
    )
  }

  // Renderizar encabezados de tabla
  const renderTableHeader = () => (
    <>
      <th>Fecha</th>
      <th>Puesto</th>
      <th>Horas Totales</th>
      <th>Horas Normales</th>
      <th>Horas Extra</th>
      <th>Trabajadores</th>
      <th>Incidencias</th>
    </>
  )

  // Renderizar fila de tabla
  const renderTableRow = (record) => {
    const rowClass = record.incidents > 0 ? "row-incident" : record.overtime > 0 ? "row-overtime" : ""

    return (
      <tr className={rowClass}>
        <td>{record.date.toLocaleDateString()}</td>
        <td>{record.position}</td>
        <td>{record.totalHours}</td>
        <td>{record.normalHours}</td>
        <td className={record.overtime > 0 ? "overtime-cell" : ""}>{record.overtime}</td>
        <td>{record.workers}</td>
        <td className={record.incidents > 0 ? "incident-cell" : ""}>{record.incidents}</td>
      </tr>
    )
  }

  return (
    <BaseReportSection
      title="Informes por Puesto"
      filterControls={renderFilterControls}
      generateReport={generateReport}
      renderTableHeader={renderTableHeader}
      renderTableRow={renderTableRow}
      reportType="positions"
      user={user}
      additionalFilters={additionalFilters}
      emptyMessage="No hay datos que cumplan con los filtros adicionales seleccionados."
    />
  )
}

export default ReportsPositionsSection
