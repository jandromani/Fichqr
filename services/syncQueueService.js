/**
 * Sistema avanzado de cola de sincronización con priorización y reintentos
 */
import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getItem, setItem } from "./storageService"
import { compressionService } from "./compressionService"

// Constantes para la configuración de reintentos
const MAX_RETRIES = 5
const BASE_RETRY_DELAY = 2000 // 2 segundos
const MAX_RETRY_DELAY = 60000 // 1 minuto

// Niveles de prioridad para las operaciones
export const PRIORITY = {
  CRITICAL: 0, // Operaciones críticas (ej. fichajes)
  HIGH: 1, // Operaciones importantes (ej. modificaciones de trabajadores)
  MEDIUM: 2, // Operaciones regulares (ej. cambios en posiciones)
  LOW: 3, // Operaciones no urgentes (ej. actualizaciones de configuración)
  BACKGROUND: 4, // Operaciones en segundo plano (ej. estadísticas)
}

// Estado de la sincronización
export const SYNC_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRY: "retry",
}

class SyncQueueService {
  constructor() {
    this.queue = []
    this.isProcessing = false
    this.listeners = []
    this.loadQueue()

    // Intervalo para guardar la cola periódicamente
    this.saveInterval = setInterval(() => this.saveQueue(), 30000)
  }

  /**
   * Carga la cola desde el almacenamiento local
   */
  async loadQueue() {
    try {
      const savedQueue = await getItem(STORAGE_KEYS.SYNC_QUEUE)
      if (savedQueue) {
        const decompressedQueue = await compressionService.decompress(savedQueue)
        this.queue = JSON.parse(decompressedQueue)
        this.notifyListeners()
      }
    } catch (error) {
      console.error("Error al cargar la cola de sincronización:", error)
      this.queue = []
    }
  }

  /**
   * Guarda la cola en el almacenamiento local
   */
  async saveQueue() {
    try {
      const queueString = JSON.stringify(this.queue)
      const compressedQueue = await compressionService.compress(queueString)
      await setItem(STORAGE_KEYS.SYNC_QUEUE, compressedQueue)
    } catch (error) {
      console.error("Error al guardar la cola de sincronización:", error)
    }
  }

  /**
   * Añade una operación a la cola de sincronización
   * @param {Object} operation - Operación a añadir
   * @param {Function} operation.execute - Función que ejecuta la operación
   * @param {number} priority - Prioridad de la operación (usar PRIORITY)
   * @param {Object} metadata - Metadatos adicionales de la operación
   * @returns {string} ID de la operación
   */
  addToQueue(operation, priority = PRIORITY.MEDIUM, metadata = {}) {
    const id = uuidv4()
    const queueItem = {
      id,
      operation,
      priority,
      status: SYNC_STATUS.PENDING,
      retries: 0,
      nextRetry: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    }

    this.queue.push(queueItem)

    // Ordenar la cola por prioridad
    this.sortQueue()

    // Guardar la cola actualizada
    this.saveQueue()

    // Notificar a los listeners
    this.notifyListeners()

    // Intentar procesar la cola si no está en proceso
    if (!this.isProcessing) {
      this.processQueue()
    }

    return id
  }

