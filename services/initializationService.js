/**
 * Servicio para la inicialización de la aplicación
 * Maneja la detección de primer uso y la configuración inicial
 */

import { ENVIRONMENT_MODES, getEnvironmentConfig } from "./environmentService"
import { STORAGE_KEYS } from "./storage/constants"
import { getItem, setItem } from "./storageService"
import { generateDemoWorkers, generateDemoPositions } from "./demoDataService"
import { auditLogService } from "./auditLogService"
import { diagnosticService } from "./diagnosticService" // Import diagnostic service

/**
 * Verifica si es la primera ejecución de la aplicación
 * @returns {boolean} - true si es la primera ejecución
 */
export const isFirstRun = () => {
  return !getItem(STORAGE_KEYS.INITIALIZED)
}

/**
 * Inicializa el entorno por defecto
 * @param {string} mode - Modo de entorno (demo, production, debug)
 * @returns {boolean} - true si la inicialización fue exitosa
 */
export const initializeDefaultEnvironment = (mode = ENVIRONMENT_MODES.PRODUCTION, config = {}) => {
  // Guardar el modo seleccionado
  setItem(STORAGE_KEYS.ENVIRONMENT_MODE, mode)

  // Guardar la configuración personalizada
  if (config) {
    setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify(config))
  }

  // Generar datos según el modo
  if (mode === ENVIRONMENT_MODES.DEMO || (config.createSampleData && mode === ENVIRONMENT_MODES.DEBUG)) {
    generateDemoData()
  }

  // Configurar el prefijo de almacenamiento
  const envConfig = getEnvironmentConfig(mode)
  setItem(STORAGE_KEYS.STORAGE_PREFIX, envConfig.storagePrefix)

  // Registrar la inicialización en el log de auditoría
  auditLogService.logEvent({
    type: "SYSTEM_INITIALIZATION",
    details: {
      mode,
      timestamp: new Date().toISOString(),
      config: { ...config, mode },
    },
  })

  // Marcar como inicializado
  setItem(STORAGE_KEYS.INITIALIZED, true)
  setItem(STORAGE_KEYS.INITIALIZATION_DATE, new Date().toISOString())

  return true
}

/**
 * Genera datos de ejemplo para el modo DEMO
 */
const generateDemoData = () => {
  try {
    // Generar trabajadores de ejemplo
    const workers = generateDemoWorkers(10) // 10 trabajadores de ejemplo

    // Generar posiciones de ejemplo
    const positions = generateDemoPositions(5) // 5 posiciones de ejemplo

    // Generar algunos registros de fichaje para los últimos 7 días
    generateDemoClockRecords(workers, positions, 7)

    // Registrar en el log de auditoría
    auditLogService.logEvent({
      type: "DEMO_DATA_GENERATED",
      details: {
        workersCount: workers.length,
        positionsCount: positions.length,
        timestamp: new Date().toISOString(),
      },
    })

    return true
  } catch (error) {
    console.error("Error al generar datos de demostración:", error)
    return false
  }
}

/**
 * Genera datos para el modo DEBUG
 */
export const generateDebugData = () => {
  try {
    // Inicializar con datos de demo
    generateDemoData()

    // Añadir datos adicionales para depuración

    // Registrar en diagnóstico
    diagnosticService.logDiagnostic({
      component: "initializationService",
      action: "generateDebugData",
      status: "success",
      details: "Datos de depuración generados correctamente",
    })
  } catch (error) {
    console.error("Error al generar datos de depuración:", error)

    // Registrar error en diagnóstico
    diagnosticService.logDiagnostic({
      component: "initializationService",
      action: "generateDebugData",
      status: "error",
      details: `Error: ${error.message}`,
    })
  }
}

/**
 * Inicializa las estructuras básicas necesarias
 */
