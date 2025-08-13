/**
 * Servicio optimizado para gestión de almacenamiento
 * Implementa compresión, límites y limpieza automática
 */

import { getData, setData } from "./storage/baseStorage"
import {
  compressData,
  decompressData,
  compressHistoricalRecords,
  decompressHistoricalRecords,
} from "./compressionService"
import { getLocalStorageUsage, hasEnoughStorage } from "./deviceCapabilityService"

// Configuración por defecto
const DEFAULT_CONFIG = {
  compression: {
    enabled: true,
    historicalDays: 30, // Días considerados históricos para compresión
    autoCompress: true, // Comprimir automáticamente datos antiguos
  },
  cleanup: {
    enabled: true,
    maxAge: 365, // Días máximos para mantener registros
    maxRecords: 10000, // Número máximo de registros a mantener
    autoCleanup: true, // Limpiar automáticamente datos antiguos
  },
  quotas: {
    warningThreshold: 80, // Porcentaje de uso para mostrar advertencia
    criticalThreshold: 95, // Porcentaje de uso para entrar en modo crítico
  },
}

/**
 * Guarda datos con optimizaciones para dispositivos de gama baja
 * @param {string} key - Clave de almacenamiento
 * @param {any} data - Datos a almacenar
 * @param {Object} options - Opciones de almacenamiento
 * @returns {boolean} - true si se guardó correctamente
 */
export const saveOptimized = (key, data, options = {}) => {
  try {
    // Verificar si hay suficiente espacio
    const dataSize = JSON.stringify(data).length
    if (!hasEnoughStorage(dataSize)) {
      console.warn(`Espacio insuficiente para guardar ${key}. Intentando liberar espacio...`)

      // Intentar liberar espacio
      if (!cleanupOldData(options.cleanup)) {
        throw new Error("No hay suficiente espacio de almacenamiento y no se pudo liberar")
      }
    }

    // Configuración combinada
    const config = {
      ...DEFAULT_CONFIG,
      ...options,
    }

    // Determinar si se debe comprimir
    let dataToSave = data
    const shouldCompress =
      config.compression?.enabled &&
      (dataSize > 10240 || // Comprimir si es mayor a 10KB
        (Array.isArray(data) && data.length > 100)) // O si tiene muchos elementos

    if (shouldCompress) {
      dataToSave = compressData(data)
    }

    // Guardar los datos
    setData(key, dataToSave)

    // Si es un array grande, considerar comprimir datos históricos
    if (Array.isArray(data) && data.length > 200 && config.compression?.autoCompress) {
      setTimeout(() => {
        compressHistoricalData(key, config.compression)
      }, 100) // Ejecutar en segundo plano
    }

    return true
  } catch (error) {
    console.error(`Error al guardar datos optimizados para ${key}:`, error)

    // Intentar guardar sin optimizaciones como fallback
    try {
      setData(key, data)
      return true
    } catch (fallbackError) {
      console.error(`Error en fallback al guardar ${key}:`, fallbackError)
      return false
    }
  }
}

/**
 * Obtiene datos con soporte para descompresión automática
 * @param {string} key - Clave de almacenamiento
 * @param {any} defaultValue - Valor por defecto
 * @returns {any} - Datos almacenados o valor por defecto
 */
export const getOptimized = (key, defaultValue = null) => {
  try {
    const data = getData(key)

    // Si no hay datos, devolver valor por defecto
    if (!data) return defaultValue

    // Verificar si los datos están comprimidos
    if (data.compressed || (data.meta && data.meta.compressed)) {
      return decompressData(data)
    }

    // Verificar si es una estructura de datos históricos comprimidos
    if (data.recent && data.historical) {
      return decompressHistoricalRecords(data)
    }

    return data
  } catch (error) {
    console.error(`Error al obtener datos optimizados para ${key}:`, error)
    return defaultValue
  }
}

/**
 * Comprime datos históricos para ahorrar espacio
 * @param {string} key - Clave de almacenamiento
 * @param {Object} options - Opciones de compresión
 * @returns {boolean} - true si se comprimió correctamente
 */
export const compressHistoricalData = (key, options = {}) => {
  try {
    // Obtener datos actuales
    const data = getData(key)

    // Verificar si hay datos y son un array
    if (!data || !Array.isArray(data) || data.length < 100) {
      return false // No comprimir si hay pocos datos
    }

    // Verificar si ya están en formato comprimido
    if (data.recent && data.historical) {
      return false // Ya está en formato comprimido
    }

    // Comprimir datos históricos
    const compressedData = compressHistoricalRecords(data, {
      recentDays: options.historicalDays || DEFAULT_CONFIG.compression.historicalDays,
    })

    // Guardar datos comprimidos
    setData(key, compressedData)

    return true
  } catch (error) {
    console.error(`Error al comprimir datos históricos para ${key}:`, error)
    return false
  }
}

