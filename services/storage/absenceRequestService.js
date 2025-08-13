/**
 * Servicio para gestionar solicitudes de ausencia
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
import { addAuditLogEntry } from "../auditLogService"

// Funciones específicas para solicitudes de ausencia
export const absenceRequestService = {
  getAll: () => getActiveItems(STORAGE_KEYS.ABSENCE_REQUESTS),
  getAllWithDeleted: () => getData(STORAGE_KEYS.ABSENCE_REQUESTS),
  getDeleted: () => getDeletedItems(STORAGE_KEYS.ABSENCE_REQUESTS),
  getByUserId: (userId) => {
    const requests = getActiveItems(STORAGE_KEYS.ABSENCE_REQUESTS)
    return requests.filter((request) => request.employeeId === userId)
  },
  getPending: () => {
    const requests = getActiveItems(STORAGE_KEYS.ABSENCE_REQUESTS)
    return requests.filter((request) => request.status === "pending")
  },
  add: (request, user = null) => addItem(STORAGE_KEYS.ABSENCE_REQUESTS, request, user),
  update: (id, updates, user = null) => updateItem(STORAGE_KEYS.ABSENCE_REQUESTS, id, updates, user),
  remove: (id, user) => removeItem(STORAGE_KEYS.ABSENCE_REQUESTS, id, user),
  restore: (id, user) => restoreItem(STORAGE_KEYS.ABSENCE_REQUESTS, id, user),
  permanentDelete: (id, user) => permanentDelete(STORAGE_KEYS.ABSENCE_REQUESTS, id, user),

  // Funciones específicas para aprobar/rechazar
  approve: (id, approverName, comment, user = null) => {
    const now = new Date()

    // Registrar la acción en el log de auditoría
    if (user) {
      const request = getItemById(STORAGE_KEYS.ABSENCE_REQUESTS, id)
      if (request) {
        addAuditLogEntry("approveAbsenceRequest", user.id, id, "absenceRequestService", {
          userName: user.name,
          approverName,
          requestType: request.type,
          employeeId: request.employeeId,
          employeeName: request.employeeName,
          comment,
        })
      }
    }

    return updateItem(
      STORAGE_KEYS.ABSENCE_REQUESTS,
      id,
      {
        status: "approved",
        approvedAt: now,
        approvedBy: approverName,
        approvalComment: comment || "Solicitud aprobada",
      },
      user,
    )
  },

  reject: (id, approverName, reason, user = null) => {
    const now = new Date()

    // Registrar la acción en el log de auditoría
    if (user) {
      const request = getItemById(STORAGE_KEYS.ABSENCE_REQUESTS, id)
      if (request) {
        addAuditLogEntry("rejectAbsenceRequest", user.id, id, "absenceRequestService", {
          userName: user.name,
          approverName,
          requestType: request.type,
          employeeId: request.employeeId,
          employeeName: request.employeeName,
          reason,
        })
      }
    }

    return updateItem(
      STORAGE_KEYS.ABSENCE_REQUESTS,
      id,
      {
        status: "rejected",
        rejectedAt: now,
        rejectedBy: approverName,
        rejectionReason: reason,
      },
      user,
    )
  },
}
