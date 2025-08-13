"use client"

import { useState } from "react"
import { useToast } from "../../contexts/ToastContext"

/**
 * Componente base para secciones de informes
 * Proporciona funcionalidad común para todas las secciones de informes
 */
function BaseReportSection({
  title,
  description,
  filterOptions,
  renderFilters,
  renderContent,
  renderExportOptions,
  onExport,
  initialData = [],
  dataProcessor,
  emptyMessage = "No hay datos disponibles para mostrar",
}) {
  const toast = useToast()
  const [data, setData] = useState(initialData)
  const [filteredData, setFilteredData] = useState(initialData)
  const [filters, setFilters] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Función para actualizar los filtros
  const updateFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)

    // Aplicar filtros a los datos
    if (dataProcessor) {
      setIsLoading(true)
      try {
        const processed = dataProcessor(data, updatedFilters)
        setFilteredData(processed)
      } catch (error) {
        console.error("Error al procesar datos:", error)
        toast.showError("Error al filtrar datos: " + error.message)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Función para manejar la exportación
  const handleExport = async (format) => {
    setIsExporting(true)
    try {
      if (onExport) {
        await onExport(filteredData, format, filters)
        toast.showSuccess(`Informe exportado correctamente en formato ${format.toUpperCase()}`)
      } else {
        toast.showWarning("Función de exportación no implementada")
      }
    } catch (error) {
      console.error("Error al exportar:", error)
      toast.showError("Error al exportar datos: " + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  // Función para actualizar los datos
  const updateData = (newData) => {
    setData(newData)
    // Aplicar filtros actuales a los nuevos datos
    if (dataProcessor) {
      try {
        const processed = dataProcessor(newData, filters)
        setFilteredData(processed)
      } catch (error) {
        console.error("Error al procesar nuevos datos:", error)
        setFilteredData(newData)
      }
    } else {
      setFilteredData(newData)
    }
  }

  return (
    <div className="report-section p-4 bg-white rounded-lg shadow">
      <div className="report-header mb-6">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        {description && <p className="text-gray-600 mb-4">{description}</p>}
      </div>

      {/* Sección de filtros */}
      <div className="report-filters mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Filtros</h3>
        {renderFilters ? (
          renderFilters({
            filters,
            updateFilters,
            filterOptions,
            isLoading,
          })
        ) : (
          <p className="text-gray-500">No hay filtros disponibles</p>
        )}
      </div>

      {/* Sección de contenido */}
      <div className="report-content mb-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="loader"></div>
            <span className="ml-2">Cargando datos...</span>
          </div>
        ) : filteredData.length > 0 ? (
          renderContent({
            data: filteredData,
            filters,
            updateData,
          })
        ) : (
          <div className="empty-state py-8 text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Sección de exportación */}
      <div className="report-export p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Exportar informe</h3>
        {renderExportOptions ? (
          renderExportOptions({
            handleExport,
            isExporting,
            data: filteredData,
            filters,
          })
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={() => handleExport("csv")}
              disabled={isExporting || filteredData.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exportando..." : "Exportar CSV"}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={isExporting || filteredData.length === 0}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </button>
            <button
              onClick={() => handleExport("excel")}
              disabled={isExporting || filteredData.length === 0}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exportando..." : "Exportar Excel"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BaseReportSection