/**
 * Limpia datos antiguos para liberar espacio
 * @param {Object} options - Opciones de limpieza
 * @returns {boolean} - true si se liberó espacio
 */
export const cleanupOldData = (options = {}) => {
  try {
    const config = {
      ...DEFAULT_CONFIG.cleanup,
      ...options,
    }

    // Verificar uso actual
    const storageInfo = getLocalStorageUsage()
    const usedPercentage = Number.parseFloat(storageInfo.usedPercentage)

    // Si no es crítico, no hacer nada
    if (usedPercentage < DEFAULT_CONFIG.quotas.warningThreshold) {
      return true
    }

    let spaceFreed = false

    // Limpiar datos antiguos de registros de fichaje
    const clockRecords = getData("clockRecords")
    if (Array.isArray(clockRecords) && clockRecords.length > 0) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - config.maxAge)

      // Filtrar registros antiguos
      const filteredRecords = clockRecords.filter((record) => {
        const recordDate = new Date(record.date || record.createdAt || record.timestamp)
        return recordDate >= cutoffDate
      })

      // Si se eliminaron registros, guardar
      if (filteredRecords.length < clockRecords.length) {
        setData("clockRecords", filteredRecords)
        spaceFreed = true
      }
    }

    // Limpiar datos antiguos de solicitudes de ausencia
    const absenceRequests = getData("absenceRequests")
    if (Array.isArray(absenceRequests) && absenceRequests.length > 0) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - config.maxAge)

      // Filtrar solicitudes antiguas
      const filteredRequests = absenceRequests.filter((request) => {
        const requestDate = new Date(request.endDate || request.createdAt || request.timestamp)
        return requestDate >= cutoffDate
      })

      // Si se eliminaron solicitudes, guardar
      if (filteredRequests.length < absenceRequests.length) {
        setData("absenceRequests", filteredRequests)
        spaceFreed = true
      }
    }

    // Limpiar notificaciones antiguas
    const notifications = getData("notifications")
    if (Array.isArray(notifications) && notifications.length > 100) {
      // Mantener solo las 100 más recientes
      const sortedNotifications = [...notifications].sort((a, b) => {
        return (b.timestamp || 0) - (a.timestamp || 0)
      })

      const trimmedNotifications = sortedNotifications.slice(0, 100)
      setData("notifications", trimmedNotifications)
      spaceFreed = true
    }

    return spaceFreed
  } catch (error) {
    console.error("Error al limpiar datos antiguos:", error)
    return false
  }
}

/**
 * Optimiza todos los datos almacenados
 * @returns {Object} - Resultados de la optimización
 */
export const optimizeAllStorage = () => {
  const results = {
    compressed: [],
    cleaned: [],
    errors: [],
    spaceFreed: false,
  }

  try {
    // Obtener uso actual
    const beforeUsage = getLocalStorageUsage()

    // Comprimir datos históricos grandes
    const keysToCompress = ["clockRecords", "absenceRequests", "auditLog"]

    keysToCompress.forEach((key) => {
      try {
        const success = compressHistoricalData(key)
        if (success) {
          results.compressed.push(key)
        }
      } catch (error) {
        results.errors.push({ key, operation: "compress", error: error.message })
      }
    })

    // Limpiar datos antiguos
    const cleaned = cleanupOldData()
    if (cleaned) {
      results.cleaned.push("oldRecords")
      results.spaceFreed = true
    }

    // Obtener uso después de optimizar
    const afterUsage = getLocalStorageUsage()

    // Calcular espacio liberado
    const beforeBytes = beforeUsage.totalSizeBytes
    const afterBytes = afterUsage.totalSizeBytes
    const bytesDifference = beforeBytes - afterBytes

    results.beforeSize = beforeUsage.totalSize
    results.afterSize = afterUsage.totalSize
    results.bytesSaved = bytesDifference > 0 ? `${(bytesDifference / 1024).toFixed(2)} KB` : "0 KB"
    results.percentSaved = bytesDifference > 0 ? `${((bytesDifference / beforeBytes) * 100).toFixed(2)}%` : "0%"

    return results
  } catch (error) {
    console.error("Error al optimizar almacenamiento:", error)
    results.errors.push({ operation: "optimize", error: error.message })
    return results
  }
}

export default {
  saveOptimized,
  getOptimized,
  compressHistoricalData,
  cleanupOldData,
  optimizeAllStorage,
}
