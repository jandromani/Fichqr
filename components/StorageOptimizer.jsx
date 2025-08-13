"use client"

import { useState, useEffect } from "react"
import { useLightMode } from "../contexts/LightModeContext"
import { getLocalStorageUsage } from "../services/deviceCapabilityService"
import { optimizeAllStorage, cleanupOldData } from "../services/optimizedStorageService"

/**
 * Componente para optimizar el almacenamiento local
 * Permite comprimir datos, limpiar datos antiguos y ver estadísticas
 */
function StorageOptimizer() {
  const { isLightMode } = useLightMode()
  const [storageInfo, setStorageInfo] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResults, setOptimizationResults] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  // Cargar información de almacenamiento
  useEffect(() => {
    const usage = getLocalStorageUsage()
    setStorageInfo(usage)
  }, [])

  // Función para optimizar el almacenamiento
  const handleOptimize = async () => {
    setIsOptimizing(true)
    setOptimizationResults(null)

    try {
      // Pequeña pausa para permitir actualización de UI
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Realizar optimización
      const results = optimizeAllStorage()

      // Actualizar información de almacenamiento
      const updatedUsage = getLocalStorageUsage()
      setStorageInfo(updatedUsage)

      // Mostrar resultados
      setOptimizationResults(results)
    } catch (error) {
      console.error("Error al optimizar almacenamiento:", error)
      setOptimizationResults({
        error: true,
        message: error.message,
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  // Función para limpiar datos antiguos
  const handleCleanup = async () => {
    setIsOptimizing(true)
    setOptimizationResults(null)

    try {
      // Pequeña pausa para permitir actualización de UI
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Realizar limpieza
      const beforeUsage = getLocalStorageUsage()
      const cleaned = cleanupOldData({ maxAge: 180 }) // 6 meses

      // Actualizar información de almacenamiento
      const afterUsage = getLocalStorageUsage()
      setStorageInfo(afterUsage)

      // Mostrar resultados
      setOptimizationResults({
        cleaned: cleaned ? ["oldRecords"] : [],
        beforeSize: beforeUsage.totalSize,
        afterSize: afterUsage.totalSize,
        bytesSaved: `${((beforeUsage.totalSizeBytes - afterUsage.totalSizeBytes) / 1024).toFixed(2)} KB`,
        percentSaved: `${(((beforeUsage.totalSizeBytes - afterUsage.totalSizeBytes) / beforeUsage.totalSizeBytes) * 100).toFixed(2)}%`,
        spaceFreed: cleaned,
      })
    } catch (error) {
      console.error("Error al limpiar datos antiguos:", error)
      setOptimizationResults({
        error: true,
        message: error.message,
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <div
      className={`storage-optimizer p-4 ${isLightMode ? "bg-white" : "bg-gray-50"} rounded-lg border border-gray-200 mb-4`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">Optimización de Almacenamiento</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          {showDetails ? "Ocultar detalles" : "Mostrar detalles"}
        </button>
      </div>

      {/* Información de almacenamiento */}
      {storageInfo && (
        <div className="mb-4">
          <div className="bg-white p-3 rounded border border-gray-200">
            <div className="flex justify-between mb-1">
              <span className="font-medium">Uso de almacenamiento:</span>
              <span className={storageInfo.isNearLimit ? "text-red-500 font-medium" : ""}>
                {storageInfo.usedPercentage}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className={`h-2.5 rounded-full ${
                  Number.parseFloat(storageInfo.usedPercentage) > 80
                    ? "bg-red-500"
                    : Number.parseFloat(storageInfo.usedPercentage) > 60
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: storageInfo.usedPercentage }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span>{storageInfo.totalSize} usados</span>
              <span>Máx. {storageInfo.estimatedMaxSize}</span>
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className={`px-3 py-2 rounded text-white ${isOptimizing ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"}`}
        >
          {isOptimizing ? "Optimizando..." : "Optimizar Todo"}
        </button>

        <button
          onClick={handleCleanup}
          disabled={isOptimizing}
          className={`px-3 py-2 rounded text-white ${isOptimizing ? "bg-red-400" : "bg-red-500 hover:bg-red-600"}`}
        >
          Limpiar Datos Antiguos
        </button>
      </div>

      {/* Resultados de optimización */}
      {optimizationResults && (
        <div
          className={`p-3 rounded ${
            optimizationResults.error ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
          }`}
        >
          <h4 className="font-medium mb-2">
            {optimizationResults.error ? "Error en la optimización" : "Optimización completada"}
          </h4>

          {optimizationResults.error ? (
            <p className="text-red-600">{optimizationResults.message}</p>
          ) : (
            <>
              <p className="mb-1">
                <span className="font-medium">Espacio ahorrado:</span> {optimizationResults.bytesSaved} (
                {optimizationResults.percentSaved})
              </p>

              {optimizationResults.compressed && optimizationResults.compressed.length > 0 && (
                <p className="mb-1">
                  <span className="font-medium">Datos comprimidos:</span> {optimizationResults.compressed.join(", ")}
                </p>
              )}

              {optimizationResults.cleaned && optimizationResults.cleaned.length > 0 && (
                <p className="mb-1">
                  <span className="font-medium">Datos limpiados:</span> {optimizationResults.cleaned.join(", ")}
                </p>
              )}

              {optimizationResults.errors && optimizationResults.errors.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                  <p className="font-medium text-yellow-700">Advertencias:</p>
                  <ul className="list-disc pl-5 text-yellow-700">
                    {optimizationResults.errors.map((err, index) => (
                      <li key={index}>
                        {err.key}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detalles de almacenamiento */}
      {showDetails && storageInfo && storageInfo.items && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Detalles de Almacenamiento:</h4>
          <div className="bg-white p-3 rounded border border-gray-200 max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 font-medium">Clave</th>
                  <th className="text-right py-1 font-medium">Tamaño</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(storageInfo.items)
                  .sort((a, b) => b[1].sizeBytes - a[1].sizeBytes)
                  .map(([key, info]) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-1 pr-4">{key}</td>
                      <td className="py-1 text-right">{info.size}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {storageInfo && Number.parseFloat(storageInfo.usedPercentage) > 70 && (
        <div className="mt-3 p-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
          <p className="font-medium">Recomendaciones:</p>
          <ul className="list-disc pl-5 mt-1">
            <li>Exporta y elimina datos antiguos que ya no necesites</li>
            <li>Utiliza la función "Limpiar Datos Antiguos" regularmente</li>
            <li>Considera aumentar el período de limpieza automática</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default StorageOptimizer
