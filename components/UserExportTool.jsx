"use client"

import { useState } from "react"
import { clockRecordService } from "../services/storage"
import { useToast } from "../contexts/ToastContext"
import { format } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Componente para que los usuarios puedan exportar su historial de fichajes
 * @param {Object} user - Usuario actual
 */
function UserExportTool({ user }) {
  const [isExporting, setIsExporting] = useState(false)
  const toast = useToast()

  // Función para exportar los fichajes del usuario a CSV
  const exportToCSV = () => {
    if (!user || !user.id) {
      toast.showError("No se puede identificar al usuario actual")
      return
    }

    setIsExporting(true)

    try {
      // Obtener todos los registros de fichaje del usuario
      const userClockRecords = clockRecordService.getByUserId(user.id)

      if (userClockRecords.length === 0) {
        toast.showInfo("No hay registros de fichaje para exportar")
        setIsExporting(false)
        return
      }

      // Preparar los datos para CSV
      const headers = ["Fecha", "Puesto", "Hora Inicio", "Hora Fin", "Duración (min)", "Estado", "Pausas (min)"]

      const rows = userClockRecords.map((record) => {
        // Calcular duración total de pausas
        const totalPauseDuration = record.pauses
          ? record.pauses.reduce((total, pause) => total + (pause.duration || 0), 0)
          : 0

        // Formatear fechas
        const date = record.date ? format(new Date(record.date), "dd/MM/yyyy", { locale: es }) : ""
        const startTime = record.startTime ? format(new Date(record.startTime), "HH:mm", { locale: es }) : ""
        const endTime = record.endTime ? format(new Date(record.endTime), "HH:mm", { locale: es }) : ""

        return [
          date,
          record.positionName || "",
          startTime,
          endTime,
          record.duration || "",
          getStatusText(record.status),
          totalPauseDuration,
        ]
      })

      // Convertir a CSV
      const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `mis_fichajes_${format(new Date(), "yyyyMMdd")}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.showSuccess("Fichajes exportados correctamente")
    } catch (error) {
      console.error("Error al exportar fichajes:", error)
      toast.showError("Error al exportar los fichajes")
    } finally {
      setIsExporting(false)
    }
  }

  // Función para exportar los fichajes del usuario a JSON
  const exportToJSON = () => {
    if (!user || !user.id) {
      toast.showError("No se puede identificar al usuario actual")
      return
    }

    setIsExporting(true)

    try {
      // Obtener todos los registros de fichaje del usuario
      const userClockRecords = clockRecordService.getByUserId(user.id)

      if (userClockRecords.length === 0) {
        toast.showInfo("No hay registros de fichaje para exportar")
        setIsExporting(false)
        return
      }

      // Crear objeto con metadatos y datos
      const exportData = {
        metadata: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          exportDate: new Date().toISOString(),
          totalRecords: userClockRecords.length,
        },
        records: userClockRecords,
      }

      // Convertir a JSON
      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `mis_fichajes_${format(new Date(), "yyyyMMdd")}.json`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.showSuccess("Fichajes exportados correctamente en formato JSON")
    } catch (error) {
      console.error("Error al exportar fichajes a JSON:", error)
      toast.showError("Error al exportar los fichajes")
    } finally {
      setIsExporting(false)
    }
  }

  // Función para obtener el texto del estado
  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completado"
      case "in-progress":
        return "En curso"
      case "incident":
        return "Incidencia"
      default:
        return status || ""
    }
  }

  return (
    <div className="user-export-tool">
      <h3 className="text-lg font-semibold mb-4">Exportar mis fichajes</h3>
      <p className="mb-4 text-sm text-gray-600">
        Puedes descargar tu historial completo de fichajes en formato CSV o JSON para tus registros personales.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={exportToCSV}
          disabled={isExporting}
          className="export-btn flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {isExporting ? (
            <>
              <span className="loading-spinner"></span>
              <span>Exportando...</span>
            </>
          ) : (
            <>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Exportar a CSV</span>
            </>
          )}
        </button>
        <button
          onClick={exportToJSON}
          disabled={isExporting}
          className="export-btn flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          {isExporting ? (
            <>
              <span className="loading-spinner"></span>
              <span>Exportando...</span>
            </>
          ) : (
            <>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M8 13H12"></path>
                <path d="M8 17H16"></path>
                <path d="M8 9H16"></path>
              </svg>
              <span>Exportar a JSON</span>
            </>
          )}
        </button>
      </div>
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
        <p className="text-blue-800">
          <strong>Nota:</strong> Esta exportación incluye únicamente tus propios registros de fichaje, manteniendo la
          privacidad de los datos de otros trabajadores.
        </p>
      </div>
    </div>
  )
}

export default UserExportTool
