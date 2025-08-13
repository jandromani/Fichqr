/**
 * Servicio para gestionar configuración de usuario
 */

import { STORAGE_KEYS } from "./constants"
import { getData, setData } from "./baseStorage"
import { addAuditLogEntry } from "../auditLogService"

// Funciones específicas para configuración de usuario
export const userSettingsService = {
  get: () => getData(STORAGE_KEYS.USER_SETTINGS, {}),
  update: (settings, user = null) => {
    setData(STORAGE_KEYS.USER_SETTINGS, settings)

    // Registrar la acción en el log de auditoría
    if (user) {
      addAuditLogEntry("updateUserSettings", user.id, "userSettings", "userSettingsService", {
        userName: user.name,
        settings: { ...settings },
      })
    }

    return true
  },
}
