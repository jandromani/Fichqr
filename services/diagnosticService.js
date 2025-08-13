/**
 * Servicio para diagnóstico y verificación del sistema
 * Proporciona herramientas para analizar el estado de la aplicación
 */
import { getAllItems, getItem, setItem } from "./storageService"
import { STORAGE_KEYS } from "./storage/constants"
import { compressionService } from "./compressionService"
import { connectionMonitorService } from "./connectionMonitorService"
import { syncQueueService } from "./syncQueueService"
import { offlineBackupService } from "./offlineBackupService"
import { auditLogService } from "./auditLogService"

class DiagnosticService {
  /**
   * Obtiene el uso de almacenamiento
   * @returns {Promise<Object>} - Información de uso de almacenamiento
   */
  async getStorageUsage() {
    try {
      // Obtener estimación de uso de localStorage
      const allData = await getAllItems()
      const serializedData = JSON.stringify(allData)
      const usedBytes = new Blob([serializedData]).size

      // Obtener cuota disponible (si el navegador lo soporta)
      let quota = null
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        quota = estimate.quota
      }

      return {
        used: usedBytes,
        quota: quota,
        percentage: quota ? (usedBytes / quota) * 100 : null,
      }
    } catch (error) {
      console.error("Error al obtener uso de almacenamiento:", error)
      throw error
    }
  }

  /**
   * Obtiene el conteo de registros por tipo
   * @returns {Promise<Object>} - Conteo de registros
   */
  async getRecordsCount() {
    try {
      // Obtener datos de diferentes tipos
      const clockRecords = (await getItem(STORAGE_KEYS.CLOCK_RECORDS)) || "[]"
      const workers = (await getItem(STORAGE_KEYS.WORKERS)) || "[]"
      const positions = (await getItem(STORAGE_KEYS.POSITIONS)) || "[]"
      const absenceRequests = (await getItem(STORAGE_KEYS.ABSENCE_REQUESTS)) || "[]"
      const auditLogs = (await getItem(STORAGE_KEYS.AUDIT_LOGS)) || "[]"

      // Parsear y contar
      const clockRecordsCount = JSON.parse(clockRecords).length
      const workersCount = JSON.parse(workers).length
      const positionsCount = JSON.parse(positions).length
      const absenceRequestsCount = JSON.parse(absenceRequests).length
      const auditLogsCount = JSON.parse(auditLogs).length

      return {
        clockRecords: clockRecordsCount,
        workers: workersCount,
        positions: positionsCount,
        absenceRequests: absenceRequestsCount,
        auditLogs: auditLogsCount,
        total: clockRecordsCount + workersCount + positionsCount + absenceRequestsCount + auditLogsCount,
      }
    } catch (error) {
      console.error("Error al obtener conteo de registros:", error)
      throw error
    }
  }

  /**
   * Prueba el almacenamiento
   * @returns {Promise<Object>} - Resultados de la prueba
   */
  async testStorage() {
    try {
      const results = {
        status: "success",
        tests: {
          write: { success: false, time: 0 },
          read: { success: false, time: 0 },
          delete: { success: false, time: 0 },
          compression: { success: false, time: 0, ratio: 0 },
        },
      }

      const testKey = `${STORAGE_KEYS.DIAGNOSTIC_TEST}_${Date.now()}`
      const testData = { test: "data", timestamp: Date.now(), array: Array(1000).fill("test") }
      const testDataStr = JSON.stringify(testData)

      // Prueba de escritura
      const writeStart = performance.now()
      await setItem(testKey, testDataStr)
      results.tests.write.time = performance.now() - writeStart
      results.tests.write.success = true

      // Prueba de lectura
      const readStart = performance.now()
      const readData = await getItem(testKey)
      results.tests.read.time = performance.now() - readStart
      results.tests.read.success = readData === testDataStr

      // Prueba de compresión
      const compressStart = performance.now()
      const compressed = await compressionService.compress(testDataStr)
      results.tests.compression.time = performance.now() - compressStart
      results.tests.compression.success = compressed && compressed.length > 0
      results.tests.compression.ratio = compressed ? testDataStr.length / compressed.length : 0

      // Prueba de eliminación
      const deleteStart = performance.now()
      await setItem(testKey, null)
      results.tests.delete.time = performance.now() - deleteStart
      const checkDeleted = await getItem(testKey)
      results.tests.delete.success = checkDeleted === null || checkDeleted === undefined

      // Determinar estado general
      if (!results.tests.write.success || !results.tests.read.success || !results.tests.delete.success) {
        results.status = "error"
      } else if (results.tests.compression.ratio < 1.2) {
        results.status = "warning"
      }

      return results
    } catch (error) {
      console.error("Error en prueba de almacenamiento:", error)
      return {
        status: "error",
        error: error.message,
        tests: {},
      }
    }
  }

  /**
   * Prueba la conexión
   * @returns {Promise<Object>} - Resultados de la prueba
   */
  async testConnection() {
    try {
      const results = {
        status: "success",
        tests: {
          online: { success: false },
          latency: { success: false, value: null },
          stability: { success: false, value: null },
        },
      }

      // Verificar estado online
      const connectionStatus = connectionMonitorService.getConnectionStatus()
      results.tests.online.success = connectionStatus.status === connectionMonitorService.CONNECTION_STATUS.ONLINE

      // Verificar latencia
      if (connectionStatus.latency !== undefined) {
        results.tests.latency.value = connectionStatus.latency
        results.tests.latency.success = connectionStatus.latency < 500 // Menos de 500ms es bueno
      }

      // Verificar estabilidad
      const history = connectionStatus.history || []
      if (history.length > 0) {
        const successCount = history.filter((entry) => entry.success).length
        const stabilityRatio = history.length > 0 ? successCount / history.length : 0
        results.tests.stability.value = stabilityRatio
        results.tests.stability.success = stabilityRatio > 0.8 // Más del 80% de éxito es bueno
      }

      // Determinar estado general
      if (!results.tests.online.success) {
        results.status = "error"
      } else if (!results.tests.latency.success || !results.tests.stability.success) {
        results.status = "warning"
      }

      return results
    } catch (error) {
      console.error("Error en prueba de conexión:", error)
      return {
        status: "error",
        error: error.message,
        tests: {},
      }
    }
  }

  /**
   * Prueba la cola de sincronización
   * @returns {Promise<Object>} - Resultados de la prueba
   */
  async testSyncQueue() {
    try {
      const results = {
        status: "success",
        tests: {
          queueStatus: { success: false },
          pendingItems: { success: false, count: 0 },
          failedItems: { success: false, count: 0 },
        },
      }

      // Obtener estado de la cola
      const queueStatus = syncQueueService.getQueueStatus()

      // Verificar estado de la cola
      results.tests.queueStatus.success = !queueStatus.isProcessing || queueStatus.total === 0

      // Verificar elementos pendientes
      results.tests.pendingItems.count = queueStatus.pending + queueStatus.inProgress
      results.tests.pendingItems.success = results.tests.pendingItems.count < 10 // Menos de 10 pendientes es bueno

      // Verificar elementos fallidos
      results.tests.failedItems.count = queueStatus.failed
      results.tests.failedItems.success = queueStatus.failed === 0 // Ningún fallo es bueno

      // Determinar estado general
      if (results.tests.failedItems.count > 0) {
        results.status = "error"
      } else if (results.tests.pendingItems.count > 10) {
        results.status = "warning"
      }

      return results
    } catch (error) {
      console.error("Error en prueba de cola de sincronización:", error)
      return {
        status: "error",
        error: error.message,
        tests: {},
      }
    }
  }

  /**
   * Prueba el sistema de respaldo
   * @returns {Promise<Object>} - Resultados de la prueba
   */
  async testBackupSystem() {
    try {
      const results = {
        status: "success",
        tests: {
          backupsExist: { success: false, count: 0 },
          recentBackup: { success: false, daysAgo: null },
          backupSize: { success: false, averageSize: 0 },
        },
      }

      // Obtener lista de respaldos
      const backups = offlineBackupService.getBackupsList()

      // Verificar existencia de respaldos
      results.tests.backupsExist.count = backups.length
      results.tests.backupsExist.success = backups.length > 0

      // Verificar respaldo reciente
      if (backups.length > 0) {
        const latestBackup = backups.sort((a, b) => b.timestamp - a.timestamp)[0]
        const daysAgo = (Date.now() - latestBackup.timestamp) / (1000 * 60 * 60 * 24)
        results.tests.recentBackup.daysAgo = daysAgo
        results.tests.recentBackup.success = daysAgo < 7 // Menos de 7 días es bueno
      }

      // Verificar tamaño de respaldos
      if (backups.length > 0) {
        const totalSize = backups.reduce((sum, backup) => sum + (backup.size || 0), 0)
        results.tests.backupSize.averageSize = totalSize / backups.length
        results.tests.backupSize.success = true // Siempre éxito, solo informativo
      }

      // Determinar estado general
      if (!results.tests.backupsExist.success) {
        results.status = "error"
      } else if (!results.tests.recentBackup.success) {
        results.status = "warning"
      }

      return results
    } catch (error) {
      console.error("Error en prueba de sistema de respaldo:", error)
      return {
        status: "error",
        error: error.message,
        tests: {},
      }
    }
  }

  /**
   * Prueba el rendimiento del sistema
   * @returns {Promise<Object>} - Resultados de la prueba
   */
  async testPerformance() {
    try {
      const results = {
        status: "success",
        tests: {
          storage: { success: false, writeTime: 0, readTime: 0 },
          compression: { success: false, time: 0, ratio: 0 },
          rendering: { success: false, time: 0 },
        },
      }

      // Prueba de rendimiento de almacenamiento
      const testKey = `${STORAGE_KEYS.DIAGNOSTIC_TEST}_perf_${Date.now()}`
      const testData = Array(5000).fill({ test: "performance", value: Math.random() })
      const testDataStr = JSON.stringify(testData)

      // Medir escritura
      const writeStart = performance.now()
      await setItem(testKey, testDataStr)
      results.tests.storage.writeTime = performance.now() - writeStart

      // Medir lectura
      const readStart = performance.now()
      await getItem(testKey)
      results.tests.storage.readTime = performance.now() - readStart

      // Limpiar
      await setItem(testKey, null)

      // Evaluar rendimiento de almacenamiento
      results.tests.storage.success = results.tests.storage.writeTime < 500 && results.tests.storage.readTime < 200

      // Prueba de rendimiento de compresión
      const compressStart = performance.now()
      const compressed = await compressionService.compress(testDataStr)
      results.tests.compression.time = performance.now() - compressStart
      results.tests.compression.ratio = testDataStr.length / compressed.length
      results.tests.compression.success = results.tests.compression.time < 1000 && results.tests.compression.ratio > 1.5

      // Prueba de rendimiento de renderizado (simulado)
      const renderStart = performance.now()
      // Simular operación de renderizado
      const dummyArray = Array(10000)
        .fill(0)
        .map((_, i) => i)
      dummyArray.sort(() => Math.random() - 0.5)
      dummyArray.filter((x) => x % 2 === 0)
      dummyArray.map((x) => x * 2)
      results.tests.rendering.time = performance.now() - renderStart
      results.tests.rendering.success = results.tests.rendering.time < 100

      // Determinar estado general
      if (!results.tests.storage.success && !results.tests.compression.success) {
        results.status = "error"
      } else if (
        !results.tests.storage.success ||
        !results.tests.compression.success ||
        !results.tests.rendering.success
      ) {
        results.status = "warning"
      }

      return results
    } catch (error) {
      console.error("Error en prueba de rendimiento:", error)
      return {
        status: "error",
        error: error.message,
        tests: {},
      }
    }
  }

  /**
   * Limpia datos temporales y caché
   * @returns {Promise<boolean>} - true si se limpió correctamente
   */
  async cleanupStorage() {
    try {
      // Eliminar datos de diagnóstico
      const allItems = await getAllItems()
      const diagnosticKeys = Object.keys(allItems).filter((key) => key.startsWith(STORAGE_KEYS.DIAGNOSTIC_TEST))

      // Eliminar cada clave de diagnóstico
      for (const key of diagnosticKeys) {
        await setItem(key, null)
      }

      // Registrar en log de auditoría
      auditLogService.logEvent("storage_cleanup", {
        itemsRemoved: diagnosticKeys.length,
      })

      return true
    } catch (error) {
      console.error("Error al limpiar almacenamiento:", error)
      throw error
    }
  }

  /**
   * Optimiza el almacenamiento
   * @returns {Promise<Object>} - Resultados de la optimización
   */
  async optimizeStorage() {
    try {
      const results = {
        beforeSize: 0,
        afterSize: 0,
        savedBytes: 0,
        savedPercentage: 0,
      }

      // Medir tamaño antes
      const allData = await getAllItems()
      const beforeSizeStr = JSON.stringify(allData)
      results.beforeSize = new Blob([beforeSizeStr]).size

      // Buscar datos que puedan comprimirse
      const compressibleKeys = [STORAGE_KEYS.AUDIT_LOGS, STORAGE_KEYS.CLOCK_RECORDS]

      // Comprimir datos grandes
      for (const key of compressibleKeys) {
        const data = allData[key]
        if (data && typeof data === "string" && data.length > 1000) {
          // Verificar si ya está comprimido
          try {
            JSON.parse(data)
            // Si llega aquí, no está comprimido
            const compressed = await compressionService.compress(data)
            await setItem(`${key}_compressed`, compressed)
            await setItem(key, null) // Eliminar versión sin comprimir
          } catch (e) {
            // Probablemente ya está comprimido o no es JSON válido
            continue
          }
        }
      }

      // Medir tamaño después
      const afterData = await getAllItems()
      const afterSizeStr = JSON.stringify(afterData)
      results.afterSize = new Blob([afterSizeStr]).size

      // Calcular ahorro
      results.savedBytes = results.beforeSize - results.afterSize
      results.savedPercentage = (results.savedBytes / results.beforeSize) * 100

      // Registrar en log de auditoría
      auditLogService.logEvent("storage_optimized", {
        beforeSize: results.beforeSize,
        afterSize: results.afterSize,
        savedBytes: results.savedBytes,
        savedPercentage: results.savedPercentage,
      })

      return results
    } catch (error) {
      console.error("Error al optimizar almacenamiento:", error)
      throw error
    }
  }

  /**
   * Verifica la integridad de los datos
   * @returns {Promise<Object>} - Resultados de la verificación
   */
  async verifyDataIntegrity() {
    try {
      const results = {
        status: "success",
        issues: [],
        checks: {
          clockRecords: { status: "success", count: 0, issues: 0 },
          workers: { status: "success", count: 0, issues: 0 },
          positions: { status: "success", count: 0, issues: 0 },
          relationships: { status: "success", issues: 0 },
        },
      }

      // Obtener datos
      const clockRecordsStr = (await getItem(STORAGE_KEYS.CLOCK_RECORDS)) || "[]"
      const workersStr = (await getItem(STORAGE_KEYS.WORKERS)) || "[]"
      const positionsStr = (await getItem(STORAGE_KEYS.POSITIONS)) || "[]"

      let clockRecords, workers, positions

      // Verificar validez de JSON para registros de fichaje
      try {
        clockRecords = JSON.parse(clockRecordsStr)
        results.checks.clockRecords.count = clockRecords.length
      } catch (e) {
        results.checks.clockRecords.status = "error"
        results.checks.clockRecords.issues++
        results.issues.push("Los datos de registros de fichaje están corruptos")
      }

      // Verificar validez de JSON para trabajadores
      try {
        workers = JSON.parse(workersStr)
        results.checks.workers.count = workers.length
      } catch (e) {
        results.checks.workers.status = "error"
        results.checks.workers.issues++
        results.issues.push("Los datos de trabajadores están corruptos")
      }

      // Verificar validez de JSON para posiciones
      try {
        positions = JSON.parse(positionsStr)
        results.checks.positions.count = positions.length
      } catch (e) {
        results.checks.positions.status = "error"
        results.checks.positions.issues++
        results.issues.push("Los datos de posiciones están corruptos")
      }

      // Verificar integridad de relaciones si todos los datos son válidos
      if (clockRecords && workers && positions) {
        // Verificar que los trabajadores en registros existan
        const workerIds = new Set(workers.map((w) => w.id))

        for (const record of clockRecords) {
          if (record.workerId && !workerIds.has(record.workerId)) {
            results.checks.relationships.issues++
            results.issues.push(
              `Registro de fichaje ${record.id} referencia a un trabajador inexistente ${record.workerId}`,
            )
          }
        }

        // Verificar que las posiciones en trabajadores existan
        const positionIds = new Set(positions.map((p) => p.id))

        for (const worker of workers) {
          if (worker.positionId && !positionIds.has(worker.positionId)) {
            results.checks.relationships.issues++
            results.issues.push(`Trabajador ${worker.id} referencia a una posición inexistente ${worker.positionId}`)
          }
        }

        // Actualizar estado de relaciones
        if (results.checks.relationships.issues > 0) {
          results.checks.relationships.status = "warning"
        }
      }

      // Determinar estado general
      if (
        results.checks.clockRecords.status === "error" ||
        results.checks.workers.status === "error" ||
        results.checks.positions.status === "error"
      ) {
        results.status = "error"
      } else if (results.checks.relationships.status === "warning") {
        results.status = "warning"
      }

      return results
    } catch (error) {
      console.error("Error al verificar integridad de datos:", error)
      return {
        status: "error",
        error: error.message,
        issues: ["Error al verificar integridad: " + error.message],
        checks: {},
      }
    }
  }

  /**
   * Exporta logs de diagnóstico
   * @returns {Promise<Blob>} - Blob con los logs
   */
  async exportDiagnosticLogs() {
    try {
      // Recopilar información de diagnóstico
      const [storageUsage, recordsCount, connectionStatus, queueStatus, backups, integrityCheck] = await Promise.all([
        this.getStorageUsage(),
        this.getRecordsCount(),
        connectionMonitorService.getConnectionStatus(),
        syncQueueService.getQueueStatus(),
        offlineBackupService.getBackupsList(),
        this.verifyDataIntegrity(),
      ])

      // Obtener logs de auditoría
      const auditLogsStr = (await getItem(STORAGE_KEYS.AUDIT_LOGS)) || "[]"
      let auditLogs = []
      try {
        auditLogs = JSON.parse(auditLogsStr)
      } catch (e) {
        console.error("Error al parsear logs de auditoría:", e)
      }

      // Crear objeto de diagnóstico
      const diagnosticData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        storageUsage,
        recordsCount,
        connectionStatus,
        queueStatus,
        backups: {
          count: backups.length,
          lastBackup: backups.length > 0 ? backups.sort((a, b) => b.timestamp - a.timestamp)[0] : null,
        },
        integrityCheck,
        auditLogs: auditLogs.slice(-100), // Últimos 100 logs
      }

      // Convertir a JSON
      const jsonString = JSON.stringify(diagnosticData, null, 2)

      // Crear blob
      const blob = new Blob([jsonString], { type: "application/json" })

      // Registrar en log de auditoría
      auditLogService.logEvent("diagnostic_logs_exported", {
        timestamp: diagnosticData.timestamp,
      })

      return blob
    } catch (error) {
      console.error("Error al exportar logs de diagnóstico:", error)
      throw error
    }
  }
}

export const diagnosticService = new DiagnosticService()
export default diagnosticService
