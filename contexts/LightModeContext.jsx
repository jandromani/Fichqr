"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { detectLowEndDevice } from "../services/deviceCapabilityService"

// Crear el contexto
const LightModeContext = createContext()

/**
 * Proveedor del contexto de modo ligero
 * Gestiona si la aplicación debe usar el modo ligero para dispositivos de gama baja
 */
export function LightModeProvider({ children }) {
  // Estado para controlar si el modo ligero está activado
  const [isLightMode, setIsLightMode] = useState(false)

  // Estado para almacenar las capacidades del dispositivo
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    isLowEndDevice: false,
    details: {},
  })

  // Estado para controlar si el modo ligero está forzado por el usuario
  const [isLightModeForced, setIsLightModeForced] = useState(false)

  // Efecto para detectar si el dispositivo es de gama baja al cargar
  useEffect(() => {
    // Verificar si hay una preferencia guardada
    const savedPreference = localStorage.getItem("lightModePreference")

    if (savedPreference) {
      const preference = JSON.parse(savedPreference)
      setIsLightMode(preference.enabled)
      setIsLightModeForced(preference.forced)
    } else {
      // Si no hay preferencia, detectar automáticamente
      const capabilities = detectLowEndDevice()
      setDeviceCapabilities(capabilities)

      // Activar modo ligero automáticamente si es un dispositivo de gama baja
      if (capabilities.isLowEndDevice) {
        setIsLightMode(true)
        // Guardar la preferencia detectada automáticamente
        localStorage.setItem(
          "lightModePreference",
          JSON.stringify({
            enabled: true,
            forced: false,
            autoDetected: true,
          }),
        )
      }
    }
  }, [])

  // Función para activar/desactivar el modo ligero manualmente
  const toggleLightMode = () => {
    const newValue = !isLightMode
    setIsLightMode(newValue)
    setIsLightModeForced(true)

    // Guardar la preferencia del usuario
    localStorage.setItem(
      "lightModePreference",
      JSON.stringify({
        enabled: newValue,
        forced: true,
        autoDetected: false,
      }),
    )
  }

  // Función para restablecer a la detección automática
  const resetToAutoDetection = () => {
    const capabilities = detectLowEndDevice()
    setDeviceCapabilities(capabilities)
    setIsLightMode(capabilities.isLowEndDevice)
    setIsLightModeForced(false)

    // Eliminar la preferencia forzada
    localStorage.removeItem("lightModePreference")
  }

  // Valor del contexto
  const contextValue = {
    isLightMode,
    toggleLightMode,
    resetToAutoDetection,
    isLightModeForced,
    deviceCapabilities,
  }

  return <LightModeContext.Provider value={contextValue}>{children}</LightModeContext.Provider>
}

// Hook personalizado para usar el contexto
export function useLightMode() {
  const context = useContext(LightModeContext)
  if (!context) {
    throw new Error("useLightMode debe usarse dentro de un LightModeProvider")
  }
  return context
}
