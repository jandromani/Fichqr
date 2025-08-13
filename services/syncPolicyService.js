/**
 * Servicio para gestionar políticas de sincronización
 * Define reglas para sincronizar diferentes tipos de datos
 */
import { PRIORITY } from "./syncQueueService"
import { connectionMonitorService } from "./connectionMonitorService"
import { getItem, setItem } from "./storageService"
import { STORAGE_KEYS } from "./storage/constants"

// Tipos de datos para sincronización
export const DATA_TYPES = {
  CLOCK_RECORD: "clockRecord",
  WORKER: "worker",
  POSITION: "position",
  ABSENCE_REQUEST: "absenceRequest",
  USER_SETTINGS: "userSettings",
  AUDIT_LOG: "auditLog",
}

// Estrategias de sincronización
export const SYNC_STRATEGIES = {
  IMMEDIATE: "immediate", // Sincronizar inmediatamente si hay conexión
  BATCH: "batch", // Sincronizar en lotes
  SCHEDULED: "scheduled", // Sincronizar en momentos programados
  MANUAL: "manual", // Sincronización manual
}

// Configuración por defecto para cada tipo de dato
const DEFAULT_POLICIES = {
  [DATA_TYPES.CLOCK_RECORD]: {
    priority: PRIORITY.CRITICAL,
    strategy: SYNC_STRATEGIES.IMMEDIATE,
    retryOnFailure: true,
    batchSize: 10,
    requireStableConnection: false,
  },
  [DATA_TYPES.WORKER]: {
    priority: PRIORITY.HIGH,
    strategy: SYNC_STRATEGIES.IMMEDIATE,
    retryOnFailure: true,
    batchSize: 5,
    requireStableConnection: false,
  },
  [DATA_TYPES.POSITION]: {
    priority: PRIORITY.MEDIUM,
    strategy: SYNC_STRATEGIES.BATCH,
    retryOnFailure: true,
    batchSize: 10,
    requireStableConnection: false,
  },
  [DATA_TYPES.ABSENCE_REQUEST]: {
    priority: PRIORITY.HIGH,
    strategy: SYNC_STRATEGIES.IMMEDIATE,
    retryOnFailure: true,
    batchSize: 5,
    requireStableConnection: false,
  },
  [DATA_TYPES.USER_SETTINGS]: {
    priority: PRIORITY.LOW,
    strategy: SYNC_STRATEGIES.BATCH,
    retryOnFailure: true,
    batchSize: 1,
    requireStableConnection: false,
  },
  [DATA_TYPES.AUDIT_LOG]: {
    priority: PRIORITY.BACKGROUND,
    strategy: SYNC_STRATEGIES.BATCH,
    retryOnFailure: true,
    batchSize: 20,
    requireStableConnection: true,
  },
}

class SyncPolicyService {
  constructor() {
    this.policies = { ...DEFAULT_POLICIES }
    this.loadPolicies()
  }

  /**
   * Carga las políticas guardadas
   */
  async loadPolicies() {
    try {
      const savedPolicies = await getItem(STORAGE_KEYS.SYNC_POLICIES)
      if (savedPolicies) {
        this.policies = { ...DEFAULT_POLICIES, ...JSON.parse(savedPolicies) }
      }
    } catch (error) {
      console.error("Error al cargar políticas de sincronización:", error)
    }
  }

  /**
   * Guarda las políticas actuales
   */
  async savePolicies() {
    try {
      await setItem(STORAGE_KEYS.SYNC_POLICIES, JSON.stringify(this.policies))
    } catch (error) {
      console.error("Error al guardar políticas de sincronización:", error)
    }
  }

  /**
   * Obtiene la política para un tipo de dato
   * @param {string} dataType - Tipo de dato (DATA_TYPES)
   * @returns {Object} - Política de sincronización
   */
  getPolicy(dataType) {
    return this.policies[dataType] || DEFAULT_POLICIES[dataType] || null
  }

  /**
   * Actualiza la política para un tipo de dato
   * @param {string} dataType - Tipo de dato (DATA_TYPES)
   * @param {Object} policy - Nueva política
   */
  async updatePolicy(dataType, policy) {
    if (!DATA_TYPES[dataType]) {
      throw new Error(`Tipo de dato no válido: ${dataType}`)
    }

    this.policies[dataType] = {
      ...this.policies[dataType],
      ...policy,
    }

    await this.savePolicies()
  }

  /**
   * Restaura la política por defecto para un tipo de dato
   * @param {string} dataType - Tipo de dato (DATA_TYPES)
   */
  async resetPolicy(dataType) {
    if (!DATA_TYPES[dataType]) {
      throw new Error(`Tipo de dato no válido: ${dataType}`)
    }

    this.policies[dataType] = { ...DEFAULT_POLICIES[dataType] }
    await this.savePolicies()
  }

  /**
   * Restaura todas las políticas a sus valores por defecto
   */
  async resetAllPolicies() {
    this.policies = { ...DEFAULT_POLICIES }
    await this.savePolicies()
  }

  /**
   * Determina si un tipo de dato debe sincronizarse según su política
   * @param {string} dataType - Tipo de dato (DATA_TYPES)
   * @returns {boolean} - true si debe sincronizarse
   */
  shouldSync(dataType) {
    const policy = this.getPolicy(dataType)
    if (!policy) return false

    // Verificar conexión
    const connectionStatus = connectionMonitorService.getConnectionStatus()
    const isOnline = connectionStatus.status === connectionMonitorService.CONNECTION_STATUS.ONLINE

    // Si requiere conexión estable, verificar
    if (policy.requireStableConnection) {
      const isStable =
        connectionStatus.status !== connectionMonitorService.CONNECTION_STATUS.UNSTABLE &&
        connectionStatus.status !== connectionMonitorService.CONNECTION_STATUS.LIMITED
      if (!isStable) return false
    }

    // Verificar estrategia
    switch (policy.strategy) {
      case SYNC_STRATEGIES.IMMEDIATE:
        return isOnline
      case SYNC_STRATEGIES.BATCH:
        // La decisión de sincronizar en lote se toma en otro lugar
        return isOnline
      case SYNC_STRATEGIES.SCHEDULED:
        // La decisión de sincronizar programada se toma en otro lugar
        return isOnline
      case SYNC_STRATEGIES.MANUAL:
        // La sincronización manual siempre devuelve false aquí
        return false
      default:
        return isOnline
    }
  }

  /**
   * Obtiene la prioridad para un tipo de dato
   * @param {string} dataType - Tipo de dato (DATA_TYPES)
   * @returns {number} - Prioridad (PRIORITY)
   */
  getPriority(dataType) {
    const policy = this.getPolicy(dataType)
    return policy ? policy.priority : PRIORITY.MEDIUM
  }

  /**
   * Obtiene el tamaño de lote para un tipo de dato
   * @param {string} dataType - Tipo de dato (DATA_TYPES)
   * @returns {number} - Tamaño de lote
   */
  getBatchSize(dataType) {
    const policy = this.getPolicy(dataType)
    return policy ? policy.batchSize : 1
  }

  /**
   * Obtiene todas las políticas
   * @returns {Object} - Todas las políticas
   */
  getAllPolicies() {
    return { ...this.policies }
  }
}

export const syncPolicyService = new SyncPolicyService()
export default syncPolicyService
