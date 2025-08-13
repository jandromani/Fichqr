/**
 * Servicio base para operaciones de almacenamiento
 * Proporciona funciones CRUD genéricas para localStorage
 */

import { addAuditLogEntry } from "../auditLogService"
import { STORAGE_KEYS } from "./constants"

/**
 * Obtiene datos de localStorage para una clave específica
 * @param {string} key - Clave de almacenamiento
 * @param {any} defaultValue - Valor por defecto si no existe la clave
 * @returns {any} - Datos almacenados o valor por defecto
 */
export const getData = (key, defaultValue = []) => {
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
export const setData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error al guardar datos en ${key}:`, error)
  }
}

/**
 * Añade un elemento a una colección en localStorage
 * @param {string} key - Clave de almacenamiento
 * @param {object} item - Elemento a añadir
 * @param {object} user - Usuario que realiza la acción
 * @returns {object} - Elemento añadido
 */
export const addItem = (key, item, user = null) => {
  try {
    const data = getData(key)

    // Añadir metadatos de creación
    const itemWithMetadata = {
      ...item,
      createdAt: item.createdAt || new Date().toISOString(),
      isDeleted: false,
    }

    data.push(itemWithMetadata)
    setData(key, data)

    // Registrar la acción en el log de auditoría
    if (user) {
      addAuditLogEntry(
        `create${key.charAt(0).toUpperCase() + key.slice(1, -1)}`,
        user.id,
        itemWithMetadata.id,
        "storageService",
        {
          userName: user.name,
          itemType: key,
          itemData: { ...itemWithMetadata },
        },
      )
    }

    return itemWithMetadata
  } catch (error) {
    console.error(`Error al añadir elemento a ${key}:`, error)
    return null
  }
}

/**
 * Actualiza un elemento en una colección en localStorage
 * @param {string} key - Clave de almacenamiento
 * @param {string} id - ID del elemento a actualizar
 * @param {object} updates - Actualizaciones a aplicar
 * @param {object} user - Usuario que realiza la acción
 * @returns {boolean} - true si se actualizó correctamente
 */
export const updateItem = (key, id, updates, user = null) => {
  try {
    const data = getData(key)
    const index = data.findIndex((item) => item.id === id)

    if (index === -1) return false

    // No permitir actualizar elementos eliminados
    if (data[index].isDeleted) {
      console.warn(`Intento de actualizar elemento eliminado en ${key} con ID ${id}`)

      // Registrar intento de actualización de elemento eliminado
      if (user) {
        addAuditLogEntry("updateDeletedItem", user.id, id, "storageService", {
          userName: user.name,
          itemType: key,
          attempted: true,
          success: false,
          reason: "Item is deleted",
        })
      }

      return false
    }

    // Guardar una copia del elemento original antes de actualizarlo
    const originalItem = { ...data[index] }

    // Añadir metadatos de actualización
    data[index] = {
      ...data[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    setData(key, data)

    // Registrar la acción en el log de auditoría
    if (user) {
      addAuditLogEntry(`update${key.charAt(0).toUpperCase() + key.slice(1, -1)}`, user.id, id, "storageService", {
        userName: user.name,
        itemType: key,
        before: originalItem,
        after: data[index],
        changes: Object.keys(updates),
      })
    }

    return true
  } catch (error) {
    console.error(`Error al actualizar elemento en ${key}:`, error)
    return false
  }
}

/**
 * Marca un elemento como eliminado en lugar de borrarlo físicamente (soft delete)
 * @param {string} key - Clave de almacenamiento
 * @param {string} id - ID del elemento a eliminar
 * @param {Object} user - Usuario que realiza la eliminación
 * @returns {boolean} - true si se marcó correctamente
 */
export const softDelete = (key, id, user) => {
  try {
    // Obtener los datos actuales
    const data = getData(key)

    // Buscar el elemento
    const index = data.findIndex((item) => item.id === id)

    if (index === -1) {
      return false
    }

    // Marcar como eliminado
    data[index] = {
      ...data[index],
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : "unknown",
    }

    // Guardar los datos actualizados
    setData(key, data)

    // Registrar la eliminación en el historial
    registerDeleteAction(key, data[index], user)

    return true
  } catch (error) {
    console.error(`Error al realizar soft delete en ${key}:`, error)
    return false
  }
}

/**
 * Restaura un elemento previamente marcado como eliminado
 * @param {string} key - Clave de almacenamiento
 * @param {string} id - ID del elemento a restaurar
 * @param {Object} user - Usuario que realiza la restauración
 * @returns {boolean} - true si se restauró correctamente
 */
export const restoreItem = (key, id, user) => {
  try {
    // Obtener los datos actuales
    const data = getData(key)

    // Buscar el elemento
    const index = data.findIndex((item) => item.id === id)

    if (index === -1) {
      return false
    }

    // Verificar que esté marcado como eliminado
    if (!data[index].isDeleted) {
      return false
    }

    // Restaurar el elemento
    const { isDeleted, deletedAt, deletedBy, ...restoredItem } = data[index]

    // Añadir información de restauración
    data[index] = {
      ...restoredItem,
      restoredAt: new Date().toISOString(),
      restoredBy: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : "unknown",
    }

    // Guardar los datos actualizados
    setData(key, data)

    // Registrar la restauración en el historial
    registerRestoreAction(key, data[index], user)

    return true
  } catch (error) {
    console.error(`Error al restaurar elemento en ${key}:`, error)
    return false
  }
}

/**
 * Elimina un elemento de una colección en localStorage (ahora usa soft delete)
 * @param {string} key - Clave de almacenamiento
 * @param {string} id - ID del elemento a eliminar
 * @param {Object} user - Usuario que realiza la eliminación
 * @returns {boolean} - true si se eliminó correctamente
 */
export const removeItem = (key, id, user) => {
  // Registrar la acción en el log de auditoría antes de eliminar
  if (user) {
    const item = getItemById(key, id)
    if (item) {
      addAuditLogEntry(`delete${key.charAt(0).toUpperCase() + key.slice(1, -1)}`, user.id, id, "storageService", {
        userName: user.name,
        itemType: key,
        itemData: { ...item },
      })
    }
  }

  // Usar soft delete en lugar de eliminación física
  return softDelete(key, id, user)
}

/**
 * Obtiene un elemento específico por ID
 * @param {string} key - Clave de almacenamiento
 * @param {string} id - ID del elemento a obtener
 * @returns {object|null} - Elemento encontrado o null
 */
export const getItemById = (key, id) => {
  try {
    const data = getData(key)
    const item = data.find((item) => item.id === id)

    // No devolver elementos marcados como eliminados
    if (item && item.isDeleted) {
      return null
    }

    return item || null
  } catch (error) {
    console.error(`Error al obtener elemento de ${key}:`, error)
    return null
  }
}

/**
 * Obtiene todos los elementos no eliminados (activos)
 * @param {string} key - Clave de almacenamiento
 * @returns {Array} - Array de elementos activos
 */
export const getActiveItems = (key) => {
  try {
    const data = getData(key)
    return data.filter((item) => item.isDeleted !== true)
  } catch (error) {
    console.error(`Error al obtener elementos activos de ${key}:`, error)
    return []
  }
}

/**
 * Obtiene todos los elementos marcados como eliminados
 * @param {string} key - Clave de almacenamiento
 * @returns {Array} - Array de elementos eliminados
 */
export const getDeletedItems = (key) => {
  try {
    const data = getData(key)
    return data.filter((item) => item.isDeleted === true)
  } catch (error) {
    console.error(`Error al obtener elementos eliminados de ${key}:`, error)
    return []
  }
}

/**
 * Elimina permanentemente un elemento (solo debe usarse en casos excepcionales)
 * @param {string} key - Clave de almacenamiento
 * @param {string} id - ID del elemento a eliminar permanentemente
 * @param {Object} user - Usuario que realiza la eliminación
 * @returns {boolean} - true si se eliminó correctamente
 */
export const permanentDelete = (key, id, user) => {
  try {
    // Obtener los datos actuales
    const data = getData(key)

    // Buscar el elemento para registrar la eliminación permanente
    const item = data.find((item) => item.id === id)

    if (!item) {
      return false
    }

    // Filtrar el elemento
    const filteredData = data.filter((item) => item.id !== id)

    // Guardar los datos actualizados
    setData(key, filteredData)

    // Registrar la eliminación permanente en el historial
    registerPermanentDeleteAction(key, item, user)

    return true
  } catch (error) {
    console.error(`Error al eliminar permanentemente elemento de ${key}:`, error)
    return false
  }
}

/**
 * Limpia todos los datos de una colección
 * @param {string} key - Clave de almacenamiento
 * @param {Object} user - Usuario que realiza la limpieza
 */
export const clearData = (key, user) => {
  try {
    // Antes de limpiar, hacer una copia de seguridad
    const dataBackup = getData(key)
    setData(`${key}_backup_${Date.now()}`, {
      data: dataBackup,
      clearedAt: new Date().toISOString(),
      clearedBy: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : "unknown",
    })

    // Registrar la acción en el log de auditoría
    if (user) {
      addAuditLogEntry(`clear${key.charAt(0).toUpperCase() + key.slice(1)}`, user.id, key, "storageService", {
        userName: user.name,
        itemType: key,
        itemCount: dataBackup.length,
        backupCreated: true,
      })
    }

    // Ahora sí, limpiar los datos
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error al limpiar datos de ${key}:`, error)
  }
}

