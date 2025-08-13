/**
 * Punto de entrada para los services de almacenamiento
 * Exporta todos los servicios específicos y funciones de inicialización
 */

import { STORAGE_KEYS } from "./constants"
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
} from "./baseStorage"
import { positionService } from "./positionService"
import { workerService } from "./workerService"
import { clockRecordService } from "./clockRecordService"
import { absenceRequestService } from "./absenceRequestService"
import { userSettingsService } from "./userSettingsService"

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
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}")
    const companyId = user.companyId || "company1"

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
