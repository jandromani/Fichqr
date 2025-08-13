/**
 * Servicio para gestionar registros de fichaje
 */

import { STORAGE_KEYS } from "./constants"
import {
  getActiveItems,
  getData,
  getDeletedItems,
  getItemById,
  addItem,
  updateItem,
  removeItem,
  restoreItem,
  permanentDelete,
} from "./baseStorage"
import { signClockRecord, verifyClockRecord } from "../integrityService"
import { addAuditLogEntry } from "../auditLogService"

// Funciones específicas para registros de fichaje
export const clockRecordService = {
  getAll: () => getActiveItems(STORAGE_KEYS.CLOCK_RECORDS),
  getAllWithDeleted: () => getData(STORAGE_KEYS.CLOCK_RECORDS),
  getDeleted: () => getDeletedItems(STORAGE_KEYS.CLOCK_RECORDS),
  getByUserId: (userId) => {
    const records = getActiveItems(STORAGE_KEYS.CLOCK_RECORDS)
    return records.filter((record) => record.userId === userId)
  },
  getByPositionId: (positionId) => {
    const records = getActiveItems(STORAGE_KEYS.CLOCK_RECORDS)
    return records.filter((record) => record.positionId === positionId)
  },
  add: (record, user = null) => {
    // Añadir firma digital
    const recordWithSignature = {
      ...record,
      signature: signClockRecord(record),
    }
    return addItem(STORAGE_KEYS.CLOCK_RECORDS, recordWithSignature, user)
  },
  update: (id, updates, user = null) => {
    // Verificar si el registro está bloqueado
    const record = getItemById(STORAGE_KEYS.CLOCK_RECORDS, id)

    if (!record) return false

    if (record.locked && !updates.forceUpdate) {
      console.warn(`Intento de actualizar registro de fichaje bloqueado con ID ${id}`)

      // Registrar intento de actualización de registro bloqueado
      if (user) {
        addAuditLogEntry("updateLockedRecord", user.id, id, "clockRecordService", {
          userName: user.name,
          itemType: STORAGE_KEYS.CLOCK_RECORDS,
          attempted: true,
          success: false,
          reason: "Record is locked",
        })
      }

      return false
    }

    // Verificar la integridad antes de actualizar
    if (record.signature) {
      const isValid = verifyClockRecord(record)

      if (!isValid && !updates.forceUpdate) {
        console.error(`Intento de actualizar registro de fichaje manipulado con ID ${id}`)

        // Registrar intento de actualización de registro manipulado
        if (user) {
          addAuditLogEntry("updateTamperedRecord", user.id, id, "clockRecordService", {
            userName: user.name,
            itemType: STORAGE_KEYS.CLOCK_RECORDS,
            attempted: true,
            success: false,
            reason: "Record integrity check failed",
          })
        }

        return false
      }
    }

    // Realizar la actualización
    const result = updateItem(STORAGE_KEYS.CLOCK_RECORDS, id, updates, user)

    // Si la actualización fue exitosa, actualizar la firma
    if (result) {
      const updatedRecord = getItemById(STORAGE_KEYS.CLOCK_RECORDS, id)
      if (updatedRecord) {
        updateItem(STORAGE_KEYS.CLOCK_RECORDS, id, {
          signature: signClockRecord(updatedRecord),
        })
      }
    }

    return result
  },
  remove: (id, user) => removeItem(STORAGE_KEYS.CLOCK_RECORDS, id, user),
  restore: (id, user) => restoreItem(STORAGE_KEYS.CLOCK_RECORDS, id, user),
  permanentDelete: (id, user) => permanentDelete(STORAGE_KEYS.CLOCK_RECORDS, id, user),

  // Verificar la integridad de un registro
  verifyIntegrity: (id) => {
    const record = getItemById(STORAGE_KEYS.CLOCK_RECORDS, id)
    if (!record || !record.signature) return false
    return verifyClockRecord(record)
  },

  // Función específica para finalizar un fichaje
  endClockRecord: (userId, endTime, endLocation, pauses, user = null) => {
    const records = getData(STORAGE_KEYS.CLOCK_RECORDS)
    const index = records.findIndex((r) => r.userId === userId && !r.endTime && !r.isDeleted)

    if (index === -1) return false

    // Guardar una copia del registro original
    const originalRecord = { ...records[index] }

    // Actualizar el registro
    records[index] = {
      ...records[index],
      endTime,
      endLocation,
      pauses,
      duration:
        endTime && records[index].startTime
          ? Math.round((new Date(endTime) - new Date(records[index].startTime)) / 60000)
          : null,
      status: "completed",
      updatedAt: new Date().toISOString(),
      locked: true, // Añadir campo locked para prevenir ediciones
    }

    // Actualizar la firma digital
    records[index].signature = signClockRecord(records[index])

    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEYS.CLOCK_RECORDS, JSON.stringify(records))

    // Registrar la acción en el log de auditoría
    if (user) {
      addAuditLogEntry("endClockRecord", user.id, records[index].id, "clockRecordService", {
        userName: user.name,
        before: originalRecord,
        after: records[index],
        endTime,
        duration: records[index].duration,
      })
    }

    return true
  },
}
