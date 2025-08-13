"use client"

/**
 * Servicio unificado para gestionar el estado de la conexión y la sincronización de datos offline
 * Integra toda la funcionalidad relacionada con la conectividad y el modo offline
 */

import { useState, useEffect } from "react"
import { storageService } from "./index"

// Clave para almacenar los fichajes offline en localStorage
const OFFLINE_CLOCK_RECORDS_KEY = "offlineClockRecords"
const OFFLINE_QUEUE_KEY = "offlineOperationsQueue"
const CONNECTION_STATUS_KEY = "connectionStatus"

// Evento personalizado para notificar cambios en el estado de la conexión
export const CONNECTION_CHANGE_EVENT = "connectionStatusChange"

/**
 * Verifica si el navegador está online
 * @returns {boolean} - true si está online
 */
export const isOnline = () => {
  return navigator.onLine
}

/**
 * Guarda el estado de conexión en localStorage
 * @param {boolean} status - Estado de conexión (true = online, false = offline)
 */
export const saveConnectionStatus = (status) => {
  try {
    localStorage.setItem(
      CONNECTION_STATUS_KEY,
      JSON.stringify({
        online: status,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error("Error al guardar estado de conexión:", error)
  }
}

/**
 * Obtiene el estado de conexión guardado
 * @returns {Object} - Estado de conexión guardado
 */
export const getConnectionStatus = () => {
  try {
    const status = localStorage.getItem(CONNECTION_STATUS_KEY)
    return status ? JSON.parse(status) : { online: navigator.onLine, timestamp: Date.now() }
  } catch (error) {
    console.error("Error al obtener estado de conexión:", error)
    return { online: navigator.onLine, timestamp: Date.now() }
  }
}

/**
 * Obtiene todos los fichajes offline pendientes de sincronización
 * @returns {Array} - Array de fichajes offline
 */
export const getOfflineClockRecords = () => {
  try {
    const offlineData = localStorage.getItem(OFFLINE_CLOCK_RECORDS_KEY)
    return offlineData ? JSON.parse(offlineData) : []
  } catch (error) {
    console.error("Error al obtener fichajes offline:", error)
    return []
  }
}

/**
 * Guarda un fichaje en modo offline
 * @param {Object} clockRecord - Registro de fichaje
 * @returns {boolean} - true si se guardó correctamente
 */
export const saveOfflineClockRecord = (clockRecord) => {
  try {
    // Añadir metadatos de offline
    const offlineRecord = {
      ...clockRecord,
      offlineCreatedAt: new Date().toISOString(),
      synced: false,
    }

    // Obtener los fichajes offline existentes
    const offlineRecords = getOfflineClockRecords()

    // Añadir el nuevo fichaje
    offlineRecords.push(offlineRecord)

    // Guardar en localStorage
    localStorage.setItem(OFFLINE_CLOCK_RECORDS_KEY, JSON.stringify(offlineRecords))

    // Añadir a la cola de operaciones offline
    addToOfflineQueue({
      type: "clockRecord",
      operation: "add",
      data: offlineRecord,
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error("Error al guardar fichaje offline:", error)
    return false
  }
}

/**
 * Marca un fichaje offline como sincronizado
 * @param {string} recordId - ID del fichaje
 * @returns {boolean} - true si se actualizó correctamente
 */
export const markOfflineRecordAsSynced = (recordId) => {
  try {
    const offlineRecords = getOfflineClockRecords()
    const index = offlineRecords.findIndex((record) => record.id === recordId)

    if (index === -1) {
      return false
    }

    // Marcar como sincronizado
    offlineRecords[index].synced = true
    offlineRecords[index].syncedAt = new Date().toISOString()

    // Guardar en localStorage
    localStorage.setItem(OFFLINE_CLOCK_RECORDS_KEY, JSON.stringify(offlineRecords))

    return true
  } catch (error) {
    console.error("Error al marcar fichaje como sincronizado:", error)
    return false
  }
}

/**
 * Elimina los fichajes offline que ya han sido sincronizados
 * @returns {number} - Número de fichajes eliminados
 */
export const cleanSyncedOfflineRecords = () => {
  try {
    const offlineRecords = getOfflineClockRecords()
    const initialCount = offlineRecords.length

    // Filtrar solo los no sincronizados
    const pendingRecords = offlineRecords.filter((record) => !record.synced)

    // Guardar en localStorage
    localStorage.setItem(OFFLINE_CLOCK_RECORDS_KEY, JSON.stringify(pendingRecords))

    return initialCount - pendingRecords.length
  } catch (error) {
    console.error("Error al limpiar fichajes sincronizados:", error)
    return 0
  }
}

/**
 * Obtiene la cola de operaciones offline
 * @returns {Array} - Cola de operaciones
 */
export const getOfflineQueue = () => {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return queue ? JSON.parse(queue) : []
  } catch (error) {
    console.error("Error al obtener cola offline:", error)
    return []
  }
}

/**
 * Añade una operación a la cola offline
 * @param {Object} operation - Operación a añadir
 * @returns {boolean} - true si se añadió correctamente
 */
export const addToOfflineQueue = (operation) => {
  try {
    const queue = getOfflineQueue()
    queue.push({
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processed: false,
    })
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    return true
  } catch (error) {
    console.error("Error al añadir a cola offline:", error)
    return false
  }
}

/**
 * Marca una operación como procesada
 * @param {string} operationId - ID de la operación
 * @returns {boolean} - true si se actualizó correctamente
 */
export const markOperationAsProcessed = (operationId) => {
  try {
    const queue = getOfflineQueue()
    const index = queue.findIndex((op) => op.id === operationId)

    if (index === -1) return false

    queue[index].processed = true
    queue[index].processedAt = Date.now()

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    return true
  } catch (error) {
    console.error("Error al marcar operación como procesada:", error)
    return false
  }
}

/**
 * Limpia las operaciones procesadas de la cola
 * @returns {number} - Número de operaciones eliminadas
 */
export const cleanProcessedOperations = () => {
  try {
    const queue = getOfflineQueue()
    const initialCount = queue.length

    const pendingQueue = queue.filter((op) => !op.processed)

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pendingQueue))
    return initialCount - pendingQueue.length
  } catch (error) {
    console.error("Error al limpiar operaciones procesadas:", error)
    return 0
  }
}

/**
 * Sincroniza todos los fichajes offline pendientes
 * @param {Function} syncFunction - Función para sincronizar un fichaje individual
 * @returns {Object} - Resultado de la sincronización
 */
export const syncOfflineRecords = async (syncFunction) => {
  if (!isOnline()) {
    return {
      success: false,
      message: "No hay conexión a internet",
      syncedCount: 0,
      pendingCount: getOfflineClockRecords().filter((r) => !r.synced).length,
    }
  }

  try {
    const offlineRecords = getOfflineClockRecords()
    const pendingRecords = offlineRecords.filter((record) => !record.synced)

    if (pendingRecords.length === 0) {
      return {
        success: true,
        message: "No hay fichajes pendientes de sincronización",
        syncedCount: 0,
        pendingCount: 0,
      }
    }

    let syncedCount = 0
    const errors = []

    // Sincronizar cada fichaje pendiente
    for (const record of pendingRecords) {
      try {
        // Llamar a la función de sincronización proporcionada
        const result = await syncFunction(record)

        if (result.success) {
          // Marcar como sincronizado
          markOfflineRecordAsSynced(record.id)
          syncedCount++
        } else {
          errors.push({
            recordId: record.id,
            error: result.error || "Error desconocido",
          })
        }
      } catch (error) {
        errors.push({
          recordId: record.id,
          error: error.message || "Error desconocido",
        })
      }
    }

    // Limpiar los registros sincronizados
    if (syncedCount > 0) {
      cleanSyncedOfflineRecords()
    }

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? `${syncedCount} fichajes sincronizados correctamente`
          : `${syncedCount} fichajes sincronizados, ${errors.length} con errores`,
      syncedCount,
      errorCount: errors.length,
      errors,
      pendingCount: getOfflineClockRecords().filter((r) => !r.synced).length,
    }
  } catch (error) {
    console.error("Error al sincronizar fichajes offline:", error)
    return {
      success: false,
      message: "Error al sincronizar fichajes offline",
      error: error.message,
      syncedCount: 0,
      pendingCount: getOfflineClockRecords().filter((r) => !r.synced).length,
    }
  }
}

/**
 * Procesa la cola de operaciones offline
 * @returns {Object} - Resultado del procesamiento
 */
export const processOfflineQueue = async () => {
  if (!isOnline()) {
    return {
      success: false,
      message: "No hay conexión a internet",
      processedCount: 0,
      pendingCount: getOfflineQueue().filter((op) => !op.processed).length,
    }
  }

  try {
    const queue = getOfflineQueue()
    const pendingOperations = queue.filter((op) => !op.processed)

    if (pendingOperations.length === 0) {
      return {
        success: true,
        message: "No hay operaciones pendientes",
        processedCount: 0,
        pendingCount: 0,
      }
    }

    let processedCount = 0
    const errors = []

    // Procesar cada operación pendiente
    for (const operation of pendingOperations) {
      try {
        let success = false

        // Procesar según el tipo de operación
        switch (operation.type) {
          case "clockRecord":
            if (operation.operation === "add") {
              // Añadir el registro a localStorage
              storageService.clockRecordService.add(operation.data)
              success = true
            }
            break

          // Añadir más casos según sea necesario
        }

        if (success) {
          markOperationAsProcessed(operation.id)
          processedCount++
        } else {
          errors.push({
            operationId: operation.id,
            error: "No se pudo procesar la operación",
          })
        }
      } catch (error) {
        errors.push({
          operationId: operation.id,
          error: error.message || "Error desconocido",
        })
      }
    }

    // Limpiar operaciones procesadas
    if (processedCount > 0) {
      cleanProcessedOperations()
    }

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? `${processedCount} operaciones procesadas correctamente`
          : `${processedCount} operaciones procesadas, ${errors.length} con errores`,
      processedCount,
      errorCount: errors.length,
      errors,
      pendingCount: getOfflineQueue().filter((op) => !op.processed).length,
    }
  } catch (error) {
    console.error("Error al procesar cola offline:", error)
    return {
      success: false,
      message: "Error al procesar cola offline",
      error: error.message,
      processedCount: 0,
      pendingCount: getOfflineQueue().filter((op) => !op.processed).length,
    }
  }
}

