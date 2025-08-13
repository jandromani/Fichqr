"use client"
import { useLightMode } from "../contexts/LightModeContext"

/**
 * Componente para activar/desactivar el modo ligero
 */
function LightModeToggle() {
  const { isLightMode, toggleLightMode, isLightModeForced, resetToAutoDetection, deviceCapabilities } = useLightMode()

  return (
    <div className="light-mode-toggle p-3 bg-white rounded-lg border border-gray-200 mb-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">Modo Ligero</h3>
          <p className="text-sm text-gray-600">
            {isLightMode
              ? "Optimizado para dispositivos de gama baja"
              : "Experiencia completa con todas las funcionalidades"}
          </p>
          {deviceCapabilities.isLowEndDevice && !isLightModeForced && (
            <p className="text-xs text-orange-600 mt-1">Activado automáticamente para tu dispositivo</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLightModeForced && (
            <button onClick={resetToAutoDetection} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">
              Auto
            </button>
          )}

          <label className="inline-flex items-center cursor-pointer">
            <span className="mr-2 text-sm text-gray-600">{isLightMode ? "On" : "Off"}</span>
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={isLightMode} onChange={toggleLightMode} />
              <div className={`block w-10 h-6 rounded-full ${isLightMode ? "bg-blue-500" : "bg-gray-300"}`}></div>
              <div
                className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${isLightMode ? "transform translate-x-4" : ""}`}
              ></div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

export default LightModeToggle