  /**
   * Ordena la cola según prioridad y tiempo de creación
   */
  sortQueue() {
    this.queue.sort((a, b) => {
      // Primero por prioridad
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }

      // Luego por estado (los reintentos después de los pendientes)
      if (a.status !== b.status) {
        if (a.status === SYNC_STATUS.RETRY) return 1
        if (b.status === SYNC_STATUS.RETRY) return -1
      }

      // Finalmente por tiempo de creación
      return new Date(a.createdAt) - new Date(b.createdAt)
    })
  }

  /**
   * Procesa la cola de sincronización
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true
    this.notifyListeners()

    try {
      // Filtrar operaciones pendientes y ordenadas por prioridad
      const pendingOperations = this.queue.filter(
        (item) =>
          item.status === SYNC_STATUS.PENDING || (item.status === SYNC_STATUS.RETRY && item.nextRetry <= Date.now()),
      )

      if (pendingOperations.length === 0) {
        this.isProcessing = false
        this.notifyListeners()
        return
      }

      // Tomar la primera operación
      const currentItem = pendingOperations[0]
      currentItem.status = SYNC_STATUS.IN_PROGRESS
      currentItem.updatedAt = new Date().toISOString()

      this.notifyListeners()

      try {
        // Ejecutar la operación
        await currentItem.operation.execute()

        // Marcar como completada
        currentItem.status = SYNC_STATUS.COMPLETED
        currentItem.updatedAt = new Date().toISOString()

        // Eliminar de la cola si se completó correctamente
        this.queue = this.queue.filter((item) => item.id !== currentItem.id)
      } catch (error) {
        console.error(`Error al procesar operación ${currentItem.id}:`, error)

        // Gestionar reintentos
        if (currentItem.retries < MAX_RETRIES) {
          currentItem.retries += 1
          currentItem.status = SYNC_STATUS.RETRY

          // Cálculo de retraso exponencial con jitter
          const exponentialDelay = Math.min(BASE_RETRY_DELAY * Math.pow(2, currentItem.retries - 1), MAX_RETRY_DELAY)

          // Añadir jitter (±20%)
          const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1)
          const delay = Math.floor(exponentialDelay + jitter)

          currentItem.nextRetry = Date.now() + delay
          currentItem.updatedAt = new Date().toISOString()
          currentItem.lastError = error.message || "Error desconocido"
        } else {
          // Marcar como fallida después de agotar reintentos
          currentItem.status = SYNC_STATUS.FAILED
          currentItem.updatedAt = new Date().toISOString()
          currentItem.lastError = error.message || "Error desconocido"
        }
      }

      // Guardar la cola actualizada
      this.saveQueue()
      this.notifyListeners()

      // Continuar procesando la cola
      this.isProcessing = false
      this.processQueue()
    } catch (error) {
      console.error("Error al procesar la cola de sincronización:", error)
      this.isProcessing = false
      this.notifyListeners()
    }
  }

  /**
   * Obtiene el estado actual de la cola
   * @returns {Object} Estado de la cola
   */
  getQueueStatus() {
    const total = this.queue.length
    const pending = this.queue.filter((item) => item.status === SYNC_STATUS.PENDING).length
    const inProgress = this.queue.filter((item) => item.status === SYNC_STATUS.IN_PROGRESS).length
    const retry = this.queue.filter((item) => item.status === SYNC_STATUS.RETRY).length
    const failed = this.queue.filter((item) => item.status === SYNC_STATUS.FAILED).length

    return {
      total,
      pending,
      inProgress,
      retry,
      failed,
      isProcessing: this.isProcessing,
    }
  }

  /**
   * Reintentar operaciones fallidas
   */
  retryFailedOperations() {
    const failedItems = this.queue.filter((item) => item.status === SYNC_STATUS.FAILED)

    failedItems.forEach((item) => {
      item.status = SYNC_STATUS.PENDING
      item.retries = 0
      item.nextRetry = null
      item.updatedAt = new Date().toISOString()
    })

    this.saveQueue()
    this.notifyListeners()

    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  /**
   * Limpia operaciones completadas y fallidas
   */
  cleanupQueue() {
    this.queue = this.queue.filter(
      (item) => item.status !== SYNC_STATUS.COMPLETED && item.status !== SYNC_STATUS.FAILED,
    )

    this.saveQueue()
    this.notifyListeners()
  }

  /**
   * Añade un listener para cambios en la cola
   * @param {Function} listener - Función a llamar cuando cambia la cola
   */
  addListener(listener) {
    this.listeners.push(listener)
  }

  /**
   * Elimina un listener
   * @param {Function} listener - Listener a eliminar
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  /**
   * Notifica a todos los listeners
   */
  notifyListeners() {
    const status = this.getQueueStatus()
    const items = this.getQueueItems()
    this.listeners.forEach((listener) => {
      try {
        listener(status, items)
      } catch (error) {
        console.error("Error en listener de cola de sincronización:", error)
      }
    })
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  destroy() {
    clearInterval(this.saveInterval)
  }

  /**
   * Obtiene los elementos de la cola
   * @returns {Array} Elementos de la cola
   */
  getQueueItems() {
    return [...this.queue]
  }

  /**
   * Procesa un elemento específico de la cola
   * @param {string} itemId - ID del elemento a procesar
   */
  async processQueueItem(itemId) {
    const item = this.queue.find((i) => i.id === itemId)
    if (!item) {
      throw new Error(`No se encontró el elemento con ID ${itemId}`)
    }

    // Marcar como en progreso
    item.status = SYNC_STATUS.IN_PROGRESS
    item.updatedAt = new Date().toISOString()
    this.notifyListeners()

    try {
      // Ejecutar la operación
      await item.operation.execute()

      // Marcar como completada
      item.status = SYNC_STATUS.COMPLETED
      item.updatedAt = new Date().toISOString()

      // Eliminar de la cola si se completó correctamente
      this.queue = this.queue.filter((i) => i.id !== itemId)
      this.saveQueue()
      this.notifyListeners()
    } catch (error) {
      console.error(`Error al procesar operación ${itemId}:`, error)

      // Gestionar reintentos
      if (item.retries < MAX_RETRIES) {
        item.retries += 1
        item.status = SYNC_STATUS.RETRY

        // Cálculo de retraso exponencial con jitter
        const exponentialDelay = Math.min(BASE_RETRY_DELAY * Math.pow(2, item.retries - 1), MAX_RETRY_DELAY)

        // Añadir jitter (±20%)
        const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1)
        const delay = Math.floor(exponentialDelay + jitter)

        item.nextRetry = Date.now() + delay
        item.updatedAt = new Date().toISOString()
        item.lastError = error.message || "Error desconocido"
      } else {
        // Marcar como fallida después de agotar reintentos
        item.status = SYNC_STATUS.FAILED
        item.updatedAt = new Date().toISOString()
        item.lastError = error.message || "Error desconocido"
      }

      this.saveQueue()
      this.notifyListeners()
      throw error
    }
  }

  /**
   * Elimina un elemento de la cola
   * @param {string} itemId - ID del elemento a eliminar
   */
  removeQueueItem(itemId) {
    this.queue = this.queue.filter((item) => item.id !== itemId)
    this.saveQueue()
    this.notifyListeners()
  }

  /**
   * Vacía la cola de sincronización
   */
  clearQueue() {
    this.queue = []
    this.saveQueue()
    this.notifyListeners()
  }

  /**
   * Método para suscribirse a cambios en la cola
   * @param {Function} callback - Función a llamar cuando cambia la cola
   * @returns {Object} Objeto con método para cancelar la suscripción
   */
  onQueueChange(callback) {
    this.addListener(callback)
    return {
      unsubscribe: () => this.removeListener(callback),
    }
  }
}

export const syncQueueService = new SyncQueueService()
export default syncQueueService