/**
 * Registra una acción de eliminación en el historial
 * @param {string} key - Clave de almacenamiento
 * @param {Object} item - Elemento eliminado
 * @param {Object} user - Usuario que realizó la acción
 */
const registerDeleteAction = (key, item, user) => {
  try {
    // Obtener el historial actual
    const deleteHistory = getData("deleteHistory", [])

    // Añadir la acción al historial
    deleteHistory.push({
      id: `del_${Date.now()}`,
      action: "soft_delete",
      storageKey: key,
      itemId: item.id,
      itemType: getItemType(key),
      itemName: getItemName(item, key),
      timestamp: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : "unknown",
    })

    // Guardar el historial actualizado
    setData("deleteHistory", deleteHistory)
  } catch (error) {
    console.error("Error al registrar acción de eliminación:", error)
  }
}

/**
 * Registra una acción de restauración en el historial
 * @param {string} key - Clave de almacenamiento
 * @param {Object} item - Elemento restaurado
 * @param {Object} user - Usuario que realizó la acción
 */
const registerRestoreAction = (key, item, user) => {
  try {
    // Obtener el historial actual
    const deleteHistory = getData("deleteHistory", [])

    // Añadir la acción al historial
    deleteHistory.push({
      id: `res_${Date.now()}`,
      action: "restore",
      storageKey: key,
      itemId: item.id,
      itemType: getItemType(key),
      itemName: getItemName(item, key),
      timestamp: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : "unknown",
    })

    // Guardar el historial actualizado
    setData("deleteHistory", deleteHistory)
  } catch (error) {
    console.error("Error al registrar acción de restauración:", error)
  }
}

