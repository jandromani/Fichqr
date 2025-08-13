/**
 * Servicio para gestionar puestos temporales con códigos QR
 * Permite crear, validar y gestionar puestos de trabajo temporales
 */

import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getData, setData } from "./storage/baseStorage"
import { addAuditLogEntry } from "./auditLogService"
import { qrGenerationService } from "./qrGenerationService"
import { auditLogService } from "./auditLogService" // Import auditLogService
import { notificationService } from "./notificationService" // Import notificationService

// Clave para almacenar puestos temporales en localStorage
const TEMP_POSITIONS_STORAGE_KEY = "temporary_positions"

/**
 * Servicio para gestionar puestos temporales
 */
export const temporaryPositionService = {
  /**
   * Crea un nuevo puesto temporal
   * @param {Object} positionData - Datos del puesto temporal
   * @param {Object} user - Usuario que crea el puesto
   * @returns {Object} - Puesto temporal creado con su código QR
   */
  createTemporaryPosition: (positionData, user) => {
    const temporaryPositions = getData(STORAGE_KEYS.TEMPORARY_POSITIONS, [])

    // Generar ID único
    const id = `temp_${uuidv4().substring(0, 8)}`

    // Obtener datos del usuario y empresa
    const userData = user || { id: "unknown", name: "Sistema" }
    const companyId = userData.companyId || "default"

    // Crear el puesto temporal
    const newPosition = {
      id,
      name: positionData.name || "Puesto Temporal",
      location: positionData.location || "Ubicación no especificada",
      description: positionData.description || "",
      validFrom: positionData.validFrom || new Date().toISOString(),
      validUntil: positionData.validUntil || null,
      maxUses: positionData.maxUses || null,
      usageCount: 0,
      createdBy: {
        id: userData.id,
        name: userData.name,
      },
      companyId,
      createdAt: new Date().toISOString(),
      isActive: true,
    }

    // Generar código QR para el puesto
    const qrData = qrGenerationService.generatePositionQR({
      positionId: id,
      positionName: newPosition.name,
      positionLocation: newPosition.location,
      temporary: true,
      validFrom: newPosition.validFrom,
      validUntil: newPosition.validUntil,
      companyId,
    })

    // Añadir datos del QR al puesto
    newPosition.qrCode = {
      data: qrData.data,
      image: qrData.dataURL,
      template: qrData.template || "template_standard",
    }

    // Guardar el puesto temporal
    temporaryPositions.push(newPosition)
    setData(STORAGE_KEYS.TEMPORARY_POSITIONS, temporaryPositions)

    // Registrar en el log de auditoría
    addAuditLogEntry("createTemporaryPosition", userData.id, id, "temporaryPositionService", {
      userName: userData.name,
      positionName: newPosition.name,
      location: newPosition.location,
      validUntil: newPosition.validUntil,
    })

    return newPosition
  },

  /**
   * Obtiene todos los puestos temporales
   * @param {boolean} includeInactive - Si se deben incluir puestos inactivos
   * @returns {Array} - Lista de puestos temporales
   */
  getAllTemporaryPositions: (includeInactive = false) => {
    const positions = getData(STORAGE_KEYS.TEMPORARY_POSITIONS, [])

    if (includeInactive) {
      return positions
    }

    // Filtrar solo puestos activos
    return positions.filter((position) => position.isActive)
  },

  /**
   * Obtiene un puesto temporal por su ID
   * @param {string} id - ID del puesto temporal
   * @returns {Object|null} - Puesto temporal o null si no existe
   */
  getTemporaryPositionById: (id) => {
    const positions = getAllTemporaryPositions(true)
    return positions.find((position) => position.id === id) || null
  },

  /**
   * Valida si un puesto temporal es válido para su uso
   * @param {string} id - ID del puesto temporal
   * @returns {Object} - Resultado de la validación
   */
  validateTemporaryPosition: (id) => {
    const position = getTemporaryPositionById(id)

    if (!position) {
      return {
        valid: false,
        message: "Puesto temporal no encontrado",
        code: "NOT_FOUND",
      }
    }

    if (!position.isActive) {
      return {
        valid: false,
        message: "Este puesto temporal ha sido desactivado",
        code: "INACTIVE",
        position,
      }
    }

    // Verificar fecha de validez
    const now = new Date()
    const validFrom = new Date(position.validFrom)

    if (validFrom > now) {
      return {
        valid: false,
        message: `Este puesto temporal será válido a partir de ${validFrom.toLocaleString()}`,
        code: "NOT_YET_VALID",
        position,
      }
    }

    // Verificar fecha de expiración si existe
    if (position.validUntil) {
      const validUntil = new Date(position.validUntil)
      if (validUntil < now) {
        return {
          valid: false,
          message: `Este puesto temporal expiró el ${validUntil.toLocaleString()}`,
          code: "EXPIRED",
          position,
        }
      }
    }

    // Verificar número máximo de usos
    if (position.maxUses !== null && position.usageCount >= position.maxUses) {
      return {
        valid: false,
        message: `Este puesto temporal ha alcanzado su límite máximo de usos (${position.maxUses})`,
        code: "MAX_USES_REACHED",
        position,
      }
    }

    return {
      valid: true,
      message: "Puesto temporal válido",
      code: "VALID",
      position,
    }
  },

  /**
   * Registra un uso del puesto temporal
   * @param {string} id - ID del puesto temporal
   * @param {Object} user - Usuario que utiliza el puesto
   * @returns {Object} - Resultado del registro
   */
  registerTemporaryPositionUsage: (id, user) => {
    const validation = validateTemporaryPosition(id)

    if (!validation.valid) {
      return validation
    }

    const positions = getAllTemporaryPositions(true)
    const index = positions.findIndex((position) => position.id === id)

    if (index === -1) {
      return {
        valid: false,
        message: "Puesto temporal no encontrado",
        code: "NOT_FOUND",
      }
    }

    // Incrementar contador de usos
    positions[index].usageCount += 1
    positions[index].lastUsedAt = new Date().toISOString()
    positions[index].lastUsedBy = {
      id: user?.id || "unknown",
      name: user?.name || "Usuario desconocido",
    }

    // Verificar si se alcanzó el límite de usos
    if (positions[index].maxUses !== null && positions[index].usageCount >= positions[index].maxUses) {
      positions[index].isActive = false
      positions[index].deactivatedAt = new Date().toISOString()
      positions[index].deactivationReason = "MAX_USES_REACHED"
    }

    // Guardar cambios
    setData(STORAGE_KEYS.TEMPORARY_POSITIONS, positions)

    // Registrar en el log de auditoría
    addAuditLogEntry("useTemporaryPosition", user?.id || "unknown", id, "temporaryPositionService", {
      userName: user?.name || "Usuario desconocido",
      positionName: positions[index].name,
      usageCount: positions[index].usageCount,
      isActive: positions[index].isActive,
    })

    return {
      valid: true,
      message: "Uso registrado correctamente",
      code: "USAGE_REGISTERED",
      position: positions[index],
    }
  },

  /**
   * Desactiva un puesto temporal
   * @param {string} id - ID del puesto temporal
   * @param {string} reason - Motivo de la desactivación
   * @param {Object} user - Usuario que desactiva el puesto
   * @returns {boolean} - true si se desactivó correctamente
   */
  deactivateTemporaryPosition: (id, reason, user) => {
    const positions = getAllTemporaryPositions(true)
    const index = positions.findIndex((position) => position.id === id)

    if (index === -1) return false

    // Desactivar el puesto
    positions[index].isActive = false
    positions[index].deactivatedAt = new Date().toISOString()
    positions[index].deactivationReason = reason || "MANUAL_DEACTIVATION"

    if (user) {
      positions[index].deactivatedBy = {
        id: user.id,
        name: user.name,
      }
    }

    // Guardar cambios
    setData(STORAGE_KEYS.TEMPORARY_POSITIONS, positions)

    // Registrar en el log de auditoría
    addAuditLogEntry("deactivateTemporaryPosition", user?.id || "unknown", id, "temporaryPositionService", {
      userName: user?.name || "Sistema",
      positionName: positions[index].name,
      reason: positions[index].deactivationReason,
    })

    return true
  },

  /**
   * Reactiva un puesto temporal
   * @param {string} id - ID del puesto temporal
   * @param {Object} user - Usuario que reactiva el puesto
   * @returns {boolean} - true si se reactivó correctamente
   */
  reactivateTemporaryPosition: (id, user) => {
    const positions = getAllTemporaryPositions(true)
    const index = positions.findIndex((position) => position.id === id)

    if (index === -1) return false

    // Reactivar el puesto
    positions[index].isActive = true
    positions[index].reactivatedAt = new Date().toISOString()

    if (user) {
      positions[index].reactivatedBy = {
        id: user.id,
        name: user.name,
      }
    }

    // Guardar cambios
    setData(STORAGE_KEYS.TEMPORARY_POSITIONS, positions)

    // Registrar en el log de auditoría
    addAuditLogEntry("reactivateTemporaryPosition", user?.id || "unknown", id, "temporaryPositionService", {
      userName: user?.name || "Sistema",
      positionName: positions[index].name,
    })

    return true
  },

  /**
   * Extiende la validez de un puesto temporal
   * @param {string} id - ID del puesto temporal
   * @param {string} newValidUntil - Nueva fecha de expiración
   * @param {Object} user - Usuario que extiende la validez
   * @returns {Object|null} - Puesto actualizado o null
   */
  extendTemporaryPosition: (id, newValidUntil, user) => {
    const positions = getAllTemporaryPositions(true)
    const index = positions.findIndex((position) => position.id === id)

    if (index === -1) return null

    // Verificar que la nueva fecha sea válida
    const newDate = new Date(newValidUntil)
    const now = new Date()

    if (isNaN(newDate) || newDate <= now) {
      return null
    }

    // Guardar la fecha anterior para el registro
    const previousValidUntil = positions[index].validUntil

    // Actualizar la fecha de validez
    positions[index].validUntil = newValidUntil
    positions[index].updatedAt = new Date().toISOString()

    // Si estaba desactivado por expiración, reactivarlo
    if (!positions[index].isActive && positions[index].deactivationReason === "EXPIRED") {
      positions[index].isActive = true
      positions[index].reactivatedAt = new Date().toISOString()
      positions[index].reactivatedBy = user
        ? {
            id: user.id,
            name: user.name,
          }
        : {
            id: "system",
            name: "Sistema",
          }
    }

    // Guardar cambios
    setData(STORAGE_KEYS.TEMPORARY_POSITIONS, positions)

    // Registrar en el log de auditoría
    addAuditLogEntry("extendTemporaryPosition", user?.id || "unknown", id, "temporaryPositionService", {
      userName: user?.name || "Sistema",
      positionName: positions[index].name,
      previousValidUntil,
      newValidUntil,
    })

    return positions[index]
  },

  /**
   * Limpia puestos temporales expirados o inactivos
   * @param {number} olderThanDays - Días de antigüedad para considerar eliminación
   * @returns {number} - Número de puestos eliminados
   */
  cleanupTemporaryPositions: (olderThanDays = 30) => {
    const positions = getAllTemporaryPositions(true)
    const now = new Date()
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // Filtrar puestos a mantener
    const filteredPositions = positions.filter((position) => {
      // Mantener puestos activos
      if (position.isActive) return true

      // Para inactivos, verificar fecha de desactivación
      if (position.deactivatedAt) {
        const deactivatedDate = new Date(position.deactivatedAt)
        return deactivatedDate > cutoffDate
      }

      // Para expirados sin fecha de desactivación explícita, verificar validUntil
      if (position.validUntil) {
        const expiryDate = new Date(position.validUntil)
        return expiryDate > cutoffDate
      }

      // Por defecto, mantener
      return true
    })

    // Si se eliminaron puestos, guardar
    const removedCount = positions.length - filteredPositions.length

    if (removedCount > 0) {
      setData(STORAGE_KEYS.TEMPORARY_POSITIONS, filteredPositions)

      // Registrar en el log de auditoría
      addAuditLogEntry("cleanupTemporaryPositions", "system", "cleanup", "temporaryPositionService", {
        removedCount,
        olderThanDays,
        timestamp: now.toISOString(),
      })
    }

    return removedCount
  },

  /**
   * Obtiene todos los puestos temporales activos
   * @param {Object} filters - Filtros opcionales (companyId, etc)
   * @returns {Array} - Lista de puestos temporales
   */
  getTemporaryPositions: (filters = {}) => {
    try {
      const positionsJson = localStorage.getItem(TEMP_POSITIONS_STORAGE_KEY)
      const positions = positionsJson ? JSON.parse(positionsJson) : []

      // Filtrar solo los puestos que no han expirado
      const now = Date.now()
      let filteredPositions = positions.filter((position) => new Date(position.expiresAt).getTime() > now)

      // Aplicar filtros adicionales si existen
      if (filters.companyId) {
        filteredPositions = filteredPositions.filter((pos) => pos.companyId === filters.companyId)
      }

      return filteredPositions
    } catch (error) {
      console.error("Error al obtener puestos temporales:", error)
      return []
    }
  },

  /**
   * Elimina un puesto temporal
   * @param {string} positionId - ID del puesto temporal
   * @returns {boolean} - true si se eliminó correctamente
   */
  deleteTemporaryPosition: (positionId) => {
    try {
      const positionsJson = localStorage.getItem(TEMP_POSITIONS_STORAGE_KEY)
      if (!positionsJson) return false

      const positions = JSON.parse(positionsJson)
      const updatedPositions = positions.filter((pos) => pos.id !== positionId)

      if (positions.length === updatedPositions.length) {
        return false // No se encontró el puesto
      }

      localStorage.setItem(TEMP_POSITIONS_STORAGE_KEY, JSON.stringify(updatedPositions))

      // Registrar en el log de auditoría
      auditLogService.logEvent("TEMPORARY_POSITION_DELETED", {
        positionId,
      })

      return true
    } catch (error) {
      console.error("Error al eliminar puesto temporal:", error)
      return false
    }
  },

  /**
   * Extiende la validez de un puesto temporal
   * @param {string} positionId - ID del puesto temporal
   * @param {number} additionalHours - Horas adicionales de validez
   * @returns {Object|null} - Puesto actualizado o null si no se encontró
   */
  extendTemporaryPositionOld: (positionId, additionalHours = 24) => {
    try {
      const positionsJson = localStorage.getItem(TEMP_POSITIONS_STORAGE_KEY)
      if (!positionsJson) return null

      const positions = JSON.parse(positionsJson)
      const positionIndex = positions.findIndex((pos) => pos.id === positionId)

      if (positionIndex === -1) {
        return null // No se encontró el puesto
      }

      // Calcular nueva fecha de expiración
      const position = positions[positionIndex]
      const currentExpiry = new Date(position.expiresAt)
      currentExpiry.setHours(currentExpiry.getHours() + additionalHours)
      position.expiresAt = currentExpiry.toISOString()

      // Actualizar en localStorage
      positions[positionIndex] = position
      localStorage.setItem(TEMP_POSITIONS_STORAGE_KEY, JSON.stringify(positions))

      // Registrar en el log de auditoría
      auditLogService.logEvent("TEMPORARY_POSITION_EXTENDED", {
        positionId,
        additionalHours,
        newExpiryDate: position.expiresAt,
      })

      return position
    } catch (error) {
      console.error("Error al extender puesto temporal:", error)
      return null
    }
  },

  /**
   * Verifica si un puesto temporal es válido
   * @param {string} positionId - ID del puesto temporal
   * @returns {Object} - Resultado de la validación
   */
  validateTemporaryPositionOld: (positionId) => {
    try {
      const positions = temporaryPositionService.getTemporaryPositions()
      const position = positions.find((pos) => pos.id === positionId)

      if (!position) {
        return {
          isValid: false,
          reason: "POSITION_NOT_FOUND",
          message: "El puesto temporal no existe",
        }
      }

      const now = Date.now()
      const expiryTime = new Date(position.expiresAt).getTime()

      if (expiryTime <= now) {
        return {
          isValid: false,
          reason: "POSITION_EXPIRED",
          message: "El puesto temporal ha expirado",
          expiryDate: position.expiresAt,
        }
      }

      return {
        isValid: true,
        position,
        message: "Puesto temporal válido",
        expiresIn: Math.floor((expiryTime - now) / (1000 * 60 * 60)), // Horas restantes
      }
    } catch (error) {
      console.error("Error al validar puesto temporal:", error)
      return {
        isValid: false,
        reason: "VALIDATION_ERROR",
        message: "Error al validar el puesto temporal",
      }
    }
  },

  /**
   * Limpia los puestos temporales expirados
   * @returns {number} - Número de puestos eliminados
   */
  cleanupExpiredPositions: () => {
    try {
      const positionsJson = localStorage.getItem(TEMP_POSITIONS_STORAGE_KEY)
      if (!positionsJson) return 0

      const positions = JSON.parse(positionsJson)
      const now = Date.now()

      const validPositions = positions.filter((pos) => {
        const expiryTime = new Date(pos.expiresAt).getTime()
        return expiryTime > now
      })

      const removedCount = positions.length - validPositions.length

      if (removedCount > 0) {
        localStorage.setItem(TEMP_POSITIONS_STORAGE_KEY, JSON.stringify(validPositions))

        // Registrar en el log de auditoría
        auditLogService.logEvent("EXPIRED_POSITIONS_CLEANUP", {
          removedCount,
        })
      }

      return removedCount
    } catch (error) {
      console.error("Error al limpiar puestos temporales expirados:", error)
      return 0
    }
  },

  /**
   * Notifica a los administradores sobre un nuevo puesto temporal
   * @param {Object} position - Datos del puesto temporal
   */
  notifyAdminsAboutTemporaryPosition: (position) => {
    try {
      const expiryDate = new Date(position.expiresAt).toLocaleString()

      notificationService.sendNotification({
        title: "Nuevo puesto temporal creado",
        message: `Se ha creado el puesto temporal "${position.name}" válido hasta ${expiryDate}`,
        type: "info",
        target: "admin",
        data: {
          positionId: position.id,
          action: "VIEW_TEMPORARY_POSITION",
        },
      })
    } catch (error) {
      console.error("Error al notificar a administradores:", error)
    }
  },
}

export const createTemporaryPosition = temporaryPositionService.createTemporaryPosition
export const getAllTemporaryPositions = temporaryPositionService.getAllTemporaryPositions
export const getTemporaryPositionById = temporaryPositionService.getTemporaryPositionById
export const validateTemporaryPosition = temporaryPositionService.validateTemporaryPosition
export const registerTemporaryPositionUsage = temporaryPositionService.registerTemporaryPositionUsage
export const deactivateTemporaryPosition = temporaryPositionService.deactivateTemporaryPosition
export const reactivateTemporaryPosition = temporaryPositionService.reactivateTemporaryPosition
export const extendTemporaryPosition = temporaryPositionService.extendTemporaryPosition
export const cleanupTemporaryPositions = temporaryPositionService.cleanupTemporaryPositions

export default temporaryPositionService
