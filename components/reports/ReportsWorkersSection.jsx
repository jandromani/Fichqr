"use client"

import { useState, useEffect } from "react"
import BaseReportSection from "./BaseReportSection"
import { clockRecordService, workerService } from "../../services/storage"

function ReportsWorkersSection({ user }) {
  // Estado para los filtros del informe
  const [filters, setFilters] = useState({
    worker: "",
    startDate: "",
    endDate: "",
    showIncidents: false,
    showOvertime: false,
  })

  // Estado para almacenar los trabajadores
  const [workers, setWorkers] = useState([])

  // Cargar trabajadores al montar el componente
  useEffect(() => {
    const storedWorkers = workerService.getAll()
    setWorkers(storedWorkers)
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
    return allClockRecords.map((record) => {
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
  }

  // Filtros adicionales para aplicar después de generar el informe
  const additionalFilters = [
    // Filtro para incidencias
    (record, currentFilters) => {
      if (currentFilters.showIncidents && record.status !== "incident") {
        return false
      }
      return true
    },
    // Filtro para horas extra
    (record, currentFilters) => {
      if (currentFilters.showOvertime && (!record.overtime || record.overtime <= 0)) {
        return false
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
      if (type === "checkbox") {
        applyFilters(newFilters)
      }
    }

    return (
      <>
        <div className="form-group">
          <label htmlFor="filter-worker">Trabajador:</label>
          <select id="filter-worker" name="worker" value={filters.worker} onChange={handleFilterChange}>
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
            Solo incidencias
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" name="showOvertime" checked={filters.showOvertime} onChange={handleFilterChange} />
            Solo horas extra
          </label>
        </div>
      </>
    )
  }

  // Renderizar encabezados de tabla
  const renderTableHeader = () => (
    <>
      <th>Fecha</th>
      <th>Trabajador</th>
      <th>Puesto</th>
      <th>Hora Inicio</th>
      <th>Hora Fin</th>
      <th>Horas</th>
      <th>Extra</th>
      <th>Estado</th>
    </>
  )

  // Renderizar fila de tabla
  const renderTableRow = (record) => {
    const rowClass = record.status === "incident" ? "row-incident" : record.overtime > 0 ? "row-overtime" : ""

    return (
      <tr className={rowClass}>
        <td>{record.date.toLocaleDateString()}</td>
        <td>{record.worker}</td>
        <td>{record.position}</td>
        <td>
          {record.startTime ? record.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
        </td>
        <td>{record.endTime ? record.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
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
    )
  }

  return (
    <BaseReportSection
      title="Informes por Trabajador"
      filterControls={renderFilterControls}
      generateReport={generateReport}
      renderTableHeader={renderTableHeader}
      renderTableRow={renderTableRow}
      reportType="workers"
      user={user}
      additionalFilters={additionalFilters}
      emptyMessage="No hay datos que cumplan con los filtros seleccionados."
    />
  )
}

export default ReportsWorkersSection
