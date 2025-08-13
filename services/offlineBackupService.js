/**
 * Servicio para gestión de respaldos offline
 * Permite crear, restaurar y gestionar respaldos locales
 */
import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getAllItems, setItem, getItem } from "./storageService"
import { compressionService } from "./compressionService"
import { auditLogService } from "./auditLogService"
import { diagnosticService } from "./diagnosticService"

// Tipos de respaldo
export const BACKUP_TYPES = {
  FULL: "full", // Respaldo completo
  PARTIAL: "partial", // Respaldo parcial (solo ciertos datos)
  AUTO: "auto", // Respaldo automático
  MANUAL: "manual", // Respaldo manual
}

class OfflineBackupService {
  constructor() {
    this.backups = []
    this.autoBackupInterval = null
    this.autoBackupEnabled = true
    this.autoBackupFrequency = 24 * 60 * 60 * 1000 // 24 horas por defecto
    this.maxAutoBackups = 5 // Número máximo de respaldos automáticos
    this.initialized = false
    this.initialize()
  }

  /**
   * Inicializa el servicio
   */
  async initialize() {
    if (this.initialized) return

    try {
      // Cargar configuración
      const config = await getItem(STORAGE_KEYS.BACKUP_CONFIG)
      if (config) {
        const parsedConfig = JSON.parse(config)
        this.autoBackupEnabled = parsedConfig.autoBackupEnabled ?? true
        this.autoBackupFrequency = parsedConfig.autoBackupFrequency ?? 24 * 60 * 60 * 1000
        this.maxAutoBackups = parsedConfig.maxAutoBackups ?? 5
      }

      // Cargar lista de respaldos
      const backupsList = await getItem(STORAGE_KEYS.BACKUPS_LIST)
      if (backupsList) {
        this.backups = JSON.parse(backupsList)
      }

      // Configurar respaldo automático
      if (this.autoBackupEnabled) {
        this.setupAutoBackup()
      }

      this.initialized = true
    } catch (error) {
      console.error("Error al inicializar servicio de respaldo:", error)
    }
  }

  /**
   * Guarda la configuración actual
   */
  async saveConfig() {
    try {
      const config = {
        autoBackupEnabled: this.autoBackupEnabled,
        autoBackupFrequency: this.autoBackupFrequency,
        maxAutoBackups: this.maxAutoBackups,
      }
      await setItem(STORAGE_KEYS.BACKUP_CONFIG, JSON.stringify(config))
    } catch (error) {
      console.error("Error al guardar configuración de respaldo:", error)
    }
  }

  /**
   * Guarda la lista de respaldos
   */
  async saveBackupsList() {
    try {
      await setItem(STORAGE_KEYS.BACKUPS_LIST, JSON.stringify(this.backups))
    } catch (error) {
      console.error("Error al guardar lista de respaldos:", error)
    }
  }