export const initializeBasicStructures = () => {
  try {
    // Inicializar estructuras de datos vacías si no existen
    if (!getItem(STORAGE_KEYS.POSITIONS)) {
      setItem(STORAGE_KEYS.POSITIONS, [])
    }

    if (!getItem(STORAGE_KEYS.WORKERS)) {
      setItem(STORAGE_KEYS.WORKERS, [])
    }

    if (!getItem(STORAGE_KEYS.CLOCK_RECORDS)) {
      setItem(STORAGE_KEYS.CLOCK_RECORDS, [])
    }

    if (!getItem(STORAGE_KEYS.ABSENCE_REQUESTS)) {
      setItem(STORAGE_KEYS.ABSENCE_REQUESTS, [])
    }

    if (!getItem(STORAGE_KEYS.QR_TEMPLATES)) {
      setItem(STORAGE_KEYS.QR_TEMPLATES, [])
    }

    if (!getItem(STORAGE_KEYS.AUDIT_LOG)) {
      setItem(STORAGE_KEYS.AUDIT_LOG, [])
    }

    if (!getItem(STORAGE_KEYS.SYNC_QUEUE)) {
      setItem(STORAGE_KEYS.SYNC_QUEUE, [])
    }

    if (!getItem(STORAGE_KEYS.OFFLINE_BACKUPS)) {
      setItem(STORAGE_KEYS.OFFLINE_BACKUPS, [])
    }

    if (!getItem(STORAGE_KEYS.DIAGNOSTIC_LOGS)) {
      setItem(STORAGE_KEYS.DIAGNOSTIC_LOGS, [])
    }

    // Registrar en diagnóstico
    diagnosticService.logDiagnostic({
      component: "initializationService",
      action: "initializeBasicStructures",
      status: "success",
      details: "Estructuras básicas inicializadas correctamente",
    })
  } catch (error) {
    console.error("Error al inicializar estructuras básicas:", error)

    // Registrar error en diagnóstico
    diagnosticService.logDiagnostic({
      component: "initializationService",
      action: "initializeBasicStructures",
      status: "error",
      details: `Error: ${error.message}`,
    })
  }
}

/**
 * Inicializa la configuración de usuario
 * @param {string} mode - Modo de entorno
 */
export const initializeUserSettings = (mode) => {
  try {
    const config = getEnvironmentConfig(mode)

    // Configuración por defecto
    const defaultSettings = {
      theme: "light",
      language: "es",
      notifications: config.enableNotifications,
      autoBackup: config.enableAutoBackup,
      syncInterval: config.syncInterval,
      showDebugInfo: config.showDebugInfo,
      performanceMode: mode === ENVIRONMENT_MODES.PRODUCTION ? "optimized" : "full",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Guardar configuración
    setItem(STORAGE_KEYS.USER_SETTINGS, defaultSettings)

    // Registrar en diagnóstico
    diagnosticService.logDiagnostic({
      component: "initializationService",
      action: "initializeUserSettings",
      status: "success",
      details: "Configuración de usuario inicializada correctamente",
    })
  } catch (error) {
    console.error("Error al inicializar configuración de usuario:", error)

    // Registrar error en diagnóstico
    diagnosticService.logDiagnostic({
      component: "initializationService",
      action: "initializeUserSettings",
      status: "error",
      details: `Error: ${error.message}`,
    })
  }
}

/**
 * Genera registros de fichaje de ejemplo para los últimos 7 días
 * @param {Array} workers - Lista de trabajadores
 * @param {Array} positions - Lista de posiciones
 * @returns {Array} - Registros de fichaje generados
 */
const generateDemoClockRecords = (workers, positions, days) => {
  // Esta función generaría registros de fichaje aleatorios para los trabajadores
  // en las posiciones especificadas durante los últimos 'days' días

  // Implementación simplificada - en una implementación real, se generarían
  // registros más realistas con horarios coherentes

  // Por ahora, dejamos esta función como un placeholder
  console.log(
    `Generando registros de fichaje para ${workers.length} trabajadores en ${positions.length} posiciones durante ${days} días`,
  )

  // Aquí iría la lógica para generar y guardar los registros
}

/**
 * Genera solicitudes de ausencia de ejemplo
 * @param {Array} workers - Lista de trabajadores
 * @returns {Array} - Solicitudes de ausencia generadas
 */
const generateDemoAbsenceRequests = (workers) => {
  const requests = []
  const now = new Date()
  const statuses = ["pending", "approved", "rejected"]

  // Para algunos trabajadores, generar solicitudes
  workers.slice(0, 3).forEach((worker, index) => {
    // Fecha de inicio (entre 1 y 30 días en el futuro)
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + 1 + Math.floor(Math.random() * 30))

    // Duración (entre 1 y 14 días)
    const duration = 1 + Math.floor(Math.random() * 14)

    // Fecha de fin
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + duration)

    // Estado (para variedad)
    const status = statuses[index % statuses.length]

    // Tipos de ausencia
    const types = ["vacation", "sick", "personal"]
    const type = types[index % types.length]

    requests.push({
      id: `req-${worker.id}`,
      workerId: worker.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      type: type,
      reason: `Solicitud de ${type === "vacation" ? "vacaciones" : type === "sick" ? "baja por enfermedad" : "asunto personal"}`,
      status: status,
      companyId: worker.companyId,
      isDeleted: false,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 días atrás
      updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 días atrás
      approvedBy: status === "approved" ? "admin@example.com" : null,
      rejectedBy: status === "rejected" ? "admin@example.com" : null,
      notes: "",
    })
  })

  return requests
}

