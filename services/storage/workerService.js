/**
 * Servicio para gestionar trabajadores
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

// Funciones específicas para trabajadores
export const workerService = {
  getAll: () => getActiveItems(STORAGE_KEYS.WORKERS),
  getAllWithDeleted: () => getData(STORAGE_KEYS.WORKERS),
  getDeleted: () => getDeletedItems(STORAGE_KEYS.WORKERS),
  getById: (id) => getItemById(STORAGE_KEYS.WORKERS, id),
  add: (worker, user = null) => {
    // Asegurarse de que el trabajador tenga un companyId
    if (!worker.companyId) {
      const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}")
      worker.companyId = currentUser.companyId || "unknown"
    }
    return addItem(STORAGE_KEYS.WORKERS, worker, user)
  },
  update: (id, updates, user = null) => updateItem(STORAGE_KEYS.WORKERS, id, updates, user),
  remove: (id, user) => removeItem(STORAGE_KEYS.WORKERS, id, user),
  restore: (id, user) => restoreItem(STORAGE_KEYS.WORKERS, id, user),
  permanentDelete: (id, user) => permanentDelete(STORAGE_KEYS.WORKERS, id, user),
  getByCompanyId: (companyId) => {
    const workers = getActiveItems(STORAGE_KEYS.WORKERS)
    return workers.filter((worker) => worker.companyId === companyId)
  },
}
