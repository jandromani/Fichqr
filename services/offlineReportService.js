/**
 * Servicio para generación de informes en modo offline
 * Permite crear y exportar informes sin necesidad de conexión a internet
 */
import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getItem, setItem } from "./storageService"
import { clockRecordService } from "./storage/clockRecordService"
import { workerService } from "./storage/workerService"
import { positionService } from "./storage/positionService"
import { compressionService } from "./compressionService"
import { auditLogService } from "./auditLogService"

// Tipos de informes disponibles
export const REPORT_TYPES = {
  WORKER_HOURS: "worker_hours",
  POSITION_HOURS: "position_hours",
  DAILY_SUMMARY: "daily_summary",
  MONTHLY_SUMMARY: "monthly_summary",
  ABSENCE_REPORT: "absence_report",
  CUSTOM: "custom",
}

// Formatos de exportación
export const EXPORT_FORMATS = {
  JSON: "json",
  CSV: "csv",
  HTML: "html",
  PDF: "pdf", // Requiere biblioteca adicional
}

class OfflineReportService {
  constructor() {
    this.reports = []
    this.loadReports()
  }

  /**
   * Carga los informes guardados
   */
  async loadReports() {
    try {
      const savedReports = await getItem(STORAGE_KEYS.OFFLINE_REPORTS)
      if (savedReports) {
        const decompressedReports = await compressionService.decompress(savedReports)
        this.reports = JSON.parse(decompressedReports)
      }
    } catch (error) {
      console.error("Error al cargar informes offline:", error)
      this.reports = []
    }
  }

  /**
   * Guarda los informes
   */
  async saveReports() {
    try {
      const reportsString = JSON.stringify(this.reports)
      const compressedReports = await compressionService.compress(reportsString)
      await setItem(STORAGE_KEYS.OFFLINE_REPORTS, compressedReports)
    } catch (error) {
      console.error("Error al guardar informes offline:", error)
    }
  }

