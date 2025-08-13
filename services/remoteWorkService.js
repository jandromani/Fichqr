/**
 * Servicio para gestionar información adicional de teletrabajo
 * Proporciona funciones para obtener datos de trazabilidad para fichajes remotos
 */

/**
 * Obtiene información sobre la conexión remota del usuario
 * @returns {Promise<Object>} - Información de la conexión remota
 */
export const getRemoteWorkInfo = async () => {
  try {
    // Obtener la IP pública del usuario mediante un servicio externo
    const ipResponse = await fetch("https://api.ipify.org?format=json").catch(() => ({
      json: () => ({ ip: "unknown" }),
    }))

    const ipData = await ipResponse.json()

    // Intentar obtener información de geolocalización aproximada basada en IP
    // Nota: En una implementación real, esto se haría en el servidor para mayor precisión
    let ipLocation = "No disponible"
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`).catch(() => null)

      if (geoResponse && geoResponse.ok) {
        const geoData = await geoResponse.json()
        ipLocation = `${geoData.city || ""}, ${geoData.region || ""}, ${geoData.country_name || ""}`
          .replace(/, ,/g, ",")
          .replace(/^,|,$/g, "")
      }
    } catch (error) {
      console.error("Error al obtener la geolocalización por IP:", error)
    }

    // Recopilar información adicional del navegador
    const connectionInfo = {
      ip: ipData.ip,
      ipLocation,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      connectionType: getConnectionType(),
    }

    return connectionInfo
  } catch (error) {
    console.error("Error al obtener información de teletrabajo:", error)

    // Devolver información básica en caso de error
    return {
      ip: "unknown",
      ipLocation: "No disponible",
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      error: error.message,
    }
  }
}

/**
 * Obtiene el tipo de conexión del usuario si está disponible
 * @returns {string} - Tipo de conexión
 */
const getConnectionType = () => {
  if (navigator.connection) {
    return navigator.connection.effectiveType || "unknown"
  }
  return "not available"
}

/**
 * Verifica si la conexión es segura
 * @returns {boolean} - true si la conexión es segura (HTTPS)
 */
export const isSecureConnection = () => {
  return window.location.protocol === "https:"
}

/**
 * Registra un evento de actividad durante el teletrabajo
 * @param {string} userId - ID del usuario
 * @param {string} eventType - Tipo de evento
 * @param {Object} eventData - Datos del evento
 * @returns {boolean} - true si se registró correctamente
 */
export const logRemoteWorkActivity = (userId, eventType, eventData = {}) => {
  try {
    // Obtener eventos existentes o inicializar array
    const existingEvents = JSON.parse(localStorage.getItem("remoteWorkActivity") || "[]")

    // Crear nuevo evento
    const newEvent = {
      id: `event_${Date.now()}`,
      userId,
      eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
    }

    // Añadir al historial
    existingEvents.push(newEvent)

    // Guardar en localStorage
    localStorage.setItem("remoteWorkActivity", JSON.stringify(existingEvents))

    return true
  } catch (error) {
    console.error("Error al registrar actividad de teletrabajo:", error)
    return false
  }
}

/**
 * Obtiene el historial de actividad de teletrabajo de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Array} - Historial de actividad
 */
export const getRemoteWorkActivityHistory = (userId) => {
  try {
    const allEvents = JSON.parse(localStorage.getItem("remoteWorkActivity") || "[]")
    return allEvents.filter((event) => event.userId === userId)
  } catch (error) {
    console.error("Error al obtener historial de actividad de teletrabajo:", error)
    return []
  }
}