  /**
   * Configura el respaldo automático
   */
  setupAutoBackup() {
    // Limpiar intervalo existente
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval)
    }

    // Configurar nuevo intervalo
    if (this.autoBackupEnabled) {
      this.autoBackupInterval = setInterval(() => {
        this.createAutoBackup()
      }, this.autoBackupFrequency)

      // Verificar si es necesario crear un respaldo ahora
      this.checkIfBackupNeeded()
    }
  }

  /**
   * Verifica si es necesario crear un respaldo automático
   */
  async checkIfBackupNeeded() {
    try {
      // Filtrar respaldos automáticos
      const autoBackups = this.backups.filter((backup) => backup.type === BACKUP_TYPES.AUTO)

      // Si no hay respaldos automáticos, crear uno
      if (autoBackups.length === 0) {
        this.createAutoBackup()
        return
      }

      // Verificar fecha del último respaldo
      const lastBackup = autoBackups.sort((a, b) => b.timestamp - a.timestamp)[0]
      const timeSinceLastBackup = Date.now() - lastBackup.timestamp

      // Si ha pasado más tiempo que la frecuencia configurada, crear nuevo respaldo
      if (timeSinceLastBackup > this.autoBackupFrequency) {
        this.createAutoBackup()
      }
    } catch (error) {
      console.error("Error al verificar necesidad de respaldo:", error)
    }
  }

  /**
   * Crea un respaldo automático
   */
  async createAutoBackup() {
    try {
      // Verificar si está habilitado
      if (!this.autoBackupEnabled) return

      // Crear respaldo
      const backupId = await this.createBackup({
        type: BACKUP_TYPES.AUTO,
        description: `Respaldo automático ${new Date().toLocaleString()}`,
      })

      // Limpiar respaldos antiguos
      await this.cleanupAutoBackups()

      return backupId
    } catch (error) {
      console.error("Error al crear respaldo automático:", error)
      diagnosticService.error("Error al crear respaldo automático", { error: error.message })
    }
  }

  /**
   * Limpia respaldos automáticos antiguos
   */
  async cleanupAutoBackups() {
    try {
      // Filtrar respaldos automáticos
      const autoBackups = this.backups.filter((backup) => backup.type === BACKUP_TYPES.AUTO)

      // Si hay más respaldos que el máximo permitido, eliminar los más antiguos
      if (autoBackups.length > this.maxAutoBackups) {
        // Ordenar por fecha (más antiguos primero)
        const sortedBackups = autoBackups.sort((a, b) => a.timestamp - b.timestamp)

        // Determinar cuántos eliminar
        const toDelete = sortedBackups.length - this.maxAutoBackups

        // Eliminar los más antiguos
        for (let i = 0; i < toDelete; i++) {
          await this.deleteBackup(sortedBackups[i].id)
        }
      }
    } catch (error) {
      console.error("Error al limpiar respaldos automáticos:", error)
    }
  }

  /**
   * Crea un nuevo respaldo
   * @param {Object} options - Opciones del respaldo
   * @param {string} options.type - Tipo de respaldo (BACKUP_TYPES)
   * @param {string} options.description - Descripción del respaldo
   * @param {Array} options.keys - Claves específicas a respaldar (para respaldo parcial)
   * @returns {Promise<string>} - ID del respaldo creado
   */
  async createBackup(options = {}) {
    try {
      const { type = BACKUP_TYPES.MANUAL, description = "", keys = null } = options

      // Obtener datos a respaldar
      let dataToBackup
      if (type === BACKUP_TYPES.PARTIAL && Array.isArray(keys) && keys.length > 0) {
        // Respaldo parcial (solo claves específicas)
        dataToBackup = {}
        const allItems = await getAllItems()
        keys.forEach((key) => {
          if (allItems[key] !== undefined) {
            dataToBackup[key] = allItems[key]
          }
        })
      } else {
        // Respaldo completo
        dataToBackup = await getAllItems()
      }

      // Generar ID único para el respaldo
      const backupId = uuidv4()

      // Convertir datos a string
      const dataString = JSON.stringify(dataToBackup)

      // Comprimir datos
      const compressedData = await compressionService.compress(dataString)

      // Calcular tamaño
      const size = compressedData.length

      // Crear metadatos del respaldo
      const backupMetadata = {
        id: backupId,
        timestamp: Date.now(),
        type,
        description: description || `Respaldo ${new Date().toLocaleString()}`,
        size,
        keys: keys || Object.keys(dataToBackup),
      }

      // Guardar datos del respaldo
      await setItem(`${STORAGE_KEYS.BACKUP_PREFIX}${backupId}`, compressedData)

      // Actualizar lista de respaldos
      this.backups.push(backupMetadata)
      await this.saveBackupsList()

      // Registrar en log de auditoría
      auditLogService.logEvent("backup_created", {
        backupId,
        type,
        size,
      })

      return backupId
    } catch (error) {
      console.error("Error al crear respaldo:", error)
      diagnosticService.error("Error al crear respaldo", { error: error.message })
      throw error
    }
  }

  /**
   * Obtiene la lista de respaldos
   * @returns {Array} - Lista de respaldos
   */
  getBackupsList() {
    return [...this.backups]
  }

  /**
   * Obtiene un respaldo por su ID
   * @param {string} backupId - ID del respaldo
   * @returns {Object|null} - Metadatos del respaldo o null si no existe
   */
  getBackupMetadata(backupId) {
    return this.backups.find((backup) => backup.id === backupId) || null
  }

  /**
   * Obtiene los datos de un respaldo
   * @param {string} backupId - ID del respaldo
   * @returns {Promise<Object|null>} - Datos del respaldo o null si no existe
   */
  async getBackupData(backupId) {
    try {
      // Verificar si el respaldo existe
      const backupMetadata = this.getBackupMetadata(backupId)
      if (!backupMetadata) return null

      // Obtener datos comprimidos
      const compressedData = await getItem(`${STORAGE_KEYS.BACKUP_PREFIX}${backupId}`)
      if (!compressedData) return null

      // Descomprimir datos
      const dataString = await compressionService.decompress(compressedData)

      // Parsear datos
      return JSON.parse(dataString)
    } catch (error) {
      console.error(`Error al obtener datos del respaldo ${backupId}:`, error)
      return null
    }
  }

  /**
   * Elimina un respaldo
   * @param {string} backupId - ID del respaldo a eliminar
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  async deleteBackup(backupId) {
    try {
      // Verificar si el respaldo existe
      const backupIndex = this.backups.findIndex((backup) => backup.id === backupId)
      if (backupIndex === -1) return false

      // Eliminar datos del respaldo
      await setItem(`${STORAGE_KEYS.BACKUP_PREFIX}${backupId}`, null)

      // Actualizar lista de respaldos
      this.backups.splice(backupIndex, 1)
      await this.saveBackupsList()

      // Registrar en log de auditoría
      auditLogService.logEvent("backup_deleted", {
        backupId,
      })

      return true
    } catch (error) {
      console.error(`Error al eliminar respaldo ${backupId}:`, error)
      return false
    }
  }

  /**
   * Exporta un respaldo a un archivo
   * @param {string} backupId - ID del respaldo a exportar
   * @returns {Promise<Blob>} - Blob con los datos del respaldo
   */
  async exportBackupToFile(backupId) {
    try {
      // Obtener metadatos del respaldo
      const backupMetadata = this.getBackupMetadata(backupId)
      if (!backupMetadata) {
        throw new Error(`Respaldo con ID ${backupId} no encontrado`)
      }

      // Obtener datos comprimidos
      const compressedData = await getItem(`${STORAGE_KEYS.BACKUP_PREFIX}${backupId}`)
      if (!compressedData) {
        throw new Error(`Datos del respaldo con ID ${backupId} no encontrados`)
      }

      // Crear objeto de exportación
      const exportData = {
        metadata: backupMetadata,
        data: compressedData,
        format: "fichaje-qr-backup-v1",
        exportedAt: new Date().toISOString(),
      }

      // Convertir a JSON
      const jsonString = JSON.stringify(exportData)

      // Crear blob
      const blob = new Blob([jsonString], { type: "application/json" })

      // Registrar en log de auditoría
      auditLogService.logEvent("backup_exported", {
        backupId,
        size: blob.size,
      })

      return blob
    } catch (error) {
      console.error(`Error al exportar respaldo ${backupId}:`, error)
      throw error
    }
  }

  /**
   * Importa un respaldo desde un archivo
   * @param {File} file - Archivo de respaldo
   * @returns {Promise<string>} - ID del respaldo importado
   */
  async importBackupFromFile(file) {
    try {
      // Leer archivo
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(e)
        reader.readAsText(file)
      })

      // Parsear contenido
      const importData = JSON.parse(fileContent)

      // Verificar formato
      if (!importData.format || !importData.format.startsWith("fichaje-qr-backup")) {
        throw new Error("Formato de archivo de respaldo no válido")
      }

      // Verificar datos
      if (!importData.metadata || !importData.data) {
        throw new Error("Datos de respaldo incompletos")
      }

      // Generar nuevo ID para el respaldo
      const backupId = uuidv4()

      // Crear metadatos del respaldo
      const backupMetadata = {
        ...importData.metadata,
        id: backupId,
        timestamp: Date.now(),
        description: `Importado: ${importData.metadata.description}`,
        imported: true,
        originalId: importData.metadata.id,
        originalTimestamp: importData.metadata.timestamp,
      }

      // Guardar datos del respaldo
      await setItem(`${STORAGE_KEYS.BACKUP_PREFIX}${backupId}`, importData.data)

      // Actualizar lista de respaldos
      this.backups.push(backupMetadata)
      await this.saveBackupsList()

      // Registrar en log de auditoría
      auditLogService.logEvent("backup_imported", {
        backupId,
        originalId: importData.metadata.id,
        size: importData.metadata.size,
      })

      return backupId
    } catch (error) {
      console.error("Error al importar respaldo:", error)
      diagnosticService.error("Error al importar respaldo", { error: error.message })
      throw error
    }
  }

  /**
   * Restaura un respaldo
   * @param {string} backupId - ID del respaldo a restaurar
   * @param {Object} options - Opciones de restauración
   * @param {boolean} options.full - Si es true, restaura todos los datos (por defecto)
   * @param {Array} options.keys - Claves específicas a restaurar (si full es false)
   * @param {boolean} options.merge - Si es true, combina con datos existentes en lugar de reemplazar
   * @param {Function} options.progressCallback - Función para reportar progreso (recibe valor de 0 a 100)
   * @returns {Promise<Object>} - Resultado de la restauración
   */
  async restoreBackup(backupId, options = {}) {
    try {
      const { full = true, keys = [], merge = false, progressCallback = null } = options

      // Verificar si el respaldo existe
      const backupMetadata = this.getBackupMetadata(backupId)
      if (!backupMetadata) {
        throw new Error(`Respaldo con ID ${backupId} no encontrado`)
      }

      // Reportar progreso inicial
      if (progressCallback) progressCallback(0)

      // Obtener datos del respaldo
      const backupData = await this.getBackupData(backupId)
      if (!backupData) {
        throw new Error(`Datos del respaldo con ID ${backupId} no encontrados`)
      }

      // Reportar progreso
      if (progressCallback) progressCallback(20)

      // Crear respaldo de seguridad antes de restaurar
      const safetyBackupId = await this.createBackup({
        type: BACKUP_TYPES.AUTO,
        description: `Respaldo de seguridad antes de restauración ${new Date().toLocaleString()}`,
      })

      // Reportar progreso
      if (progressCallback) progressCallback(40)

      // Determinar claves a restaurar
      const keysToRestore = full ? Object.keys(backupData) : keys.filter((key) => backupData[key] !== undefined)

      // Verificar integridad de datos antes de restaurar
      const integrityCheck = await this.verifyBackupIntegrity(backupData, keysToRestore)
      if (!integrityCheck.valid) {
        throw new Error(`Integridad del respaldo comprometida: ${integrityCheck.errors.join(", ")}`)
      }

      // Reportar progreso
      if (progressCallback) progressCallback(60)

      // Restaurar datos
      const restoredItems = []
      const failedItems = []
      const totalItems = keysToRestore.length

      for (let i = 0; i < keysToRestore.length; i++) {
        const key = keysToRestore[i]
        try {
          // Si se debe combinar y es un array o un objeto
          if (merge) {
            const currentValue = await getItem(key)
            if (currentValue) {
              try {
                const parsedCurrent = JSON.parse(currentValue)
                const parsedBackup = JSON.parse(backupData[key])

                // Si ambos son arrays, concatenar
                if (Array.isArray(parsedCurrent) && Array.isArray(parsedBackup)) {
                  // Crear un Set para eliminar duplicados por ID
                  const mergedSet = new Set()
                  const idField = "id" // Campo para identificar duplicados

                  // Añadir elementos actuales
                  parsedCurrent.forEach((item) => {
                    if (item[idField]) {
                      mergedSet.add(JSON.stringify(item))
                    }
                  })

                  // Añadir elementos del respaldo
                  parsedBackup.forEach((item) => {
                    if (item[idField]) {
                      mergedSet.add(JSON.stringify(item))
                    }
                  })

                  // Convertir de nuevo a array
                  const mergedArray = Array.from(mergedSet).map((item) => JSON.parse(item))
                  await setItem(key, JSON.stringify(mergedArray))
                }
                // Si ambos son objetos, combinar
                else if (typeof parsedCurrent === "object" && typeof parsedBackup === "object") {
                  const mergedObject = { ...parsedCurrent, ...parsedBackup }
                  await setItem(key, JSON.stringify(mergedObject))
                }
                // En otros casos, usar el valor del respaldo
                else {
                  await setItem(key, backupData[key])
                }
              } catch (e) {
                // Si hay error al parsear, usar el valor del respaldo
                await setItem(key, backupData[key])
              }
            } else {
              // Si no hay valor actual, usar el del respaldo
              await setItem(key, backupData[key])
            }
          }
          // Si no se debe combinar, simplemente reemplazar
          else {
            await setItem(key, backupData[key])
          }

          restoredItems.push(key)
        } catch (error) {
          console.error(`Error al restaurar clave ${key}:`, error)
          failedItems.push({ key, error: error.message })
        }

        // Reportar progreso
        if (progressCallback) {
          const progress = 60 + Math.floor((i / totalItems) * 40)
          progressCallback(progress)
        }
      }

      // Reportar progreso final
      if (progressCallback) progressCallback(100)

      // Registrar en log de auditoría
      auditLogService.logEvent("backup_restored", {
        backupId,
        restoredItems: restoredItems.length,
        failedItems: failedItems.length,
        safetyBackupId,
      })

      // Registrar en diagnóstico
      diagnosticService.info("Respaldo restaurado", {
        backupId,
        restoredItems: restoredItems.length,
        failedItems: failedItems.length,
      })

      return {
        success: true,
        backupId,
        restoredItems,
        failedItems,
        safetyBackupId,
      }
    } catch (error) {
      console.error(`Error al restaurar respaldo ${backupId}:`, error)
      diagnosticService.error("Error al restaurar respaldo", {
        backupId,
        error: error.message,
      })

      throw error
    }
  }

  /**
   * Verifica la integridad de los datos de un respaldo
   * @param {Object} backupData - Datos del respaldo
   * @param {Array} keys - Claves a verificar
   * @returns {Object} - Resultado de la verificación
   */
  async verifyBackupIntegrity(backupData, keys) {
    const result = {
      valid: true,
      errors: [],
    }

    try {
      // Verificar que todas las claves existan
      for (const key of keys) {
        if (backupData[key] === undefined) {
          result.valid = false
          result.errors.push(`Clave ${key} no encontrada en el respaldo`)
        }
      }

      // Verificar que los datos críticos sean válidos
      const criticalKeys = [STORAGE_KEYS.WORKERS, STORAGE_KEYS.POSITIONS, STORAGE_KEYS.CLOCK_RECORDS]

      for (const key of criticalKeys) {
        if (keys.includes(key) && backupData[key]) {
          try {
            // Intentar parsear como JSON
            const parsedData = JSON.parse(backupData[key])

            // Verificar que sea un array
            if (!Array.isArray(parsedData)) {
              result.valid = false
              result.errors.push(`Datos de ${key} no son un array válido`)
            }
          } catch (error) {
            result.valid = false
            result.errors.push(`Error al parsear datos de ${key}: ${error.message}`)
          }
        }
      }

      return result
    } catch (error) {
      console.error("Error al verificar integridad del respaldo:", error)
      result.valid = false
      result.errors.push(`Error general: ${error.message}`)
      return result
    }
  }

  /**
   * Configura el respaldo automático
   * @param {Object} config - Configuración
   * @param {boolean} config.enabled - Si está habilitado
   * @param {number} config.frequency - Frecuencia en milisegundos
   * @param {number} config.maxBackups - Número máximo de respaldos automáticos
   */
  async configureAutoBackup(config = {}) {
    try {
      if (config.enabled !== undefined) {
        this.autoBackupEnabled = config.enabled
      }

      if (config.frequency !== undefined && config.frequency > 0) {
        this.autoBackupFrequency = config.frequency
      }

      if (config.maxBackups !== undefined && config.maxBackups > 0) {
        this.maxAutoBackups = config.maxBackups
      }

      // Guardar configuración
      await this.saveConfig()

      // Reconfigurar respaldo automático
      this.setupAutoBackup()

      // Registrar en log de auditoría
      auditLogService.logEvent("backup_config_updated", {
        autoBackupEnabled: this.autoBackupEnabled,
        autoBackupFrequency: this.autoBackupFrequency,
        maxAutoBackups: this.maxAutoBackups,
      })

      return true
    } catch (error) {
      console.error("Error al configurar respaldo automático:", error)
      return false
    }
  }
}

export const offlineBackupService = new OfflineBackupService()
export default offlineBackupService
