/**
 * Servicio para gestionar backups de datos
 * Permite exportar e importar datos para cumplir con requisitos legales de conservación
 */

import { STORAGE_KEYS, getData, setData } from "./storageService"
import CryptoJS from "crypto-js"

// Clave secreta para firmar los backups (en una implementación real, esto estaría en el servidor)
const SECRET_KEY = "FichajeQR_BackupSignature_2023"

/**
 * Genera un backup de todos los datos de la aplicación
 * @param {Object} user - Usuario que genera el backup
 * @returns {Object} - Objeto con los datos del backup y su firma
 */
export const generateBackup = (user) => {
  try {
    // Recopilar todos los datos relevantes
    const backup = {
      metadata: {
        version: "1.0",
        timestamp: new Date().toISOString(),
        generatedBy: user
          ? {
              id: user.id,
              name: user.name,
              role: user.role,
              companyId: user.companyId,
            }
          : "unknown",
      },
      data: {
        positions: getData(STORAGE_KEYS.POSITIONS),
        workers: getData(STORAGE_KEYS.WORKERS),
        clockRecords: getData(STORAGE_KEYS.CLOCK_RECORDS),
        absenceRequests: getData(STORAGE_KEYS.ABSENCE_REQUESTS),
      },
    }

    // Generar un hash de los datos para verificar integridad
    const dataString = JSON.stringify(backup.data)
    const hash = CryptoJS.SHA256(dataString + SECRET_KEY).toString()

    // Añadir el hash al backup
    backup.signature = hash

    return backup
  } catch (error) {
    console.error("Error al generar backup:", error)
    throw new Error("No se pudo generar el backup: " + error.message)
  }
}

/**
 * Exporta un backup a un archivo JSON
 * @param {Object} user - Usuario que genera el backup
 * @returns {string} - URL del archivo para descargar
 */
export const exportBackup = (user) => {
  try {
    const backup = generateBackup(user)

    // Convertir a JSON
    const backupJSON = JSON.stringify(backup, null, 2)

    // Crear un blob con los datos
    const blob = new Blob([backupJSON], { type: "application/json" })

    // Crear URL para descargar
    const url = URL.createObjectURL(blob)

    // Nombre del archivo con fecha y hora
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `fichaje_qr_backup_${timestamp}.json`

    return { url, filename }
  } catch (error) {
    console.error("Error al exportar backup:", error)
    throw new Error("No se pudo exportar el backup: " + error.message)
  }
}

/**
 * Verifica la integridad de un backup
 * @param {Object} backup - Objeto de backup a verificar
 * @returns {boolean} - true si el backup es válido
 */
export const verifyBackup = (backup) => {
  try {
    // Verificar que el backup tiene la estructura correcta
    if (!backup || !backup.data || !backup.signature) {
      return false
    }

    // Generar un hash de los datos
    const dataString = JSON.stringify(backup.data)
    const hash = CryptoJS.SHA256(dataString + SECRET_KEY).toString()

    // Comparar con la firma del backup
    return hash === backup.signature
  } catch (error) {
    console.error("Error al verificar backup:", error)
    return false
  }
}

/**
 * Importa datos desde un archivo de backup
 * @param {File} file - Archivo de backup
 * @returns {Promise<Object>} - Resultado de la importación
 */
export const importBackup = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        // Parsear el contenido del archivo
        const backup = JSON.parse(event.target.result)

        // Verificar la integridad del backup
        if (!verifyBackup(backup)) {
          reject(new Error("El archivo de backup está corrupto o ha sido manipulado."))
          return
        }

        // Importar los datos
        if (backup.data.positions) {
          setData(STORAGE_KEYS.POSITIONS, backup.data.positions)
        }

        if (backup.data.workers) {
          setData(STORAGE_KEYS.WORKERS, backup.data.workers)
        }

        if (backup.data.clockRecords) {
          setData(STORAGE_KEYS.CLOCK_RECORDS, backup.data.clockRecords)
        }

        if (backup.data.absenceRequests) {
          setData(STORAGE_KEYS.ABSENCE_REQUESTS, backup.data.absenceRequests)
        }

        resolve({
          success: true,
          message: "Backup importado correctamente",
          metadata: backup.metadata,
        })
      } catch (error) {
        reject(new Error("Error al procesar el archivo: " + error.message))
      }
    }

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo"))
    }

    reader.readAsText(file)
  })
}