/**
 * Genera plantillas QR de ejemplo
 * @returns {Array} - Plantillas QR generadas
 */
const generateDemoQRTemplates = () => {
  return [
    {
      id: "template1",
      name: "Plantilla Estándar",
      description: "Plantilla QR estándar para puestos fijos",
      backgroundColor: "#ffffff",
      foregroundColor: "#000000",
      logoUrl: "",
      companyId: "demo-company",
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    },
    {
      id: "template2",
      name: "Plantilla Móvil",
      description: "Plantilla QR para puestos móviles",
      backgroundColor: "#f0f0f0",
      foregroundColor: "#0066cc",
      logoUrl: "",
      companyId: "demo-company",
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
    },
    {
      id: "template3",
      name: "Plantilla Temporal",
      description: "Plantilla QR para puestos temporales",
      backgroundColor: "#e6f7ff",
      foregroundColor: "#003366",
      logoUrl: "",
      companyId: "demo-company",
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
    },
  ]
}

/**
 * Reinicia la aplicación a su estado inicial
 * @returns {boolean} - true si el reinicio fue exitoso
 */
export const resetApplication = (preserveUserData = false) => {
  // Lista de claves que siempre se deben eliminar
  const keysToAlwaysDelete = [STORAGE_KEYS.INITIALIZED, STORAGE_KEYS.INITIALIZATION_DATE, STORAGE_KEYS.ENVIRONMENT_MODE]

  // Si no se preservan los datos de usuario, eliminar todo
  if (!preserveUserData) {
    // Eliminar todos los datos del localStorage
    localStorage.clear()

    // Registrar el reinicio completo
    auditLogService.logEvent({
      type: "SYSTEM_RESET",
      details: {
        type: "full",
        timestamp: new Date().toISOString(),
      },
    })
  } else {
    // Eliminar solo las claves específicas
    keysToAlwaysDelete.forEach((key) => localStorage.removeItem(key))

    // Registrar el reinicio parcial
    auditLogService.logEvent({
      type: "SYSTEM_RESET",
      details: {
        type: "partial",
        preserveUserData: true,
        timestamp: new Date().toISOString(),
      },
    })
  }

  return true
}

// Verificar si la aplicación necesita actualización
export const checkForUpdates = () => {
  const currentVersion = "1.0.0" // Versión actual de la aplicación
  const storedVersion = getItem(STORAGE_KEYS.APP_VERSION)

  if (!storedVersion || storedVersion !== currentVersion) {
    // Actualizar la versión almacenada
    setItem(STORAGE_KEYS.APP_VERSION, currentVersion)

    // Registrar la actualización
    auditLogService.logEvent({
      type: "SYSTEM_UPDATE",
      details: {
        fromVersion: storedVersion || "new_installation",
        toVersion: currentVersion,
        timestamp: new Date().toISOString(),
      },
    })

    return {
      needsUpdate: true,
      fromVersion: storedVersion,
      toVersion: currentVersion,
    }
  }

  return {
    needsUpdate: false,
    currentVersion,
  }
}

// Exportar el servicio completo
export const initializationService = {
  isFirstRun,
  initializeDefaultEnvironment,
  generateDemoData,
  generateDebugData,
  initializeBasicStructures,
  initializeUserSettings,
  resetApplication,
  checkForUpdates,
}

export default initializationService
