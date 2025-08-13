/**
 * Punto de entrada para los services de almacenamiento
 * Exporta all services específicos y funciones de inicialización
 */

import { STORAGE_KEYS } from "./storage/constants"
import {
  baseStorageService,
  getData,
  setData,
  addItem,
  updateItem,
  removeItem,
  getItemById,
  getActiveItems,
  getDeletedItems,
  softDelete,
  restoreItem,
  permanentDelete,
  clearData,
  getDeleteHistory,
  clearDeleteHistory,
} from "./storage/baseStorage"
import { positionService } from "./storage/positionService"
import { workerService } from "./storage/workerService"
import { clockRecordService } from "./storage/clockRecordService"
import { absenceRequestService } from "./storage/absenceRequestService"
import { userSettingsService } from "./storage/userSettingsService"

/**
 * Obtiene datos de localStorage para una clave específica
 * @param {string} key - Clave de almacenamiento
 * @param {any} defaultValue - Valor por defecto si no existe la clave
 * @returns {any} - Datos almacenados o valor por defecto
 */
export const getItem = (key, defaultValue = null) => {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (error) {
    console.error(`Error al obtener datos de ${key}:`, error)
    return defaultValue
  }
}

/**
 * Guarda datos en localStorage
 * @param {string} key - Clave de almacenamiento
 * @param {any} value - Valor a almacenar
 */
export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error al guardar datos en ${key}:`, error)
  }
}

/**
 * Obtiene todos los elementos almacenados
 * @returns {object} - Todos los elementos en localStorage
 */
export const getAllItems = () => {
  try {
    const allItems = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      allItems[key] = localStorage.getItem(key)
    }
    return allItems
  } catch (error) {
    console.error("Error al obtener todos los elementos:", error)
    return {}
  }
}

/**
 * Obtiene el ID de la empresa actual
 * @returns {string} - ID de la empresa o "default" si no existe
 */
export const getCompanyId = () => {
  try {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}")
    return user.companyId || "default"
  } catch (error) {
    console.error("Error al obtener ID de empresa:", error)
    return "default"
  }
}

/**
 * Función para inicializar datos de ejemplo si no existen
 */
export const initializeDefaultData = () => {
  // Verificar si ya hay datos
  const positions = baseStorageService.getData(STORAGE_KEYS.POSITIONS)
  const workers = baseStorageService.getData(STORAGE_KEYS.WORKERS)

  // Si no hay posiciones, crear algunas por defecto
  if (positions.length === 0) {
    // Obtener el ID de empresa del usuario actual si existe
    const companyId = getCompanyId()

    baseStorageService.setData(STORAGE_KEYS.POSITIONS, [
      {
        id: "pos1",
        name: "Recepción",
        location: "Oficina Principal",
        companyId,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "pos2",
        name: "Furgoneta A",
        location: "Móvil",
        companyId,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "pos3",
        name: "Cafetería",
        location: "Planta Baja",
        companyId,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
    ])
  } else {
    // Actualizar posiciones existentes para añadir companyId y isDeleted si no los tienen
    const updatedPositions = positions.map((position) => {
      const updates = {}
      if (!position.companyId) {
        updates.companyId = "company1"
      }
      if (position.isDeleted === undefined) {
        updates.isDeleted = false
      }
      if (position.createdAt === undefined) {
        updates.createdAt = new Date().toISOString()
      }

      return { ...position, ...updates }
    })
    baseStorageService.setData(STORAGE_KEYS.POSITIONS, updatedPositions)
  }

  // Si no hay trabajadores, crear algunos por defecto
  if (workers.length === 0) {
    baseStorageService.setData(STORAGE_KEYS.WORKERS, [
      {
        id: "w1",
        name: "Ana García",
        email: "ana@empresa.com",
        position: "Recepción",
        companyId: "company1",
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "w2",
        name: "Carlos López",
        email: "carlos@empresa.com",
        position: "Furgoneta A",
        companyId: "company1",
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: "w3",
        name: "Elena Martín",
        email: "elena@empresa.com",
        position: "Cafetería",
        companyId: "company1",
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
    ])
  } else {
    // Actualizar trabajadores existentes para añadir companyId y isDeleted si no los tienen
    const updatedWorkers = workers.map((worker) => {
      const updates = {}
      if (!worker.companyId) {
        updates.companyId = "company1"
      }
      if (worker.isDeleted === undefined) {
        updates.isDeleted = false
      }
      if (worker.createdAt === undefined) {
        updates.createdAt = new Date().toISOString()
      }

      return { ...worker, ...updates }
    })
    baseStorageService.setData(STORAGE_KEYS.WORKERS, updatedWorkers)
  }
}

// Exportar todos los servicios y funciones de baseStorageService
export const storageService = {
  ...baseStorageService,
  positionService,
  workerService,
  clockRecordService,
  absenceRequestService,
  userSettingsService,
  initializeDefaultData,
  STORAGE_KEYS,
  getItem,
  setItem,
  getAllItems,
  getCompanyId,
}

// Exportar servicios individuales para facilitar las importaciones
export {
  STORAGE_KEYS,
  positionService,
  workerService,
  clockRecordService,
  absenceRequestService,
  userSettingsService,
  baseStorageService,
  getData,
  setData,
  addItem,
  updateItem,
  removeItem,
  getItemById,
  getActiveItems,
  getDeletedItems,
  softDelete,
  restoreItem,
  permanentDelete,
  clearData,
  getDeleteHistory,
  clearDeleteHistory,
}
