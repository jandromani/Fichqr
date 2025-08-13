/**
 * Servicio para gestionar posiciones/puestos de trabajo
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

// Funciones específicas para posiciones
export const positionService = {
  getAll: () => getActiveItems(STORAGE_KEYS.POSITIONS),
  getAllWithDeleted: () => getData(STORAGE_KEYS.POSITIONS),
  getDeleted: () => getDeletedItems(STORAGE_KEYS.POSITIONS),
  getById: (id) => getItemById(STORAGE_KEYS.POSITIONS, id),
  add: (position, user = null) => {
    // Asegurarse de que el puesto tenga un companyId
    if (!position.companyId) {
      const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "{}")
      position.companyId = currentUser.companyId || "unknown"
    }
    return addItem(STORAGE_KEYS.POSITIONS, position, user)
  },
  update: (id, updates, user = null) => updateItem(STORAGE_KEYS.POSITIONS, id, updates, user),
  remove: (id, user) => removeItem(STORAGE_KEYS.POSITIONS, id, user),
  restore: (id, user) => restoreItem(STORAGE_KEYS.POSITIONS, id, user),
  permanentDelete: (id, user) => permanentDelete(STORAGE_KEYS.POSITIONS, id, user),
  getByCompanyId: (companyId) => {
    const positions = getActiveItems(STORAGE_KEYS.POSITIONS)
    return positions.filter((position) => position.companyId === companyId)
  },
}