/**
 * Configura los listeners para detectar cambios en la conexión
 */
export const setupConnectionListeners = () => {
  // Evento cuando se recupera la conexión
  window.addEventListener("online", () => {
    console.log("Conexión recuperada")
    saveConnectionStatus(true)
    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent(CONNECTION_CHANGE_EVENT, { detail: { online: true } }))

    // Intentar procesar la cola de operaciones offline automáticamente
    processOfflineQueue().then((result) => {
      console.log("Resultado de sincronización automática:", result)
    })
  })

  // Evento cuando se pierde la conexión
  window.addEventListener("offline", () => {
    console.log("Conexión perdida")
    saveConnectionStatus(false)
    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent(CONNECTION_CHANGE_EVENT, { detail: { online: false } }))
  })
}

/**
 * Inicializa el servicio de conexión
 */
export const initConnectionService = () => {
  setupConnectionListeners()

  // Verificar si hay fichajes pendientes de sincronización al iniciar
  const pendingCount = getOfflineClockRecords().filter((r) => !r.synced).length
  if (pendingCount > 0) {
    console.log(`Hay ${pendingCount} fichajes pendientes de sincronización`)
  }

  // Verificar si hay operaciones pendientes en la cola
  const pendingOperations = getOfflineQueue().filter((op) => !op.processed).length
  if (pendingOperations > 0) {
    console.log(`Hay ${pendingOperations} operaciones pendientes en la cola`)
  }

  // Guardar estado inicial de conexión
  saveConnectionStatus(navigator.onLine)
}

