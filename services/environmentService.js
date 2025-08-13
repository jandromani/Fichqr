/**
 * Servicio para gestionar los modos de entorno de la aplicación
 * Define los diferentes modos (DEMO, PRODUCCIÓN, DEBUG) y sus configuraciones
 */

// Definición de los modos de entorno disponibles
export const ENVIRONMENT_MODES = {
  DEMO: "demo",
  PRODUCTION: "production",
  DEBUG: "debug",
}

// Configuraciones predeterminadas para cada modo
export const DEFAULT_CONFIG = {
  [ENVIRONMENT_MODES.DEMO]: {
    enableFakeData: true,
    enableAllFeatures: true,
    showDebugInfo: true,
    autoLogin: true,
    syncInterval: 30000, // 30 segundos
    defaultCredentials: {
      admin: { username: "admin", password: "demo123" },
      user: { username: "usuario", password: "demo123" },
    },
    storagePrefix: "fichaje_demo_",
    maxStorageUsage: 10 * 1024 * 1024, // 10MB
    enablePerformanceMetrics: true,
  },
  [ENVIRONMENT_MODES.PRODUCTION]: {
    enableFakeData: false,
    enableAllFeatures: false,
    showDebugInfo: false,
    autoLogin: false,
    syncInterval: 300000, // 5 minutos
    defaultCredentials: null,
    storagePrefix: "fichaje_",
    maxStorageUsage: 50 * 1024 * 1024, // 50MB
    enablePerformanceMetrics: false,
  },
  [ENVIRONMENT_MODES.DEBUG]: {
    enableFakeData: true,
    enableAllFeatures: true,
    showDebugInfo: true,
    autoLogin: false,
    syncInterval: 10000, // 10 segundos
    defaultCredentials: {
      admin: { username: "debug", password: "debug123" },
    },
    storagePrefix: "fichaje_debug_",
    maxStorageUsage: 20 * 1024 * 1024, // 20MB
    enablePerformanceMetrics: true,
  },
}

// Obtener la configuración para un modo específico
export const getEnvironmentConfig = (mode = ENVIRONMENT_MODES.PRODUCTION) => {
  return DEFAULT_CONFIG[mode] || DEFAULT_CONFIG[ENVIRONMENT_MODES.PRODUCTION]
}

// Verificar si una característica está habilitada en el modo actual
export const isFeatureEnabled = (feature, mode = ENVIRONMENT_MODES.PRODUCTION) => {
  const config = getEnvironmentConfig(mode)

  // Si enableAllFeatures es true, todas las características están habilitadas
  if (config.enableAllFeatures) {
    return true
  }

  // Verificar características específicas
  switch (feature) {
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

// Obtener el prefijo de almacenamiento para el modo actual
export const getStoragePrefix = (mode = ENVIRONMENT_MODES.PRODUCTION) => {
  const config = getEnvironmentConfig(mode)
  return config.storagePrefix
}

// Obtener las credenciales predeterminadas para el modo actual
export const getDefaultCredentials = (mode = ENVIRONMENT_MODES.PRODUCTION) => {
  const config = getEnvironmentConfig(mode)
  return config.defaultCredentials
}

/**
 * Obtiene el color asociado a cada modo para indicadores visuales
 * @param {string} mode - Modo de entorno
 * @returns {string} - Clase CSS para el color del modo
 */
export const getModeColorClass = (mode) => {
  switch (mode) {
    case ENVIRONMENT_MODES.DEMO:
      return "bg-blue-500"
    case ENVIRONMENT_MODES.DEBUG:
      return "bg-yellow-500"
    case ENVIRONMENT_MODES.PRODUCTION:
      return "bg-green-500"
    default:
      return "bg-gray-500"
  }
}

/**
 * Obtiene el texto descriptivo para cada modo
 * @param {string} mode - Modo de entorno
 * @returns {string} - Texto descriptivo del modo
 */
export const getModeDisplayName = (mode) => {
  switch (mode) {
    case ENVIRONMENT_MODES.DEMO:
      return "DEMO"
    case ENVIRONMENT_MODES.DEBUG:
      return "DEBUG"
    case ENVIRONMENT_MODES.PRODUCTION:
      return "PRODUCCIÓN"
    default:
      return "DESCONOCIDO"
  }
}

// Exportar el servicio completo
export const environmentService = {
  ENVIRONMENT_MODES,
  DEFAULT_CONFIG,
  getEnvironmentConfig,
  isFeatureEnabled,
  getStoragePrefix,
  getDefaultCredentials,
  getModeColorClass,
  getModeDisplayName,
}

export default environmentService
