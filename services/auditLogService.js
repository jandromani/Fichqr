/**
 * Servicio para gestionar el registro de auditoría
 * Permite registrar y consultar eventos importantes del sistema
 */

import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getData, setData } from "./storage/baseStorage"

// Clave para almacenar el registro de auditoría
const AUDIT_LOG_KEY = STORAGE_KEYS.AUDIT_LOG

// Niveles de severidad para los eventos
export const SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical",
}

/**
 * Añade una entrada al registro de auditoría
 * @param {string} action - Acción realizada
 * @param {string} userId - ID del usuario que realizó la acción
 * @param {string} targetId - ID del objeto afectado
 * @param {string} module - Módulo donde ocurrió la acción
 * @param {Object} details - Detalles adicionales
 * @param {string} severity - Nivel de severidad
 * @returns {Object} - Entrada creada
 */
export const addAuditLogEntry = (
  action,
  userId = "system",
  targetId = null,
  module = "general",
  details = {},
  severity = SEVERITY.INFO,
) => {
  try {
    // Obtener registro actual
    const auditLog = getData(AUDIT_LOG_KEY, [])

    // Crear nueva entrada
    const entry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      userId,
      targetId,
      module,
      details,
      severity,
      deviceInfo: getDeviceInfo(),
    }

    // Añadir al registro
    auditLog.push(entry)

    // Limitar tamaño del registro (mantener últimos 1000 eventos)
    if (auditLog.length > 1000) {
      auditLog.splice(0, auditLog.length - 1000)
    }

    // Guardar registro actualizado
    setData(AUDIT_LOG_KEY, auditLog)

    return entry
  } catch (error) {
    console.error("Error al añadir entrada al registro de auditoría:", error)
    // Intentar guardar el error en localStorage
    try {
      const errorLog = getData("error_log", [])
      errorLog.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        context: "auditLogService.addAuditLogEntry",
      })
      setData("error_log", errorLog)
    } catch (e) {
      // Si falla, no podemos hacer mucho más
    }
    return null
  }
}

/**
 * Obtiene información básica del dispositivo
 * @returns {Object} - Información del dispositivo
 */
const getDeviceInfo = () => {
  try {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    }
  } catch (error) {
    return {}
  }
}

/**
 * Obtiene entradas del registro de auditoría con filtros
 * @param {Object} filters - Filtros a aplicar
 * @returns {Array} - Entradas filtradas
 */
export const getAuditLogEntries = (filters = {}) => {
  try {
    const auditLog = getData(AUDIT_LOG_KEY, [])

    // Sin filtros, devolver todo
    if (Object.keys(filters).length === 0) {
      return auditLog
    }

    // Aplicar filtros
    return auditLog.filter((entry) => {
      let matches = true

      if (filters.action && entry.action !== filters.action) {
        matches = false
      }

      if (filters.userId && entry.userId !== filters.userId) {
        matches = false
      }

      if (filters.targetId && entry.targetId !== filters.targetId) {
        matches = false
      }

      if (filters.module && entry.module !== filters.module) {
        matches = false
      }

      if (filters.severity && entry.severity !== filters.severity) {
        matches = false
      }

      if (filters.fromDate) {
        const entryDate = new Date(entry.timestamp)
        const fromDate = new Date(filters.fromDate)
        if (entryDate < fromDate) {
          matches = false
        }
      }

      if (filters.toDate) {
        const entryDate = new Date(entry.timestamp)
        const toDate = new Date(filters.toDate)
        if (entryDate > toDate) {
          matches = false
        }
      }

      return matches
    })
  } catch (error) {
    console.error("Error al obtener entradas del registro de auditoría:", error)
    return []
  }
}

/**
 * Exporta el registro de auditoría a formato JSON
 * @param {Array} entries - Entradas a exportar (o todas si no se especifica)
 * @returns {string} - JSON con las entradas
 */
export const exportAuditLog = (entries = null) => {
  try {
    const dataToExport = entries || getData(AUDIT_LOG_KEY, [])
    return JSON.stringify(dataToExport, null, 2)
  } catch (error) {
    console.error("Error al exportar registro de auditoría:", error)
    return JSON.stringify({ error: "Error al exportar registro" })
  }
}

/**
 * Limpia entradas antiguas del registro de auditoría
 * @param {number} olderThanDays - Días de antigüedad para eliminar
 * @returns {number} - Número de entradas eliminadas
 */
export const cleanupAuditLog = (olderThanDays = 90) => {
  try {
    const auditLog = getData(AUDIT_LOG_KEY, [])
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const filteredLog = auditLog.filter((entry) => {
      const entryDate = new Date(entry.timestamp)
      return entryDate >= cutoffDate
    })

    const removedCount = auditLog.length - filteredLog.length

    if (removedCount > 0) {
      setData(AUDIT_LOG_KEY, filteredLog)

      // Registrar la limpieza
      addAuditLogEntry(
        "cleanupAuditLog",
        "system",
        null,
        "auditLogService",
        {
          removedCount,
          olderThanDays,
        },
        SEVERITY.INFO,
      )
    }

    return removedCount
  } catch (error) {
    console.error("Error al limpiar registro de auditoría:", error)
    return 0
  }
}

/**
 * Registra un evento crítico que requiere atención inmediata
 * @param {string} action - Acción o evento
 * @param {Object} details - Detalles del evento
 * @returns {Object} - Entrada creada
 */
export const logCriticalEvent = (action, details = {}) => {
  return addAuditLogEntry(
    action,
    "system",
    null,
    "security",
    {
      ...details,
      critical: true,
      needsAttention: true,
    },
    SEVERITY.CRITICAL,
  )
}

export const auditLogService = {
  addAuditLogEntry,
  getAuditLogEntries,
  exportAuditLog,
  cleanupAuditLog,
  logCriticalEvent,
  SEVERITY,
  logEvent: addAuditLogEntry, // Alias para compatibilidad
}

export default auditLogService