/**
 * Hook para usar el estado de conexión en componentes React
 * @returns {Object} - Estado de conexión y funciones relacionadas
 */
export const useConnection = () => {
  const [isConnected, setIsConnected] = useState(isOnline())
  const [pendingRecords, setPendingRecords] = useState([])
  const [pendingOperations, setPendingOperations] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Actualizar estado inicial
    setIsConnected(isOnline())
    setPendingRecords(getOfflineClockRecords().filter((r) => !r.synced))
    setPendingOperations(getOfflineQueue().filter((op) => !op.processed))

    // Configurar listeners
    const handleConnectionChange = (event) => {
      setIsConnected(event.detail.online)
    }

    window.addEventListener(CONNECTION_CHANGE_EVENT, handleConnectionChange)

    // Limpiar listeners al desmontar
    return () => {
      window.removeEventListener(CONNECTION_CHANGE_EVENT, handleConnectionChange)
    }
  }, [])

  // Función para sincronizar manualmente
  const syncManually = async (syncFunction) => {
    if (!isConnected) {
      return {
        success: false,
        message: "No hay conexión a internet",
      }
    }

    setIsSyncing(true)

    try {
      // Sincronizar fichajes
      const recordsResult = await syncOfflineRecords(syncFunction)

      // Procesar cola de operaciones
      const queueResult = await processOfflineQueue()

      // Actualizar estados
      setPendingRecords(getOfflineClockRecords().filter((r) => !r.synced))
      setPendingOperations(getOfflineQueue().filter((op) => !op.processed))

      return {
        success: recordsResult.success && queueResult.success,
        message: `Fichajes: ${recordsResult.message}. Operaciones: ${queueResult.message}`,
        recordsResult,
        queueResult,
      }
    } catch (error) {
      console.error("Error en sincronización manual:", error)
      return {
        success: false,
        message: "Error en sincronización manual: " + error.message,
      }
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    isConnected,
    pendingRecords,
    pendingCount: pendingRecords.length,
    pendingOperations,
    pendingOperationsCount: pendingOperations.length,
    isSyncing,
    refreshPendingRecords: () => setPendingRecords(getOfflineClockRecords().filter((r) => !r.synced)),
    refreshPendingOperations: () => setPendingOperations(getOfflineQueue().filter((op) => !op.processed)),
    saveOfflineRecord: saveOfflineClockRecord,
    addToOfflineQueue,
    syncManually,
    syncRecords: syncOfflineRecords,
    processQueue: processOfflineQueue,
  }
}

// Exportar como objeto para facilitar importaciones
export const connectionService = {
  isOnline,
  getOfflineClockRecords,
  saveOfflineClockRecord,
  markOfflineRecordAsSynced,
  cleanSyncedOfflineRecords,
  syncOfflineRecords,
  getOfflineQueue,
  addToOfflineQueue,
  markOperationAsProcessed,
  cleanProcessedOperations,
  processOfflineQueue,
  setupConnectionListeners,
  initConnectionService,
  useConnection,
  getConnectionStatus,
  saveConnectionStatus,
}