  /**
   * Genera un informe de horas por trabajador
   * @param {Object} options - Opciones del informe
   * @param {string} options.workerId - ID del trabajador (opcional)
   * @param {Date} options.startDate - Fecha de inicio
   * @param {Date} options.endDate - Fecha de fin
   * @param {string} options.name - Nombre del informe
   * @returns {Object} - Informe generado
   */
  async generateWorkerHoursReport(options) {
    try {
      const { workerId, startDate, endDate, name } = options
      const startTimestamp = new Date(startDate).getTime()
      const endTimestamp = new Date(endDate).getTime()

      // Obtener todos los trabajadores si no se especifica uno
      let workers = []
      if (workerId) {
        const worker = await workerService.getWorker(workerId)
        if (worker) workers = [worker]
      } else {
        workers = await workerService.getAllWorkers()
      }

      // Obtener registros de fichaje para el período
      const allClockRecords = await clockRecordService.getAllClockRecords()

      // Filtrar por fecha y organizar por trabajador
      const filteredRecords = allClockRecords.filter((record) => {
        const recordTime = new Date(record.timestamp).getTime()
        return recordTime >= startTimestamp && recordTime <= endTimestamp
      })

      // Agrupar por trabajador
      const workerRecords = {}
      workers.forEach((worker) => {
        workerRecords[worker.id] = {
          worker: worker,
          records: filteredRecords.filter((record) => record.workerId === worker.id),
          totalHours: 0,
          days: {},
        }
      })

      // Calcular horas por día y totales
      for (const workerId in workerRecords) {
        const workerData = workerRecords[workerId]
        const records = workerData.records

        // Agrupar por día
        records.forEach((record) => {
          const date = new Date(record.timestamp).toISOString().split("T")[0]

          if (!workerData.days[date]) {
            workerData.days[date] = {
              date,
              records: [],
              totalHours: 0,
            }
          }

          workerData.days[date].records.push(record)
        })

        // Calcular horas por día
        for (const date in workerData.days) {
          const dayData = workerData.days[date]
          const dayRecords = dayData.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

          let totalMinutes = 0
          for (let i = 0; i < dayRecords.length; i += 2) {
            if (i + 1 < dayRecords.length) {
              const clockIn = new Date(dayRecords[i].timestamp)
              const clockOut = new Date(dayRecords[i + 1].timestamp)
              const diffMinutes = (clockOut - clockIn) / (1000 * 60)
              totalMinutes += diffMinutes
            }
          }

          dayData.totalHours = totalMinutes / 60
          workerData.totalHours += dayData.totalHours
        }
      }

      // Crear informe
      const report = {
        id: uuidv4(),
        type: REPORT_TYPES.WORKER_HOURS,
        name: name || `Informe de horas por trabajador ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        options: {
          workerId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        data: workerRecords,
      }

      // Guardar informe
      this.reports.push(report)
      await this.saveReports()

      // Registrar en log de auditoría
      auditLogService.logEvent("report_generated", {
        reportId: report.id,
        reportType: report.type,
        reportName: report.name,
      })

      return report
    } catch (error) {
      console.error("Error al generar informe de horas por trabajador:", error)
      throw error
    }
  }

  /**
   * Genera un informe de horas por posición
   * @param {Object} options - Opciones del informe
   * @param {string} options.positionId - ID de la posición (opcional)
   * @param {Date} options.startDate - Fecha de inicio
   * @param {Date} options.endDate - Fecha de fin
   * @param {string} options.name - Nombre del informe
   * @returns {Object} - Informe generado
   */
  async generatePositionHoursReport(options) {
    try {
      const { positionId, startDate, endDate, name } = options
      const startTimestamp = new Date(startDate).getTime()
      const endTimestamp = new Date(endDate).getTime()

      // Obtener todas las posiciones si no se especifica una
      let positions = []
      if (positionId) {
        const position = await positionService.getPosition(positionId)
        if (position) positions = [position]
      } else {
        positions = await positionService.getAllPositions()
      }

      // Obtener registros de fichaje y trabajadores
      const allClockRecords = await clockRecordService.getAllClockRecords()
      const allWorkers = await workerService.getAllWorkers()

      // Crear mapa de trabajadores para acceso rápido
      const workersMap = {}
      allWorkers.forEach((worker) => {
        workersMap[worker.id] = worker
      })

      // Filtrar por fecha
      const filteredRecords = allClockRecords.filter((record) => {
        const recordTime = new Date(record.timestamp).getTime()
        return recordTime >= startTimestamp && recordTime <= endTimestamp
      })

      // Agrupar por posición
      const positionRecords = {}
      positions.forEach((position) => {
        positionRecords[position.id] = {
          position: position,
          records: [],
          workers: {},
          totalHours: 0,
        }
      })

      // Asignar registros a posiciones según el trabajador
      filteredRecords.forEach((record) => {
        const worker = workersMap[record.workerId]
        if (worker && worker.positionId && positionRecords[worker.positionId]) {
          positionRecords[worker.positionId].records.push(record)

          // Inicializar datos del trabajador si no existe
          if (!positionRecords[worker.positionId].workers[worker.id]) {
            positionRecords[worker.positionId].workers[worker.id] = {
              worker: worker,
              records: [],
              totalHours: 0,
            }
          }

          positionRecords[worker.positionId].workers[worker.id].records.push(record)
        }
      })

      // Calcular horas por trabajador y posición
      for (const positionId in positionRecords) {
        const positionData = positionRecords[positionId]

        for (const workerId in positionData.workers) {
          const workerData = positionData.workers[workerId]
          const workerRecords = workerData.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

          let totalMinutes = 0
          for (let i = 0; i < workerRecords.length; i += 2) {
            if (i + 1 < workerRecords.length) {
              const clockIn = new Date(workerRecords[i].timestamp)
              const clockOut = new Date(workerRecords[i + 1].timestamp)
              const diffMinutes = (clockOut - clockIn) / (1000 * 60)
              totalMinutes += diffMinutes
            }
          }

          workerData.totalHours = totalMinutes / 60
          positionData.totalHours += workerData.totalHours
        }
      }

      // Crear informe
      const report = {
        id: uuidv4(),
        type: REPORT_TYPES.POSITION_HOURS,
        name: name || `Informe de horas por posición ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        options: {
          positionId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        data: positionRecords,
      }

      // Guardar informe
      this.reports.push(report)
      await this.saveReports()

      // Registrar en log de auditoría
      auditLogService.logEvent("report_generated", {
        reportId: report.id,
        reportType: report.type,
        reportName: report.name,
      })

      return report
    } catch (error) {
      console.error("Error al generar informe de horas por posición:", error)
      throw error
    }
  }

  /**
   * Genera un informe diario
   * @param {Object} options - Opciones del informe
   * @param {Date} options.date - Fecha del informe
   * @param {string} options.name - Nombre del informe
   * @returns {Object} - Informe generado
   */
  async generateDailySummaryReport(options) {
    try {
      const { date, name } = options
      const reportDate = new Date(date)
      const startOfDay = new Date(reportDate.setHours(0, 0, 0, 0)).getTime()
      const endOfDay = new Date(reportDate.setHours(23, 59, 59, 999)).getTime()

      // Obtener registros de fichaje y trabajadores
      const allClockRecords = await clockRecordService.getAllClockRecords()
      const allWorkers = await workerService.getAllWorkers()
      const allPositions = await positionService.getAllPositions()

      // Crear mapas para acceso rápido
      const workersMap = {}
      allWorkers.forEach((worker) => {
        workersMap[worker.id] = worker
      })

      const positionsMap = {}
      allPositions.forEach((position) => {
        positionsMap[position.id] = position
      })

      // Filtrar registros por fecha
      const dayRecords = allClockRecords.filter((record) => {
        const recordTime = new Date(record.timestamp).getTime()
        return recordTime >= startOfDay && recordTime <= endOfDay
      })

      // Agrupar por trabajador
      const workerRecords = {}
      dayRecords.forEach((record) => {
        if (!workerRecords[record.workerId]) {
          const worker = workersMap[record.workerId]
          workerRecords[record.workerId] = {
            worker: worker,
            position: worker && worker.positionId ? positionsMap[worker.positionId] : null,
            records: [],
            totalHours: 0,
          }
        }

        workerRecords[record.workerId].records.push(record)
      })

      // Calcular horas por trabajador
      for (const workerId in workerRecords) {
        const workerData = workerRecords[workerId]
        const records = workerData.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        let totalMinutes = 0
        for (let i = 0; i < records.length; i += 2) {
          if (i + 1 < records.length) {
            const clockIn = new Date(records[i].timestamp)
            const clockOut = new Date(records[i + 1].timestamp)
            const diffMinutes = (clockOut - clockIn) / (1000 * 60)
            totalMinutes += diffMinutes
          }
        }

        workerData.totalHours = totalMinutes / 60
      }

      // Estadísticas generales
      const summary = {
        date: reportDate.toISOString(),
        totalWorkers: Object.keys(workerRecords).length,
        totalClockRecords: dayRecords.length,
        totalHours: Object.values(workerRecords).reduce((sum, worker) => sum + worker.totalHours, 0),
        averageHoursPerWorker: 0,
        workersByPosition: {},
      }

      // Calcular promedio de horas
      if (summary.totalWorkers > 0) {
        summary.averageHoursPerWorker = summary.totalHours / summary.totalWorkers
      }

      // Agrupar trabajadores por posición
      for (const workerId in workerRecords) {
        const workerData = workerRecords[workerId]
        if (workerData.position) {
          const positionId = workerData.position.id

          if (!summary.workersByPosition[positionId]) {
            summary.workersByPosition[positionId] = {
              position: workerData.position,
              workers: [],
              totalHours: 0,
            }
          }

          summary.workersByPosition[positionId].workers.push(workerData)
          summary.workersByPosition[positionId].totalHours += workerData.totalHours
        }
      }

      // Crear informe
      const report = {
        id: uuidv4(),
        type: REPORT_TYPES.DAILY_SUMMARY,
        name: name || `Resumen diario ${reportDate.toLocaleDateString()}`,
        createdAt: new Date().toISOString(),
        options: {
          date: reportDate.toISOString(),
        },
        data: {
          summary,
          workerRecords,
        },
      }

      // Guardar informe
      this.reports.push(report)
      await this.saveReports()

      // Registrar en log de auditoría
      auditLogService.logEvent("report_generated", {
        reportId: report.id,
        reportType: report.type,
        reportName: report.name,
      })

      return report
    } catch (error) {
      console.error("Error al generar informe diario:", error)
      throw error
    }
  }

  /**
   * Genera un informe mensual
   * @param {Object} options - Opciones del informe
   * @param {number} options.year - Año del informe
   * @param {number} options.month - Mes del informe (1-12)
   * @param {string} options.name - Nombre del informe
   * @returns {Object} - Informe generado
   */
  async generateMonthlySummaryReport(options) {
    try {
      const { year, month, name } = options

      // Calcular fechas de inicio y fin del mes
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999)

      const startTimestamp = startDate.getTime()
      const endTimestamp = endDate.getTime()

      // Obtener registros de fichaje y trabajadores
      const allClockRecords = await clockRecordService.getAllClockRecords()
      const allWorkers = await workerService.getAllWorkers()
      const allPositions = await positionService.getAllPositions()

      // Crear mapas para acceso rápido
      const workersMap = {}
      allWorkers.forEach((worker) => {
        workersMap[worker.id] = worker
      })

      const positionsMap = {}
      allPositions.forEach((position) => {
        positionsMap[position.id] = position
      })

      // Filtrar registros por fecha
      const monthRecords = allClockRecords.filter((record) => {
        const recordTime = new Date(record.timestamp).getTime()
        return recordTime >= startTimestamp && recordTime <= endTimestamp
      })

      // Agrupar por trabajador
      const workerRecords = {}
      monthRecords.forEach((record) => {
        if (!workerRecords[record.workerId]) {
          const worker = workersMap[record.workerId]
          workerRecords[record.workerId] = {
            worker: worker,
            position: worker && worker.positionId ? positionsMap[worker.positionId] : null,
            records: [],
            totalHours: 0,
            days: {},
          }
        }

        workerRecords[record.workerId].records.push(record)

        // Agrupar por día
        const recordDate = new Date(record.timestamp).toISOString().split("T")[0]
        if (!workerRecords[record.workerId].days[recordDate]) {
          workerRecords[record.workerId].days[recordDate] = {
            date: recordDate,
            records: [],
            totalHours: 0,
          }
        }

        workerRecords[record.workerId].days[recordDate].records.push(record)
      })

      // Calcular horas por trabajador y día
      for (const workerId in workerRecords) {
        const workerData = workerRecords[workerId]

        for (const date in workerData.days) {
          const dayData = workerData.days[date]
          const dayRecords = dayData.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

          let totalMinutes = 0
          for (let i = 0; i < dayRecords.length; i += 2) {
            if (i + 1 < dayRecords.length) {
              const clockIn = new Date(dayRecords[i].timestamp)
              const clockOut = new Date(dayRecords[i + 1].timestamp)
              const diffMinutes = (clockOut - clockIn) / (1000 * 60)
              totalMinutes += diffMinutes
            }
          }

          dayData.totalHours = totalMinutes / 60
          workerData.totalHours += dayData.totalHours
        }
      }

      // Estadísticas generales
      const summary = {
        year,
        month,
        totalDays: endDate.getDate(),
        totalWorkers: Object.keys(workerRecords).length,
        totalClockRecords: monthRecords.length,
        totalHours: Object.values(workerRecords).reduce((sum, worker) => sum + worker.totalHours, 0),
        averageHoursPerWorker: 0,
        averageHoursPerDay: 0,
        workersByPosition: {},
      }

      // Calcular promedios
      if (summary.totalWorkers > 0) {
        summary.averageHoursPerWorker = summary.totalHours / summary.totalWorkers
      }

      if (summary.totalDays > 0) {
        summary.averageHoursPerDay = summary.totalHours / summary.totalDays
      }

      // Agrupar trabajadores por posición
      for (const workerId in workerRecords) {
        const workerData = workerRecords[workerId]
        if (workerData.position) {
          const positionId = workerData.position.id

          if (!summary.workersByPosition[positionId]) {
            summary.workersByPosition[positionId] = {
              position: workerData.position,
              workers: [],
              totalHours: 0,
            }
          }

          summary.workersByPosition[positionId].workers.push(workerData)
          summary.workersByPosition[positionId].totalHours += workerData.totalHours
        }
      }

      // Crear informe
      const report = {
        id: uuidv4(),
        type: REPORT_TYPES.MONTHLY_SUMMARY,
        name: name || `Resumen mensual ${startDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`,
        createdAt: new Date().toISOString(),
        options: {
          year,
          month,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        data: {
          summary,
          workerRecords,
        },
      }

      // Guardar informe
      this.reports.push(report)
      await this.saveReports()

      // Registrar en log de auditoría
      auditLogService.logEvent("report_generated", {
        reportId: report.id,
        reportType: report.type,
        reportName: report.name,
      })

      return report
    } catch (error) {
      console.error("Error al generar informe mensual:", error)
      throw error
    }
  }

  /**
   * Obtiene un informe por su ID
   * @param {string} reportId - ID del informe
   * @returns {Object} - Informe encontrado o null
   */
  getReport(reportId) {
    return this.reports.find((report) => report.id === reportId) || null
  }

  /**
   * Obtiene todos los informes
   * @returns {Array} - Lista de informes
   */
  getAllReports() {
    return [...this.reports]
  }

  /**
   * Elimina un informe
   * @param {string} reportId - ID del informe a eliminar
   * @returns {boolean} - true si se eliminó correctamente
   */
  async deleteReport(reportId) {
    const initialLength = this.reports.length
    this.reports = this.reports.filter((report) => report.id !== reportId)

    if (this.reports.length !== initialLength) {
      await this.saveReports()

      // Registrar en log de auditoría
      auditLogService.logEvent("report_deleted", {
        reportId,
      })

      return true
    }

    return false
  }

  /**
   * Exporta un informe a un formato específico
   * @param {string} reportId - ID del informe
   * @param {string} format - Formato de exportación (EXPORT_FORMATS)
   * @returns {Blob|string} - Datos del informe en el formato especificado
   */
  async exportReport(reportId, format = EXPORT_FORMATS.JSON) {
    const report = this.getReport(reportId)
    if (!report) {
      throw new Error(`Informe con ID ${reportId} no encontrado`)
    }

    try {
      switch (format) {
        case EXPORT_FORMATS.JSON:
          return this.exportToJSON(report)
        case EXPORT_FORMATS.CSV:
          return this.exportToCSV(report)
        case EXPORT_FORMATS.HTML:
          return this.exportToHTML(report)
        case EXPORT_FORMATS.PDF:
          throw new Error("Exportación a PDF no implementada")
        default:
          throw new Error(`Formato de exportación ${format} no soportado`)
      }
    } catch (error) {
      console.error(`Error al exportar informe a ${format}:`, error)
      throw error
    }
  }

  /**
   * Exporta un informe a formato JSON
   * @param {Object} report - Informe a exportar
   * @returns {Blob} - Blob con los datos en formato JSON
   */
  exportToJSON(report) {
    const jsonData = JSON.stringify(report, null, 2)
    return new Blob([jsonData], { type: "application/json" })
  }

  /**
   * Exporta un informe a formato CSV
   * @param {Object} report - Informe a exportar
   * @returns {Blob} - Blob con los datos en formato CSV
   */
  exportToCSV(report) {
    let csvContent = ""

    // El formato CSV depende del tipo de informe
    switch (report.type) {
      case REPORT_TYPES.WORKER_HOURS:
        csvContent = this.workerHoursToCSV(report)
        break
      case REPORT_TYPES.POSITION_HOURS:
        csvContent = this.positionHoursToCSV(report)
        break
      case REPORT_TYPES.DAILY_SUMMARY:
        csvContent = this.dailySummaryToCSV(report)
        break
      case REPORT_TYPES.MONTHLY_SUMMARY:
        csvContent = this.monthlySummaryToCSV(report)
        break
      default:
        csvContent = this.genericReportToCSV(report)
    }

    return new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  }

  /**
   * Convierte un informe de horas por trabajador a CSV
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido CSV
   */
  workerHoursToCSV(report) {
    let csv = "ID Trabajador,Nombre,Posición,Fecha,Horas\n"

    const { data } = report

    for (const workerId in data) {
      const workerData = data[workerId]
      const worker = workerData.worker

      for (const date in workerData.days) {
        const dayData = workerData.days[date]

        csv += `${worker.id},${worker.name},${worker.position || ""},${date},${dayData.totalHours.toFixed(2)}\n`
      }
    }

    return csv
  }

  /**
   * Convierte un informe de horas por posición a CSV
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido CSV
   */
  positionHoursToCSV(report) {
    let csv = "ID Posición,Nombre Posición,ID Trabajador,Nombre Trabajador,Horas Totales\n"

    const { data } = report

    for (const positionId in data) {
      const positionData = data[positionId]
      const position = positionData.position

      for (const workerId in positionData.workers) {
        const workerData = positionData.workers[workerId]
        const worker = workerData.worker

        csv += `${position.id},${position.name},${worker.id},${worker.name},${workerData.totalHours.toFixed(2)}\n`
      }
    }

    return csv
  }

  /**
   * Convierte un informe diario a CSV
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido CSV
   */
  dailySummaryToCSV(report) {
    let csv = "Fecha,ID Trabajador,Nombre,Posición,Hora Entrada,Hora Salida,Horas Trabajadas\n"

    const { data } = report
    const { workerRecords } = data

    for (const workerId in workerRecords) {
      const workerData = workerRecords[workerId]
      const worker = workerData.worker
      const records = workerData.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      for (let i = 0; i < records.length; i += 2) {
        if (i + 1 < records.length) {
          const clockIn = new Date(records[i].timestamp)
          const clockOut = new Date(records[i + 1].timestamp)
          const diffHours = (clockOut - clockIn) / (1000 * 60 * 60)

          csv += `${clockIn.toLocaleDateString()},${worker.id},${worker.name},${workerData.position?.name || ""},${clockIn.toLocaleTimeString()},${clockOut.toLocaleTimeString()},${diffHours.toFixed(2)}\n`
        }
      }
    }

    return csv
  }

  /**
   * Convierte un informe mensual a CSV
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido CSV
   */
  monthlySummaryToCSV(report) {
    let csv = "Año,Mes,ID Trabajador,Nombre,Posición,Día,Horas Trabajadas\n"

    const { data, options } = report
    const { workerRecords } = data
    const { year, month } = options

    for (const workerId in workerRecords) {
      const workerData = workerRecords[workerId]
      const worker = workerData.worker

      for (const date in workerData.days) {
        const dayData = workerData.days[date]
        const day = new Date(date).getDate()

        csv += `${year},${month},${worker.id},${worker.name},${workerData.position?.name || ""},${day},${dayData.totalHours.toFixed(2)}\n`
      }
    }

    return csv
  }

  /**
   * Convierte un informe genérico a CSV
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido CSV
   */
  genericReportToCSV(report) {
    // Convertir el informe completo a CSV básico
    let csv = `Tipo de informe,${report.type}\n`
    csv += `Nombre,${report.name}\n`
    csv += `Fecha de creación,${new Date(report.createdAt).toLocaleString()}\n\n`

    // Añadir opciones
    csv += "Opciones:\n"
    for (const key in report.options) {
      csv += `${key},${report.options[key]}\n`
    }

    return csv
  }

  /**
   * Exporta un informe a formato HTML
   * @param {Object} report - Informe a exportar
   * @returns {Blob} - Blob con los datos en formato HTML
   */
  exportToHTML(report) {
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${report.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .report-header { margin-bottom: 20px; }
          .report-summary { margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>${report.name}</h1>
          <p>Generado el: ${new Date(report.createdAt).toLocaleString()}</p>
          <p>Tipo: ${report.type}</p>
        </div>
    `

    // El contenido HTML depende del tipo de informe
    switch (report.type) {
      case REPORT_TYPES.WORKER_HOURS:
        htmlContent += this.workerHoursToHTML(report)
        break
      case REPORT_TYPES.POSITION_HOURS:
        htmlContent += this.positionHoursToHTML(report)
        break
      case REPORT_TYPES.DAILY_SUMMARY:
        htmlContent += this.dailySummaryToHTML(report)
        break
      case REPORT_TYPES.MONTHLY_SUMMARY:
        htmlContent += this.monthlySummaryToHTML(report)
        break
      default:
        htmlContent += this.genericReportToHTML(report)
    }

    htmlContent += `
      </body>
      </html>
    `

    return new Blob([htmlContent], { type: "text/html;charset=utf-8;" })
  }

  /**
   * Convierte un informe de horas por trabajador a HTML
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido HTML
   */
  workerHoursToHTML(report) {
    const { data, options } = report
    let html = `
      <div class="report-summary">
        <h2>Resumen</h2>
        <p>Período: ${new Date(options.startDate).toLocaleDateString()} - ${new Date(options.endDate).toLocaleDateString()}</p>
        <p>Total de trabajadores: ${Object.keys(data).length}</p>
      </div>
    `

    for (const workerId in data) {
      const workerData = data[workerId]
      const worker = workerData.worker

      html += `
        <h2>Trabajador: ${worker.name}</h2>
        <p>Posición: ${worker.position || "No asignada"}</p>
        <p>Total de horas: ${workerData.totalHours.toFixed(2)}</p>
        
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Horas</th>
            </tr>
          </thead>
          <tbody>
      `

      for (const date in workerData.days) {
        const dayData = workerData.days[date]

        html += `
          <tr>
            <td>${new Date(date).toLocaleDateString()}</td>
            <td>${dayData.totalHours.toFixed(2)}</td>
          </tr>
        `
      }

      html += `
          </tbody>
        </table>
      `
    }

    return html
  }

  /**
   * Convierte un informe de horas por posición a HTML
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido HTML
   */
  positionHoursToHTML(report) {
    const { data, options } = report
    let html = `
      <div class="report-summary">
        <h2>Resumen</h2>
        <p>Período: ${new Date(options.startDate).toLocaleDateString()} - ${new Date(options.endDate).toLocaleDateString()}</p>
        <p>Total de posiciones: ${Object.keys(data).length}</p>
      </div>
    `

    for (const positionId in data) {
      const positionData = data[positionId]
      const position = positionData.position

      html += `
        <h2>Posición: ${position.name}</h2>
        <p>Total de horas: ${positionData.totalHours.toFixed(2)}</p>
        <p>Total de trabajadores: ${Object.keys(positionData.workers).length}</p>
        
        <table>
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>Horas</th>
            </tr>
          </thead>
          <tbody>
      `

      for (const workerId in positionData.workers) {
        const workerData = positionData.workers[workerId]
        const worker = workerData.worker

        html += `
          <tr>
            <td>${worker.name}</td>
            <td>${workerData.totalHours.toFixed(2)}</td>
          </tr>
        `
      }

      html += `
          </tbody>
        </table>
      `
    }

    return html
  }

  /**
   * Convierte un informe diario a HTML
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido HTML
   */
  dailySummaryToHTML(report) {
    const { data } = report
    const { summary, workerRecords } = data

    let html = `
      <div class="report-summary">
        <h2>Resumen del día ${new Date(summary.date).toLocaleDateString()}</h2>
        <p>Total de trabajadores: ${summary.totalWorkers}</p>
        <p>Total de fichajes: ${summary.totalClockRecords}</p>
        <p>Total de horas: ${summary.totalHours.toFixed(2)}</p>
        <p>Promedio de horas por trabajador: ${summary.averageHoursPerWorker.toFixed(2)}</p>
      </div>
      
      <h2>Detalle por trabajador</h2>
      <table>
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Posición</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Horas</th>
          </tr>
        </thead>
        <tbody>
    `

    for (const workerId in workerRecords) {
      const workerData = workerRecords[workerId]
      const worker = workerData.worker
      const records = workerData.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      for (let i = 0; i < records.length; i += 2) {
        if (i + 1 < records.length) {
          const clockIn = new Date(records[i].timestamp)
          const clockOut = new Date(records[i + 1].timestamp)
          const diffHours = (clockOut - clockIn) / (1000 * 60 * 60)

          html += `
            <tr>
              <td>${worker.name}</td>
              <td>${workerData.position?.name || "No asignada"}</td>
              <td>${clockIn.toLocaleTimeString()}</td>
              <td>${clockOut.toLocaleTimeString()}</td>
              <td>${diffHours.toFixed(2)}</td>
            </tr>
          `
        }
      }
    }

    html += `
        </tbody>
      </table>
    `

    return html
  }

  /**
   * Convierte un informe mensual a HTML
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido HTML
   */
  monthlySummaryToHTML(report) {
    const { data, options } = report
    const { summary, workerRecords } = data
    const { year, month } = options

    const monthName = new Date(year, month - 1, 1).toLocaleDateString("es-ES", { month: "long" })

    let html = `
      <div class="report-summary">
        <h2>Resumen de ${monthName} ${year}</h2>
        <p>Total de trabajadores: ${summary.totalWorkers}</p>
        <p>Total de fichajes: ${summary.totalClockRecords}</p>
        <p>Total de horas: ${summary.totalHours.toFixed(2)}</p>
        <p>Promedio de horas por trabajador: ${summary.averageHoursPerWorker.toFixed(2)}</p>
        <p>Promedio de horas por día: ${summary.averageHoursPerDay.toFixed(2)}</p>
      </div>
      
      <h2>Detalle por trabajador</h2>
    `

    for (const workerId in workerRecords) {
      const workerData = workerRecords[workerId]
      const worker = workerData.worker

      html += `
        <h3>${worker.name} - ${workerData.position?.name || "Sin posición"}</h3>
        <p>Total de horas: ${workerData.totalHours.toFixed(2)}</p>
        
        <table>
          <thead>
            <tr>
              <th>Día</th>
              <th>Horas</th>
            </tr>
          </thead>
          <tbody>
      `

      for (const date in workerData.days) {
        const dayData = workerData.days[date]
        const day = new Date(date).getDate()

        html += `
          <tr>
            <td>${day}</td>
            <td>${dayData.totalHours.toFixed(2)}</td>
          </tr>
        `
      }

      html += `
          </tbody>
        </table>
      `
    }

    return html
  }

  /**
   * Convierte un informe genérico a HTML
   * @param {Object} report - Informe a convertir
   * @returns {string} - Contenido HTML
   */
  genericReportToHTML(report) {
    let html = `
      <div class="report-summary">
        <h2>Información del informe</h2>
        <p>Tipo: ${report.type}</p>
        <p>Fecha de creación: ${new Date(report.createdAt).toLocaleString()}</p>
      </div>
      
      <h2>Opciones</h2>
      <table>
        <thead>
          <tr>
            <th>Opción</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
    `

    for (const key in report.options) {
      html += `
        <tr>
          <td>${key}</td>
          <td>${report.options[key]}</td>
        </tr>
      `
    }

    html += `
        </tbody>
      </table>
    `

    return html
  }
}

export const offlineReportService = new OfflineReportService()
export default offlineReportService
