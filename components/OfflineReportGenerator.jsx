"use client"

import { useState, useEffect } from "react"
import { offlineReportService, REPORT_TYPES, EXPORT_FORMATS } from "../services/offlineReportService"
import { workerService } from "../services/storage/workerService"
import { positionService } from "../services/storage/positionService"
import { useToast } from "../contexts/ToastContext"
import Modal from "./ui/Modal"

const OfflineReportGenerator = () => {
  const [reportType, setReportType] = useState(REPORT_TYPES.WORKER_HOURS)
  const [workers, setWorkers] = useState([])
  const [positions, setPositions] = useState([])
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)

  // Opciones de informe
  const [reportOptions, setReportOptions] = useState({
    name: "",
    workerId: "",
    positionId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    date: new Date().toISOString().split("T")[0],
  })

  const { showToast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Cargar trabajadores, posiciones e informes
      const [allWorkers, allPositions, allReports] = await Promise.all([
        workerService.getAllWorkers(),
        positionService.getAllPositions(),
        offlineReportService.getAllReports(),
      ])

      setWorkers(allWorkers)
      setPositions(allPositions)
      setReports(allReports)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      showToast("Error al cargar datos", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setReportOptions((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      let report

      switch (reportType) {
        case REPORT_TYPES.WORKER_HOURS:
          report = await offlineReportService.generateWorkerHoursReport({
            workerId: reportOptions.workerId || undefined,
            startDate: new Date(reportOptions.startDate),
            endDate: new Date(reportOptions.endDate),
            name: reportOptions.name || undefined,
          })
          break

        case REPORT_TYPES.POSITION_HOURS:
          report = await offlineReportService.generatePositionHoursReport({
            positionId: reportOptions.positionId || undefined,
            startDate: new Date(reportOptions.startDate),
            endDate: new Date(reportOptions.endDate),
            name: reportOptions.name || undefined,
          })
          break

        case REPORT_TYPES.DAILY_SUMMARY:
          report = await offlineReportService.generateDailySummaryReport({
            date: new Date(reportOptions.date),
            name: reportOptions.name || undefined,
          })
          break

        case REPORT_TYPES.MONTHLY_SUMMARY:
          report = await offlineReportService.generateMonthlySummaryReport({
            year: Number.parseInt(reportOptions.year),
            month: Number.parseInt(reportOptions.month),
            name: reportOptions.name || undefined,
          })
          break

        default:
          throw new Error(`Tipo de informe no soportado: ${reportType}`)
      }

      showToast("Informe generado correctamente", "success")
      setShowGenerateModal(false)
      loadData() // Recargar informes

      // Mostrar el informe generado
      setSelectedReport(report)
      setShowReportModal(true)
    } catch (error) {
      console.error("Error al generar informe:", error)
      showToast(`Error al generar informe: ${error.message}`, "error")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este informe?")) {
      try {
        await offlineReportService.deleteReport(reportId)
        showToast("Informe eliminado correctamente", "success")

        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport(null)
          setShowReportModal(false)
        }

        loadData() // Recargar informes
      } catch (error) {
        console.error("Error al eliminar informe:", error)
        showToast("Error al eliminar informe", "error")
      }
    }
  }

  const handleExportReport = async (reportId, format) => {
    try {
      const blob = await offlineReportService.exportReport(reportId, format)

      // Crear nombre de archivo
      const report = reports.find((r) => r.id === reportId)
      const extension = format.toLowerCase()
      const fileName = `${report.name.replace(/\s+/g, "_")}.${extension}`

      // Descargar archivo
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()

      // Limpiar
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast(`Informe exportado como ${format}`, "success")
    } catch (error) {
      console.error(`Error al exportar informe como ${format}:`, error)
      showToast(`Error al exportar informe: ${error.message}`, "error")
    }
  }

  const handleViewReport = (report) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getReportTypeLabel = (type) => {
    switch (type) {
      case REPORT_TYPES.WORKER_HOURS:
        return "Horas por trabajador"
      case REPORT_TYPES.POSITION_HOURS:
        return "Horas por posición"
      case REPORT_TYPES.DAILY_SUMMARY:
        return "Resumen diario"
      case REPORT_TYPES.MONTHLY_SUMMARY:
        return "Resumen mensual"
      case REPORT_TYPES.ABSENCE_REPORT:
        return "Informe de ausencias"
      default:
        return "Personalizado"
    }
  }

  const renderGenerateForm = () => {
    return (
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generar nuevo informe">
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tipo de informe</label>
            <select
              className="w-full p-2 border rounded"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value={REPORT_TYPES.WORKER_HOURS}>Horas por trabajador</option>
              <option value={REPORT_TYPES.POSITION_HOURS}>Horas por posición</option>
              <option value={REPORT_TYPES.DAILY_SUMMARY}>Resumen diario</option>
              <option value={REPORT_TYPES.MONTHLY_SUMMARY}>Resumen mensual</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre del informe</label>
            <input
              type="text"
              name="name"
              className="w-full p-2 border rounded"
              placeholder="Nombre descriptivo del informe"
              value={reportOptions.name}
              onChange={handleInputChange}
            />
          </div>

          {reportType === REPORT_TYPES.WORKER_HOURS && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Trabajador (opcional)</label>
                <select
                  name="workerId"
                  className="w-full p-2 border rounded"
                  value={reportOptions.workerId}
                  onChange={handleInputChange}
                >
                  <option value="">Todos los trabajadores</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    name="startDate"
                    className="w-full p-2 border rounded"
                    value={reportOptions.startDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha fin</label>
                  <input
                    type="date"
                    name="endDate"
                    className="w-full p-2 border rounded"
                    value={reportOptions.endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </>
          )}

          {reportType === REPORT_TYPES.POSITION_HOURS && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Posición (opcional)</label>
                <select
                  name="positionId"
                  className="w-full p-2 border rounded"
                  value={reportOptions.positionId}
                  onChange={handleInputChange}
                >
                  <option value="">Todas las posiciones</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    name="startDate"
                    className="w-full p-2 border rounded"
                    value={reportOptions.startDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha fin</label>
                  <input
                    type="date"
                    name="endDate"
                    className="w-full p-2 border rounded"
                    value={reportOptions.endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </>
          )}

          {reportType === REPORT_TYPES.DAILY_SUMMARY && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Fecha</label>
              <input
                type="date"
                name="date"
                className="w-full p-2 border rounded"
                value={reportOptions.date}
                onChange={handleInputChange}
              />
            </div>
          )}

          {reportType === REPORT_TYPES.MONTHLY_SUMMARY && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Año</label>
                <input
                  type="number"
                  name="year"
                  className="w-full p-2 border rounded"
                  value={reportOptions.year}
                  onChange={handleInputChange}
                  min="2000"
                  max="2100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mes</label>
                <select
                  name="month"
                  className="w-full p-2 border rounded"
                  value={reportOptions.month}
                  onChange={handleInputChange}
                >
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-6">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generando...
                </>
              ) : (
                "Generar informe"
              )}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  const renderReportDetails = () => {
    if (!selectedReport) return null

    return (
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title={selectedReport.name} size="lg">
        <div className="p-4">
          <div className="mb-4 bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">{getReportTypeLabel(selectedReport.type)}</h3>
              <span className="text-sm text-gray-500">Generado el {formatDate(selectedReport.createdAt)}</span>
            </div>

            <div className="text-sm text-gray-600">
              {selectedReport.type === REPORT_TYPES.WORKER_HOURS && (
                <p>
                  Período: {formatDate(selectedReport.options.startDate)} - {formatDate(selectedReport.options.endDate)}
                </p>
              )}

              {selectedReport.type === REPORT_TYPES.POSITION_HOURS && (
                <p>
                  Período: {formatDate(selectedReport.options.startDate)} - {formatDate(selectedReport.options.endDate)}
                </p>
              )}

              {selectedReport.type === REPORT_TYPES.DAILY_SUMMARY && (
                <p>Fecha: {formatDate(selectedReport.options.date)}</p>
              )}

              {selectedReport.type === REPORT_TYPES.MONTHLY_SUMMARY && (
                <p>
                  Período: {selectedReport.options.month}/{selectedReport.options.year}
                </p>
              )}
            </div>
          </div>

          <div className="mb-6 max-h-96 overflow-y-auto">
            {selectedReport.type === REPORT_TYPES.WORKER_HOURS && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Resumen de horas por trabajador</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trabajador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posición
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Horas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(selectedReport.data).map((workerData) => (
                      <tr key={workerData.worker.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {workerData.worker.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workerData.worker.position || "No asignada"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workerData.totalHours.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport.type === REPORT_TYPES.POSITION_HOURS && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Resumen de horas por posición</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posición
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trabajadores
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Horas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(selectedReport.data).map((positionData) => (
                      <tr key={positionData.position.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {positionData.position.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Object.keys(positionData.workers).length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {positionData.totalHours.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport.type === REPORT_TYPES.DAILY_SUMMARY && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Resumen diario</h3>
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <p>Total trabajadores: {selectedReport.data.summary.totalWorkers}</p>
                  <p>Total fichajes: {selectedReport.data.summary.totalClockRecords}</p>
                  <p>Total horas: {selectedReport.data.summary.totalHours.toFixed(2)}</p>
                  <p>Promedio horas por trabajador: {selectedReport.data.summary.averageHoursPerWorker.toFixed(2)}</p>
                </div>

                <h4 className="text-md font-semibold mb-2">Detalle por trabajador</h4>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trabajador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posición
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(selectedReport.data.workerRecords).map((workerData) => (
                      <tr key={workerData.worker.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {workerData.worker.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workerData.position?.name || "No asignada"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workerData.totalHours.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport.type === REPORT_TYPES.MONTHLY_SUMMARY && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Resumen mensual</h3>
                <div className="bg-gray-50 p-3 rounded-md mb-4">
                  <p>
                    Mes: {selectedReport.options.month}/{selectedReport.options.year}
                  </p>
                  <p>Total trabajadores: {selectedReport.data.summary.totalWorkers}</p>
                  <p>Total fichajes: {selectedReport.data.summary.totalClockRecords}</p>
                  <p>Total horas: {selectedReport.data.summary.totalHours.toFixed(2)}</p>
                  <p>Promedio horas por trabajador: {selectedReport.data.summary.averageHoursPerWorker.toFixed(2)}</p>
                  <p>Promedio horas por día: {selectedReport.data.summary.averageHoursPerDay.toFixed(2)}</p>
                </div>

                <h4 className="text-md font-semibold mb-2">Detalle por trabajador</h4>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trabajador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posición
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Horas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Días Trabajados
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(selectedReport.data.workerRecords).map((workerData) => (
                      <tr key={workerData.worker.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {workerData.worker.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workerData.position?.name || "No asignada"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workerData.totalHours.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Object.keys(workerData.days).length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div>
              <button
                onClick={() => handleDeleteReport(selectedReport.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Eliminar
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleExportReport(selectedReport.id, EXPORT_FORMATS.CSV)}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                Exportar CSV
              </button>
              <button
                onClick={() => handleExportReport(selectedReport.id, EXPORT_FORMATS.HTML)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                Exportar HTML
              </button>
              <button
                onClick={() => handleExportReport(selectedReport.id, EXPORT_FORMATS.JSON)}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
              >
                Exportar JSON
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Generador de Informes Offline</h2>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo informe
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-2">No hay informes generados</p>
          <p className="text-sm">Haz clic en "Nuevo informe" para crear uno</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Nombre
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Fecha
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {report.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {getReportTypeLabel(report.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatDate(report.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewReport(report)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleExportReport(report.id, EXPORT_FORMATS.CSV)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renderGenerateForm()}
      {renderReportDetails()}
    </div>
  )
}

export default OfflineReportGenerator
