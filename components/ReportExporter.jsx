"use client"

import { useState } from "react"
import { jsPDF } from "jspdf"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "../contexts/ToastContext"
import { getData, STORAGE_KEYS } from "../services/storageService"
import JSZip from "jszip"

/**
 * Componente reutilizable para exportar informes a PDF y Excel
 * @param {Array} data - Datos a exportar
 * @param {string} reportType - Tipo de informe (workers, positions, calendar)
 * @param {Object} filters - Filtros aplicados al informe
 * @param {string} title - Título del informe
 * @param {Object} user - Información del usuario que genera el informe
 */
function ReportExporter({ data, reportType, filters, title, user }) {
  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Estado para controlar la carga durante la exportación
  const [isExporting, setIsExporting] = useState({
    pdf: false,
    excel: false,
    json: false,
    zip: false,
  })

  /**
   * Función para exportar a PDF
   * Genera un PDF con formato profesional incluyendo encabezado, tabla de datos y pie de página
   */
  const exportToPDF = async () => {
    if (!data || data.length === 0) {
      toast.showWarning("No hay datos para exportar")
      return
    }

    try {
      setIsExporting((prev) => ({ ...prev, pdf: true }))

      // Crear un nuevo documento PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Configurar márgenes y dimensiones
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - 2 * margin

      // Añadir encabezado
      pdf.setFillColor(0, 102, 204) // Color azul corporativo
      pdf.rect(0, 0, pageWidth, 30, "F")

      pdf.setTextColor(255, 255, 255) // Texto blanco
      pdf.setFontSize(16)
      pdf.setFont("helvetica", "bold")
      pdf.text(title, margin, 15)

      pdf.setFontSize(10)
      pdf.setFont("helvetica", "normal")
      pdf.text(`Generado por: ${user?.name || "Usuario"}`, margin, 22)
      pdf.text(`Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth - margin, 22, {
        align: "right",
      })

      // Añadir información de filtros
      pdf.setTextColor(0, 0, 0) // Texto negro
      pdf.setFontSize(11)
      let yPos = 40

      pdf.setFont("helvetica", "bold")
      pdf.text("Filtros aplicados:", margin, yPos)
      pdf.setFont("helvetica", "normal")
      yPos += 7

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            const filterLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
            let filterValue = value

            // Formatear fechas si es necesario
            if (key.includes("date") && value instanceof Date) {
              filterValue = format(value, "dd/MM/yyyy", { locale: es })
            }

            pdf.text(`${filterLabel}: ${filterValue}`, margin, yPos)
            yPos += 6
          }
        })
      } else {
        pdf.text("Sin filtros", margin, yPos)
        yPos += 6
      }

      yPos += 5

      // Determinar las columnas según el tipo de informe
      let columns = []
      let processedData = []

      if (reportType === "workers") {
        columns = [
          { header: "Trabajador", dataKey: "worker", width: 50 },
          { header: "Fecha", dataKey: "date", width: 25 },
          { header: "Inicio", dataKey: "startTime", width: 20 },
          { header: "Fin", dataKey: "endTime", width: 20 },
          { header: "Horas", dataKey: "hours", width: 15 },
          { header: "Extra", dataKey: "overtime", width: 15 },
          { header: "Estado", dataKey: "status", width: 25 },
        ]

        processedData = data.map((item) => ({
          worker: item.worker || item.name || "",
          date: item.date ? format(new Date(item.date), "dd/MM/yyyy", { locale: es }) : "",
          startTime: item.startTime ? format(new Date(item.startTime), "HH:mm", { locale: es }) : "",
          endTime: item.endTime ? format(new Date(item.endTime), "HH:mm", { locale: es }) : "",
          hours: item.duration ? Math.round((item.duration / 60) * 10) / 10 : null, // Convertir minutos a horas con 1 decimal
          overtime: item.overtime || "0",
          status: getStatusText(item.status),
        }))
      } else if (reportType === "positions") {
        columns = [
          { header: "Puesto", dataKey: "position", width: 50 },
          { header: "Fecha", dataKey: "date", width: 25 },
          { header: "Horas Totales", dataKey: "totalHours", width: 30 },
          { header: "Trabajadores", dataKey: "workers", width: 25 },
          { header: "Horas Extra", dataKey: "overtime", width: 25 },
          { header: "Incidencias", dataKey: "incidents", width: 25 },
        ]

        processedData = data.map((item) => ({
          position: item.position || "",
          date: item.date ? format(new Date(item.date), "dd/MM/yyyy", { locale: es }) : "",
          totalHours: item.totalHours || "0",
          workers: item.workers || "0",
          overtime: item.overtime || "0",
          incidents: item.incidents || "0",
        }))
      } else if (reportType === "calendar") {
        columns = [
          { header: "Fecha", dataKey: "date", width: 25 },
          { header: "Tipo", dataKey: "type", width: 30 },
          { header: "Descripción", dataKey: "description", width: 60 },
          { header: "Horas", dataKey: "hours", width: 15 },
          { header: "Estado", dataKey: "status", width: 30 },
        ]

        processedData = data.map((item) => {
          const type = item.eventType === "clock" ? "Fichaje" : getAbsenceTypeText(item.type)
          const description = item.eventType === "clock" ? `Fichaje en ${item.positionName || ""}` : item.reason || ""

          return {
            date: item.date
              ? format(new Date(item.date), "dd/MM/yyyy", { locale: es })
              : item.startDate
                ? format(new Date(item.startDate), "dd/MM/yyyy", { locale: es })
                : "",
            type: type,
            description: description,
            hours: item.duration || "",
            status: getStatusText(item.status),
          }
        })
      } else {
        // Informe genérico
        columns = Object.keys(data[0]).map((key) => ({
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
          dataKey: key,
          width: 30,
        }))

        processedData = data
      }

      // Dibujar encabezados de tabla
      pdf.setFillColor(240, 240, 240) // Fondo gris claro
      pdf.setTextColor(0, 0, 0)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(10)

      let xPos = margin
      pdf.rect(margin, yPos, contentWidth, 8, "F")

      columns.forEach((column) => {
        pdf.text(column.header, xPos, yPos + 5.5)
        xPos += column.width
      })

      yPos += 8

      // Dibujar filas de datos
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(9)

      const rowHeight = 7
      let alternateRow = false

      processedData.forEach((row, rowIndex) => {
        // Verificar si necesitamos una nueva página
        if (yPos + rowHeight > pageHeight - margin) {
          pdf.addPage()
          yPos = margin + 10

          // Repetir encabezados en la nueva página
          pdf.setFillColor(240, 240, 240)
          pdf.setFont("helvetica", "bold")
          pdf.setFontSize(10)

          xPos = margin
          pdf.rect(margin, yPos, contentWidth, 8, "F")

          columns.forEach((column) => {
            pdf.text(column.header, xPos, yPos + 5.5)
            xPos += column.width
          })

          yPos += 8
          pdf.setFont("helvetica", "normal")
          pdf.setFontSize(9)
          alternateRow = false
        }

        // Alternar colores de fondo para las filas
        if (alternateRow) {
          pdf.setFillColor(245, 245, 245)
          pdf.rect(margin, yPos, contentWidth, rowHeight, "F")
        }
        alternateRow = !alternateRow

        // Dibujar datos de la fila
        xPos = margin
        columns.forEach((column) => {
          const cellValue = row[column.dataKey] !== undefined ? row[column.dataKey].toString() : ""

          // Aplicar colores según el estado
          if (column.dataKey === "status") {
            if (cellValue.includes("Incidencia") || cellValue.includes("Rechazada")) {
              pdf.setTextColor(204, 51, 0) // Rojo para incidencias y rechazos
            } else if (cellValue.includes("Curso")) {
              pdf.setTextColor(245, 158, 11) // Naranja para en curso
            } else if (cellValue.includes("Aprobada") || cellValue.includes("Completado")) {
              pdf.setTextColor(0, 170, 85) // Verde para aprobados y completados
            } else if (cellValue.includes("Pendiente")) {
              pdf.setTextColor(59, 130, 246) // Azul para pendientes
            } else {
              pdf.setTextColor(0, 0, 0) // Negro para el resto
            }
          } else if (column.dataKey === "overtime" && Number.parseFloat(cellValue) > 0) {
            pdf.setTextColor(0, 170, 85) // Verde para horas extra
          } else {
            pdf.setTextColor(0, 0, 0) // Negro para el resto
          }

          pdf.text(cellValue, xPos, yPos + 5)
          xPos += column.width
        })

        yPos += rowHeight
      })

      // Añadir pie de página
      pdf.setTextColor(128, 128, 128)
      pdf.setFontSize(8)
      pdf.text(`Fichaje QR - ${title} - Página ${pdf.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      })

      // Guardar el PDF
      const fileName = `${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`
      pdf.save(fileName)

      toast.showSuccess("Informe PDF generado correctamente")
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast.showError("Error al generar el informe PDF")
    } finally {
      setIsExporting((prev) => ({ ...prev, pdf: false }))
    }
  }

  /**
   * Función para exportar a Excel
   * Genera un archivo Excel con múltiples hojas según el tipo de informe
   */
  const exportToExcel = async () => {
    if (!data || data.length === 0) {
      toast.showWarning("No hay datos para exportar")
      return
    }

    try {
      setIsExporting((prev) => ({ ...prev, excel: true }))

      // Crear un nuevo libro de Excel
      const workbook = XLSX.utils.book_new()

      // Determinar las columnas y datos según el tipo de informe
      let columns = []
      let processedData = []

      if (reportType === "workers") {
        columns = [
          "Trabajador",
          "Fecha",
          "Hora Inicio",
          "Hora Fin",
          "Horas Normales",
          "Horas Extra",
          "Pausas (min)",
          "Estado",
          "Incidencias",
        ]

        processedData = data.map((item) => {
          // Calcular total de pausas en minutos
          const totalPauses =
            item.pauses && item.pauses.length > 0
              ? item.pauses.reduce((total, pause) => total + (pause.duration || 0), 0)
              : 0

          return [
            item.worker || item.name || "",
            item.date ? format(new Date(item.date), "dd/MM/yyyy", { locale: es }) : "",
            item.startTime ? format(new Date(item.startTime), "HH:mm", { locale: es }) : "",
            item.endTime ? format(new Date(item.endTime), "HH:mm", { locale: es }) : "",
            item.duration ? (item.duration - (item.overtime || 0)).toFixed(2) : "",
            item.overtime || "0",
            totalPauses.toString(),
            getStatusText(item.status),
            item.status === "incident" ? item.incidentType || "Sí" : "No",
          ]
        })
      } else if (reportType === "positions") {
        columns = ["Puesto", "Fecha", "Horas Totales", "Horas Normales", "Horas Extra", "Trabajadores", "Incidencias"]

        processedData = data.map((item) => [
          item.position || "",
          item.date ? format(new Date(item.date), "dd/MM/yyyy", { locale: es }) : "",
          item.totalHours || "0",
          (Number.parseFloat(item.totalHours || 0) - Number.parseFloat(item.overtime || 0)).toFixed(2),
          item.overtime || "0",
          item.workers || "0",
          item.incidents || "0",
        ])
      } else if (reportType === "calendar") {
        columns = ["Fecha", "Tipo", "Descripción", "Hora Inicio", "Hora Fin", "Horas", "Estado", "Notas"]

        processedData = data.map((item) => {
          const type = item.eventType === "clock" ? "Fichaje" : getAbsenceTypeText(item.type)
          const description = item.eventType === "clock" ? `Fichaje en ${item.positionName || ""}` : item.reason || ""

          return [
            item.date
              ? format(new Date(item.date), "dd/MM/yyyy", { locale: es })
              : item.startDate
                ? format(new Date(item.startDate), "dd/MM/yyyy", { locale: es })
                : "",
            type,
            description,
            item.startTime
              ? format(new Date(item.startTime), "HH:mm", { locale: es })
              : item.startDate && !isSameDay(item.startDate, item.endDate)
                ? format(new Date(item.startDate), "dd/MM/yyyy", { locale: es })
                : "",
            item.endTime
              ? format(new Date(item.endTime), "HH:mm", { locale: es })
              : item.endDate && !isSameDay(item.startDate, item.endDate)
                ? format(new Date(item.endDate), "dd/MM/yyyy", { locale: es })
                : "",
            item.duration || "",
            getStatusText(item.status),
            item.status === "incident"
              ? item.incidentReason || ""
              : item.status === "rejected"
                ? item.rejectionReason || ""
                : "",
          ]
        })
      } else {
        // Informe genérico
        columns = Object.keys(data[0]).map(
          (key) => key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
        )

        processedData = data.map((item) =>
          Object.values(item).map((value) =>
            value instanceof Date
              ? format(value, "dd/MM/yyyy", { locale: es })
              : value !== null && value !== undefined
                ? value.toString()
                : "",
          ),
        )
      }

      // Crear la hoja principal con los datos
      const worksheet = XLSX.utils.aoa_to_sheet([columns, ...processedData])

      // Ajustar anchos de columna
      const colWidths = columns.map((col) => ({ wch: Math.max(col.length * 1.5, 10) }))
      worksheet["!cols"] = colWidths

      // Añadir la hoja al libro
      XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")

      // Crear una hoja adicional con información del informe
      const infoData = [
        ["Informe", title],
        ["Fecha de generación", format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })],
        ["Generado por", user?.name || "Usuario"],
        ["Tipo de informe", reportType],
        ["Total registros", data.length.toString()],
      ]

      // Añadir información de filtros
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            const filterLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
            let filterValue = value

            // Formatear fechas si es necesario
            if (key.includes("date") && value instanceof Date) {
              filterValue = format(value, "dd/MM/yyyy", { locale: es })
            }

            infoData.push([filterLabel, filterValue.toString()])
          }
        })
      }

      const infoWorksheet = XLSX.utils.aoa_to_sheet(infoData)
      XLSX.utils.book_append_sheet(workbook, infoWorksheet, "Información")

      // Guardar el archivo Excel
      const fileName = `${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`
      XLSX.writeFile(workbook, fileName)

      toast.showSuccess("Informe Excel generado correctamente")
    } catch (error) {
      console.error("Error al generar Excel:", error)
      toast.showError("Error al generar el informe Excel")
    } finally {
      setIsExporting((prev) => ({ ...prev, excel: false }))
    }
  }

  /**
   * NUEVA FUNCIÓN: Exportar todos los datos a JSON
   * Genera un archivo JSON con todos los datos de la aplicación
   */
  const exportToJSON = async () => {
    try {
      setIsExporting((prev) => ({ ...prev, json: true }))

      // Recopilar todos los datos
      const allData = {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        generatedBy: user
          ? {
              id: user.id,
              name: user.name,
              role: user.role,
              companyId: user.companyId,
            }
          : "unknown",
        data: {
          positions: getData(STORAGE_KEYS.POSITIONS),
          workers: getData(STORAGE_KEYS.WORKERS),
          clockRecords: getData(STORAGE_KEYS.CLOCK_RECORDS),
          absenceRequests: getData(STORAGE_KEYS.ABSENCE_REQUESTS),
        },
      }

      // Convertir a JSON
      const jsonString = JSON.stringify(allData, null, 2)

      // Crear un blob con los datos
      const blob = new Blob([jsonString], { type: "application/json" })

      // Crear URL para descargar
      const url = URL.createObjectURL(blob)

      // Crear un enlace para descargar el archivo
      const a = document.createElement("a")
      a.href = url
      a.download = `fichaje_qr_datos_completos_${format(new Date(), "yyyyMMdd_HHmmss")}.json`
      document.body.appendChild(a)
      a.click()

      // Limpiar
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.showSuccess("Datos completos exportados correctamente en formato JSON")
    } catch (error) {
      console.error("Error al exportar datos a JSON:", error)
      toast.showError("Error al exportar datos completos: " + error.message)
    } finally {
      setIsExporting((prev) => ({ ...prev, json: false }))
    }
  }

  /**
   * NUEVA FUNCIÓN: Exportar todos los datos a ZIP
   * Genera un archivo ZIP con todos los datos de la aplicación en formato JSON
   */
  const exportToZIP = async () => {
    try {
      setIsExporting((prev) => ({ ...prev, zip: true }))

      // Crear un nuevo objeto JSZip
      const zip = new JSZip()

      // Recopilar todos los datos
      const allData = {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        generatedBy: user
          ? {
              id: user.id,
              name: user.name,
              role: user.role,
              companyId: user.companyId,
            }
          : "unknown",
      }

      // Añadir archivo de metadatos
      zip.file("metadata.json", JSON.stringify(allData, null, 2))

      // Añadir cada tipo de datos en archivos separados
      zip.file("positions.json", JSON.stringify(getData(STORAGE_KEYS.POSITIONS), null, 2))
      zip.file("workers.json", JSON.stringify(getData(STORAGE_KEYS.WORKERS), null, 2))
      zip.file("clockRecords.json", JSON.stringify(getData(STORAGE_KEYS.CLOCK_RECORDS), null, 2))
      zip.file("absenceRequests.json", JSON.stringify(getData(STORAGE_KEYS.ABSENCE_REQUESTS), null, 2))

      // Generar el archivo ZIP
      const content = await zip.generateAsync({ type: "blob" })

      // Crear URL para descargar
      const url = URL.createObjectURL(content)

      // Crear un enlace para descargar el archivo
      const a = document.createElement("a")
      a.href = url
      a.download = `fichaje_qr_backup_completo_${format(new Date(), "yyyyMMdd_HHmmss")}.zip`
      document.body.appendChild(a)
      a.click()

      // Limpiar
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.showSuccess("Backup completo exportado correctamente en formato ZIP")
    } catch (error) {
      console.error("Error al exportar datos a ZIP:", error)
      toast.showError("Error al exportar backup completo: " + error.message)
    } finally {
      setIsExporting((prev) => ({ ...prev, zip: false }))
    }
  }

  // Función auxiliar para verificar si dos fechas son el mismo día
  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
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
      case "approved":
        return "Aprobada"
      case "pending":
        return "Pendiente"
      case "rejected":
        return "Rechazada"
      default:
        return status || ""
    }
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
        return type || ""
    }
  }

  return (
    <div className="report-exporter">
      <div className="exporter-buttons">
        <button
          onClick={exportToPDF}
          disabled={isExporting.pdf || !data || data.length === 0}
          className="export-btn pdf-btn"
        >
          {isExporting.pdf ? (
            <>
              <span className="loading-spinner"></span>
              <span>Generando PDF...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="export-icon"
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
              <span>Exportar a PDF</span>
            </>
          )}
        </button>

        <button
          onClick={exportToExcel}
          disabled={isExporting.excel || !data || data.length === 0}
          className="export-btn excel-btn"
        >
          {isExporting.excel ? (
            <>
              <span className="loading-spinner"></span>
              <span>Generando Excel...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="export-icon"
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
              <span>Exportar a Excel</span>
            </>
          )}
        </button>

        {/* Nuevos botones para exportación completa */}
        <button
          onClick={exportToJSON}
          disabled={isExporting.json}
          className="export-btn json-btn"
          title="Exportar todos los datos de la aplicación en formato JSON"
        >
          {isExporting.json ? (
            <>
              <span className="loading-spinner"></span>
              <span>Generando JSON...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="export-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M8 13H16"></path>
                <path d="M8 17H16"></path>
                <path d="M8 9H16"></path>
              </svg>
              <span>Exportar datos completos (JSON)</span>
            </>
          )}
        </button>

        <button
          onClick={exportToZIP}
          disabled={isExporting.zip}
          className="export-btn zip-btn"
          title="Exportar todos los datos de la aplicación en formato ZIP"
        >
          {isExporting.zip ? (
            <>
              <span className="loading-spinner"></span>
              <span>Generando ZIP...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="export-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>Exportar backup completo (ZIP)</span>
            </>
          )}
        </button>
      </div>

      {(!data || data.length === 0) && (
        <div className="no-data-message">
          <p>No hay datos disponibles para exportar</p>
        </div>
      )}

      <div className="export-info mt-4 p-3 bg-blue-50 rounded-lg text-sm">
        <p className="font-medium mb-1">Información sobre exportación de datos:</p>
        <ul className="list-disc pl-5">
          <li>
            <strong>PDF/Excel:</strong> Exporta solo los datos filtrados del informe actual.
          </li>
          <li>
            <strong>JSON:</strong> Exporta todos los datos de la aplicación en un único archivo JSON.
          </li>
          <li>
            <strong>ZIP:</strong> Exporta todos los datos en archivos JSON separados dentro de un archivo ZIP.
          </li>
        </ul>
        <p className="mt-2 text-xs text-gray-600">
          Nota: Para cumplir con la legislación española, se recomienda realizar exportaciones completas (JSON o ZIP)
          periódicamente y conservarlas durante al menos 4 años.
        </p>
      </div>
    </div>
  )
}

export default ReportExporter
