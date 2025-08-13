"use client"

import { createContext, useState, useEffect, useContext } from "react"
import { ENVIRONMENT_MODES, getEnvironmentConfig } from "../services/environmentService"
import { getItem, setItem } from "../services/storageService"
import { STORAGE_KEYS } from "../services/storage/constants"
import { isFirstRun } from "../services/initializationService"

// Crear el contexto
const EnvironmentContext = createContext()

// Proveedor del contexto
export function EnvironmentProvider({ children }) {
  const [currentMode, setCurrentMode] = useState(ENVIRONMENT_MODES.PRODUCTION)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [config, setConfig] = useState(getEnvironmentConfig(ENVIRONMENT_MODES.PRODUCTION))
  const [isLoading, setIsLoading] = useState(true)

  // Cargar el modo y la configuración al iniciar
  useEffect(() => {
    const loadEnvironment = () => {
      try {
        // Verificar si es la primera ejecución
        const firstRun = isFirstRun()
        setIsFirstTime(firstRun)

        // Cargar el modo guardado o usar el predeterminado
        const savedMode = getItem(STORAGE_KEYS.ENVIRONMENT_MODE) || ENVIRONMENT_MODES.PRODUCTION
        setCurrentMode(savedMode)

        // Cargar la configuración para el modo actual
        const envConfig = getEnvironmentConfig(savedMode)

        // Cargar la configuración personalizada del usuario
        const userConfigStr = getItem(STORAGE_KEYS.USER_CONFIG)
        const userConfig = userConfigStr ? JSON.parse(userConfigStr) : {}

        // Combinar la configuración predeterminada con la personalizada
        setConfig({ ...envConfig, ...userConfig })

        // Verificar si la aplicación está inicializada
        const initialized = getItem(STORAGE_KEYS.INITIALIZED)
        setIsInitialized(!!initialized)

        setIsLoading(false)
      } catch (error) {
        console.error("Error al cargar el entorno:", error)
        // En caso de error, usar valores predeterminados
        setCurrentMode(ENVIRONMENT_MODES.PRODUCTION)
        setConfig(getEnvironmentConfig(ENVIRONMENT_MODES.PRODUCTION))
        setIsLoading(false)
      }
    }

    loadEnvironment()
  }, [])

  // Función para cambiar el modo
  const changeMode = (newMode) => {
    if (Object.values(ENVIRONMENT_MODES).includes(newMode)) {
      setCurrentMode(newMode)
      setItem(STORAGE_KEYS.ENVIRONMENT_MODE, newMode)

      // Actualizar la configuración para el nuevo modo
      const newConfig = getEnvironmentConfig(newMode)
      setConfig(newConfig)

      // Registrar el cambio de modo en el log (si estuviera disponible)
      console.log(`Modo cambiado a: ${newMode}`)

      return true
    }
    return false
  }

  // Función para actualizar la configuración
  const updateConfig = (newConfig) => {
    setConfig({ ...config, ...newConfig })

    // Guardar la configuración personalizada
    const userConfigStr = getItem(STORAGE_KEYS.USER_CONFIG)
    const userConfig = userConfigStr ? JSON.parse(userConfigStr) : {}
    const updatedUserConfig = { ...userConfig, ...newConfig }

    setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify(updatedUserConfig))
  }

  // Verificar si una característica está habilitada
  const isFeatureEnabled = (featureName) => {
    // Si enableAllFeatures es true, todas las características están habilitadas
    if (config.enableAllFeatures) {
      return true
    }

    // Verificar características específicas
    switch (featureName) {
      case "debugInfo":
        return config.showDebugInfo
      case "autoLogin":
        return config.autoLogin
      case "fakeData":
        return config.enableFakeData
      case "performanceMetrics":
        return config.enablePerformanceMetrics
      // Añadir más características según sea necesario
      default:
        return false
    }
  }

  // Valor del contexto
  const contextValue = {
    currentMode,
    changeMode,
    isInitialized,
    isFirstTime,
    config,
    updateConfig,
    isFeatureEnabled,
    isLoading,
    isDemoMode: currentMode === ENVIRONMENT_MODES.DEMO,
    isDebugMode: currentMode === ENVIRONMENT_MODES.DEBUG,
    isProductionMode: currentMode === ENVIRONMENT_MODES.PRODUCTION,
  }

  return <EnvironmentContext.Provider value={contextValue}>{children}</EnvironmentContext.Provider>
}

// Hook personalizado para usar el contexto
export function useEnvironment() {
  const context = useContext(EnvironmentContext)
  if (context === undefined) {
    throw new Error("useEnvironment debe ser usado dentro de un EnvironmentProvider")
  }
  return context
}
