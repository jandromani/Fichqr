/**
 * Servicio para validar y gestionar el estado de los fichajes activos
 * Asegura que un trabajador solo pueda tener un fichaje activo a la vez
 */

import { clockRecordService } from "./storageService"

// Clave para almacenar los fichajes activos en localStorage
const ACTIVE_CLOCK_KEY = "activeClockRecords"

/**
 * Verifica si un trabajador tiene un fichaje activo
 * @param {string} userId - ID del trabajador
 * @returns {Object|null} - Datos del fichaje activo o null si no hay ninguno
 */
export const hasActiveClockRecord = (userId) => {
  if (!userId) return null

  try {
    // Obtener los fichajes activos de localStorage
    const activeClocks = JSON.parse(localStorage.getItem(ACTIVE_CLOCK_KEY) || "{}")

    // Verificar si el trabajador tiene un fichaje activo
    if (activeClocks[userId]) {
      // Verificar si el fichaje sigue existiendo en la colección principal
      const clockRecord = clockRecordService.getById(activeClocks[userId].recordId)

      // Si el fichaje existe y no tiene hora de fin, está activo
      if (clockRecord && !clockRecord.endTime) {
        return {
          ...activeClocks[userId],
          record: clockRecord,
        }
      } else {
        // Si el fichaje no existe o ya tiene hora de fin, eliminar la entrada
        removeActiveClockRecord(userId)
        return null
      }
    }

    // Verificar también en la colección principal por si acaso
    const allRecords = clockRecordService.getAll()
    const activeRecord = allRecords.find((record) => record.userId === userId && !record.endTime)

    if (activeRecord) {
      // Si se encuentra un fichaje activo en la colección principal pero no en activeClocks,
      // registrarlo en activeClocks para futuras verificaciones
      registerActiveClockRecord(userId, activeRecord.id, activeRecord.positionId)
      return {
        userId,
        recordId: activeRecord.id,
        positionId: activeRecord.positionId,
        startTime: activeRecord.startTime,
        record: activeRecord,
      }
    }

    return null
  } catch (error) {
    console.error("Error al verificar fichaje activo:", error)
    return null
  }
}

/**
 * Registra un nuevo fichaje activo
 * @param {string} userId - ID del trabajador
 * @param {string} recordId - ID del registro de fichaje
 * @param {string} positionId - ID del puesto de trabajo
 * @returns {boolean} - true si se registró correctamente
 */
export const registerActiveClockRecord = (userId, recordId, positionId) => {
  if (!userId || !recordId) return false

  try {
    // Obtener los fichajes activos actuales
    const activeClocks = JSON.parse(localStorage.getItem(ACTIVE_CLOCK_KEY) || "{}")

    // Registrar el nuevo fichaje activo
    activeClocks[userId] = {
      userId,
      recordId,
      positionId,
      startTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    // Guardar en localStorage
    localStorage.setItem(ACTIVE_CLOCK_KEY, JSON.stringify(activeClocks))
    return true
  } catch (error) {
    console.error("Error al registrar fichaje activo:", error)
    return false
  }
}

/**
 * Elimina un fichaje activo
 * @param {string} userId - ID del trabajador
 * @returns {boolean} - true si se eliminó correctamente
 */
export const removeActiveClockRecord = (userId) => {
  if (!userId) return false

  try {
    // Obtener los fichajes activos actuales
    const activeClocks = JSON.parse(localStorage.getItem(ACTIVE_CLOCK_KEY) || "{}")

    // Eliminar el fichaje activo del trabajador
    if (activeClocks[userId]) {
      delete activeClocks[userId]

      // Guardar en localStorage
      localStorage.setItem(ACTIVE_CLOCK_KEY, JSON.stringify(activeClocks))
      return true
    }

    return false
  } catch (error) {
    console.error("Error al eliminar fichaje activo:", error)
    return false
  }
}

/**
 * Sincroniza los fichajes activos con la colección principal
 * Útil para ejecutar periódicamente y mantener la consistencia
 */
export const syncActiveClockRecords = () => {
  try {
    // Obtener todos los fichajes
    const allRecords = clockRecordService.getAll()

    // Obtener los fichajes activos actuales
    const activeClocks = JSON.parse(localStorage.getItem(ACTIVE_CLOCK_KEY) || "{}")
    const updatedActiveClocks = {}

    // Verificar cada fichaje activo
    Object.keys(activeClocks).forEach((userId) => {
      const activeRecord = allRecords.find((record) => record.id === activeClocks[userId].recordId && !record.endTime)

      // Si el fichaje sigue activo, mantenerlo
      if (activeRecord) {
        updatedActiveClocks[userId] = {
          ...activeClocks[userId],
          lastUpdated: new Date().toISOString(),
        }
      }
    })

    // Buscar fichajes activos que no estén registrados
    allRecords.forEach((record) => {
      if (!record.endTime && !updatedActiveClocks[record.userId]) {
        updatedActiveClocks[record.userId] = {
          userId: record.userId,
          recordId: record.id,
          positionId: record.positionId,
          startTime: record.startTime,
          lastUpdated: new Date().toISOString(),
        }
      }
    })

    // Guardar los fichajes activos actualizados
    localStorage.setItem(ACTIVE_CLOCK_KEY, JSON.stringify(updatedActiveClocks))

    return true
  } catch (error) {
    console.error("Error al sincronizar fichajes activos:", error)
    return false
  }
}
