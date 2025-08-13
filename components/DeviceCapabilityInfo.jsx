"use client"

import { useState, useEffect } from "react"
import { useLightMode } from "../contexts/LightModeContext"
import { getLocalStorageUsage } from "../services/deviceCapabilityService"

/**
 * Componente que muestra información sobre las capacidades del dispositivo
 * y el uso de almacenamiento
 */
function DeviceCapabilityInfo() {
  const { deviceCapabilities, isLightMode, toggleLightMode, isLightModeForced, resetToAutoDetection } = useLightMode()
  const [storageInfo, setStorageInfo] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  // Cargar información de almacenamiento
  useEffect(() => {
    const usage = getLocalStorageUsage()
    setStorageInfo(usage)
  }, [])

  // Actualizar información de almacenamiento periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const usage = getLocalStorageUsage()
      setStorageInfo(usage)
    }, 60000) // Actualizar cada minuto

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="device-capability-info p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Información del Dispositivo</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          {showDetails ? "Ocultar detalles" : "Mostrar detalles"}
        </button>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-medium">Modo Ligero: </span>
            <span className={isLightMode ? "text-green-600" : "text-gray-600"}>
              {isLightMode ? "Activado" : "Desactivado"}
            </span>
            {isLightModeForced && <span className="text-xs ml-2 text-gray-500">(Configuración manual)</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleLightMode}
              className={`text-sm px-3 py-1 rounded ${
                isLightMode ? "bg-gray-200 hover:bg-gray-300" : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              {isLightMode ? "Desactivar" : "Activar"}
            </button>
            {isLightModeForced && (
              <button
                onClick={resetToAutoDetection}
                className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Auto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Información básica del dispositivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <div className="bg-white p-2 rounded border border-gray-200">
          <span className="font-medium">Tipo: </span>
          <span>{deviceCapabilities.isMobile ? "Móvil" : "Escritorio"}</span>
        </div>
        <div className="bg-white p-2 rounded border border-gray-200">
          <span className="font-medium">Gama: </span>
          <span className={deviceCapabilities.isLowEndDevice ? "text-orange-500" : "text-green-500"}>
            {deviceCapabilities.isLowEndDevice ? "Baja" : "Media/Alta"}
          </span>
        </div>
      </div>

      {/* Información de almacenamiento */}
      {storageInfo && (
        <div className="mb-3">
          <h4 className="font-medium mb-1">Almacenamiento Local:</h4>
          <div className="bg-white p-2 rounded border border-gray-200">
            <div className="flex justify-between mb-1">
              <span>Uso:</span>
              <span className={storageInfo.isNearLimit ? "text-red-500 font-medium" : ""}>
                {storageInfo.usedPercentage}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
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
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{storageInfo.totalSize} usados</span>
              <span>Máx. {storageInfo.estimatedMaxSize}</span>
            </div>
          </div>
        </div>
      )}

      {/* Detalles técnicos (expandibles) */}
      {showDetails && deviceCapabilities.details && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Detalles Técnicos:</h4>
          <div className="bg-white p-3 rounded border border-gray-200 text-sm">
            <table className="w-full text-left">
              <tbody>
                {deviceCapabilities.details.memory && (
                  <tr>
                    <td className="py-1 pr-2 font-medium">Memoria:</td>
                    <td>{deviceCapabilities.details.memory} GB</td>
                  </tr>
                )}
                {deviceCapabilities.details.cpuCores && (
                  <tr>
                    <td className="py-1 pr-2 font-medium">CPU Cores:</td>
                    <td>{deviceCapabilities.details.cpuCores}</td>
                  </tr>
                )}
                {deviceCapabilities.details.connectionType && (
                  <tr>
                    <td className="py-1 pr-2 font-medium">Conexión:</td>
                    <td>{deviceCapabilities.details.connectionType}</td>
                  </tr>
                )}
                {deviceCapabilities.details.connectionSpeed && (
                  <tr>
                    <td className="py-1 pr-2 font-medium">Velocidad:</td>
                    <td>{deviceCapabilities.details.connectionSpeed}</td>
                  </tr>
                )}
                {deviceCapabilities.details.screenSize && (
                  <tr>
                    <td className="py-1 pr-2 font-medium">Pantalla:</td>
                    <td>{deviceCapabilities.details.screenSize}</td>
                  </tr>
                )}
                {deviceCapabilities.details.platform && (
                  <tr>
                    <td className="py-1 pr-2 font-medium">Plataforma:</td>
                    <td>{deviceCapabilities.details.platform}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mostrar advertencia si el almacenamiento está casi lleno */}
      {storageInfo && storageInfo.isNearLimit && (
        <div className="mt-3 p-2 bg-red-50 text-red-700 rounded-lg text-sm">
          <strong>¡Advertencia!</strong> El almacenamiento local está casi lleno. Considera exportar y eliminar datos
          antiguos para evitar pérdida de información.
        </div>
      )}
    </div>
  )
}

export default DeviceCapabilityInfo