/**
 * Registra una acción de eliminación permanente en el historial
 * @param {string} key - Clave de almacenamiento
 * @param {Object} item - Elemento eliminado permanentemente
 * @param {Object} user - Usuario que realizó la acción
 */
const registerPermanentDeleteAction = (key, item, user) => {
  try {
    // Obtener el historial actual
    const deleteHistory = getData("deleteHistory", [])

    // Añadir la acción al historial
    deleteHistory.push({
      id: `perm_${Date.now()}`,
      action: "permanent_delete",
      storageKey: key,
      itemId: item.id,
      itemType: getItemType(key),
      itemName: getItemName(item, key),
      timestamp: new Date().toISOString(),
      user: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : "unknown",
    })

    // Guardar el historial actualizado
    setData("deleteHistory", deleteHistory)
  } catch (error) {
    console.error("Error al registrar acción de eliminación permanente:", error)
  }
}

/**
 * Obtiene el tipo de elemento según la clave de almacenamiento
 * @param {string} key - Clave de almacenamiento
 * @returns {string} - Tipo de elemento
 */
const getItemType = (key) => {
  switch (key) {
    case STORAGE_KEYS.POSITIONS:
      return "position"
    case STORAGE_KEYS.WORKERS:
      return "worker"
    case STORAGE_KEYS.CLOCK_RECORDS:
      return "clock_record"
    case STORAGE_KEYS.ABSENCE_REQUESTS:
      return "absence_request"
    default:
      return "unknown"
  }
}

/**
 * Obtiene un nombre descriptivo del elemento según su tipo
 * @param {Object} item - Elemento
 * @param {string} key - Clave de almacenamiento
 * @returns {string} - Nombre descriptivo
 */
const getItemName = (item, key) => {
  switch (key) {
    case STORAGE_KEYS.POSITIONS:
      return item.name || `Puesto ${item.id}`
    case STORAGE_KEYS.WORKERS:
      return item.name || `Trabajador ${item.id}`
    case STORAGE_KEYS.CLOCK_RECORDS:
      return `Fichaje ${item.id} (${item.userName || "Desconocido"})`
    case STORAGE_KEYS.ABSENCE_REQUESTS:
      return `Solicitud ${item.id} (${item.employeeName || "Desconocido"})`
    default:
      return `Elemento ${item.id}`
  }
}

/**
 * Obtiene el historial de eliminaciones y restauraciones
 * @returns {Array} - Historial de acciones
 */
export const getDeleteHistory = () => {
  return getData("deleteHistory", [])
}

/**
 * Limpia el historial de eliminaciones y restauraciones
 * @param {Object} user - Usuario que realiza la limpieza
 * @returns {boolean} - true si se limpió correctamente
 */
export const clearDeleteHistory = (user) => {
  try {
    // Guardar una copia del historial antes de limpiarlo
    const oldHistory = getData("deleteHistory", [])
    setData("deleteHistoryBackup", {
      history: oldHistory,
      clearedAt: new Date().toISOString(),
      clearedBy: user
        ? {
            id: user.id,
            name: user.name,
            role: user.role,
          }
        : "unknown",
    })

    // Limpiar el historial
    setData("deleteHistory", [])

    return true
  } catch (error) {
    console.error("Error al limpiar historial de eliminaciones:", error)
    return false
  }
}

// Exportar como objeto para facilitar importaciones
export const baseStorageService = {
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
