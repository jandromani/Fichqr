/**
 * Servicio para garantizar la integridad de los datos
 * Proporciona funciones para firmar y verificar registros
 */

import CryptoJS from "crypto-js"
import { getData, STORAGE_KEYS } from "./storageService"
import { addAuditLogEntry } from "./auditLogService"

// Clave secreta para firmar los registros (en una implementación real, esto estaría en el servidor)
const SECRET_KEY = "FichajeQR_IntegrityKey_2023"

/**
 * Genera una firma digital para un registro de fichaje
 * @param {Object} record - Registro de fichaje
 * @returns {string} - Firma digital (hash)
 */
export const signClockRecord = (record) => {
  try {
    // Extraer los datos críticos que queremos proteger
    const criticalData = {
      userId: record.userId,
      positionId: record.positionId,
      startTime: record.startTime,
      endTime: record.endTime || null,
      date: record.date,
      status: record.status,
      pauses: record.pauses || [],
    }

    // Convertir a string y generar el hash
    const dataString = JSON.stringify(criticalData)
    const hash = CryptoJS.SHA256(dataString + SECRET_KEY).toString()

    return hash
  } catch (error) {
    console.error("Error al generar firma digital:", error)
    return null
  }
}

/**
 * Verifica la integridad de un registro de fichaje
 * @param {Object} record - Registro de fichaje
 * @returns {boolean} - true si el registro es válido
 */
export const verifyClockRecord = (record) => {
  try {
    if (!record || !record.signature) {
      return false
    }

    // Extraer los datos críticos para verificar
    const criticalData = {
      userId: record.userId,
      positionId: record.positionId,
      startTime: record.startTime,
      endTime: record.endTime || null,
      date: record.date,
      status: record.status,
      pauses: record.pauses || [],
    }

    // Generar un nuevo hash y comparar con la firma almacenada
    const dataString = JSON.stringify(criticalData)
    const calculatedHash = CryptoJS.SHA256(dataString + SECRET_KEY).toString()

    return calculatedHash === record.signature
  } catch (error) {
    console.error("Error al verificar firma digital:", error)
    return false
  }
}

/**
 * Verifica si un registro ha sido manipulado
 * @param {Object} record - Registro a verificar
 * @returns {boolean} - true si el registro ha sido manipulado
 */
export const hasBeenTampered = (record) => {
  return !verifyClockRecord(record)
}

/**
 * Verifica la integridad de todos los registros de fichaje
 * @param {Object} user - Usuario que realiza la verificación
 * @returns {Object} - Resultado de la verificación
 */
export const verifyAllClockRecords = (user = null) => {
  try {
    const records = getData(STORAGE_KEYS.CLOCK_RECORDS)
    const tamperedRecords = []
    let validCount = 0

    // Verificar cada registro
    records.forEach((record) => {
      if (record.signature) {
        if (verifyClockRecord(record)) {
          validCount++
        } else {
          tamperedRecords.push(record)
        }
      }
    })

    // Registrar el resultado en el log de auditoría
    if (user && tamperedRecords.length > 0) {
      addAuditLogEntry("integrityCheck", user.id, "clockRecords", "integrityService", {
        userName: user.name,
        totalRecords: records.length,
        validRecords: validCount,
        tamperedRecords: tamperedRecords.length,
        tamperedIds: tamperedRecords.map((r) => r.id),
      })
    }

    return {
      totalRecords: records.length,
      validRecords: validCount,
      tamperedRecords: tamperedRecords,
      isValid: tamperedRecords.length === 0,
    }
  } catch (error) {
    console.error("Error al verificar integridad de registros:", error)
    return {
      totalRecords: 0,
      validRecords: 0,
      tamperedRecords: [],
      isValid: false,
      error: error.message,
    }
  }
}

/**
 * Repara un registro manipulado (solo para administradores)
 * @param {string} recordId - ID del registro a reparar
 * @param {Object} user - Usuario administrador que realiza la reparación
 * @returns {boolean} - true si se reparó correctamente
 */
export const repairTamperedRecord = (recordId, user) => {
  try {
    // Verificar que el usuario es administrador
    if (!user || user.role !== "admin") {
      console.error("Solo los administradores pueden reparar registros manipulados")
      return false
    }

    const records = getData(STORAGE_KEYS.CLOCK_RECORDS)
    const index = records.findIndex((r) => r.id === recordId)

    if (index === -1) {
      return false
    }

    // Generar una nueva firma para el registro
    records[index].signature = signClockRecord(records[index])
    records[index].repairedAt = new Date().toISOString()
    records[index].repairedBy = {
      id: user.id,
      name: user.name,
      role: user.role,
    }

    // Guardar los cambios
    localStorage.setItem(STORAGE_KEYS.CLOCK_RECORDS, JSON.stringify(records))

    // Registrar la acción en el log de auditoría
    addAuditLogEntry("repairTamperedRecord", user.id, recordId, "integrityService", {
      userName: user.name,
      recordData: records[index],
    })

    return true
  } catch (error) {
    console.error("Error al reparar registro manipulado:", error)
    return false
  }
}
