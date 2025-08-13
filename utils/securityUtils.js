/**
 * Utilidades de seguridad para la aplicación
 */

/**
 * Sanitiza una cadena de texto para prevenir ataques XSS
 * @param {string} input - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== "string") return ""

  // Reemplazar caracteres especiales con entidades HTML
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

/**
 * Valida un correo electrónico
 * @param {string} email - Correo electrónico a validar
 * @returns {boolean} - true si es válido, false si no
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== "string") return false

  // Expresión regular para validar emails
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Valida un número de teléfono (formato español)
 * @param {string} phone - Número de teléfono a validar
 * @returns {boolean} - true si es válido, false si no
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== "string") return false

  // Eliminar espacios y guiones
  const cleanPhone = phone.replace(/[\s-]/g, "")

  // Expresión regular para validar teléfonos españoles
  const phoneRegex = /^(?:(?:\+|00)34)?[6789]\d{8}$/
  return phoneRegex.test(cleanPhone)
}

/**
 * Valida una contraseña según criterios de seguridad
 * @param {string} password - Contraseña a validar
 * @returns {Object} - Objeto con resultado y mensaje
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "La contraseña es requerida" }
  }

  if (password.length < 8) {
    return { valid: false, message: "La contraseña debe tener al menos 8 caracteres" }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "La contraseña debe incluir al menos una letra minúscula" }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "La contraseña debe incluir al menos una letra mayúscula" }
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: "La contraseña debe incluir al menos un número" }
  }

  return { valid: true, message: "Contraseña válida" }
}

/**
 * Valida una fecha
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {boolean} - true si es válida, false si no
 */
export const validateDate = (date) => {
  if (!date || typeof date !== "string") return false

  // Expresión regular para validar formato YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) return false

  // Verificar que la fecha sea válida
  const parsedDate = new Date(date)
  return !isNaN(parsedDate.getTime())
}

/**
 * Genera un token de seguridad para proteger contra CSRF
 * @returns {string} - Token generado
 */
export const generateCSRFToken = () => {
  // En una implementación real, esto se generaría en el servidor
  // Aquí simulamos un token aleatorio
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Verifica si un usuario tiene permiso para una acción
 * @param {Object} user - Usuario actual
 * @param {string} action - Acción a verificar
 * @param {Object} resource - Recurso sobre el que se realiza la acción
 * @returns {boolean} - true si tiene permiso, false si no
 */
export const hasPermission = (user, action, resource) => {
  if (!user) return false

  // Verificar si el usuario es administrador (tiene todos los permisos)
  if (user.role === "admin") return true

  // Verificar permisos según el rol y la acción
  switch (user.role) {
    case "employer":
      // El empleador puede realizar todas las acciones excepto algunas específicas
      return true
    case "worker":
      // El trabajador solo puede realizar acciones sobre sus propios recursos
      if (resource && resource.userId !== user.id) {
        return false
      }

      // Acciones permitidas para trabajadores
      const allowedWorkerActions = [
        "view_profile",
        "edit_profile",
        "change_password",
        "clock_in",
        "clock_out",
        "view_own_records",
        "create_vacation_request",
        "view_own_vacation_requests",
      ]

      return allowedWorkerActions.includes(action)
    default:
      return false
  }
}

/**
 * Protege contra manipulación de estado verificando la integridad de los datos
 * @param {Object} state - Estado actual
 * @param {Object} user - Usuario actual
 * @returns {Object} - Estado verificado y posiblemente corregido
 */
export const protectState = (state, user) => {
  if (!state || !user) return state

  // Copia profunda del estado para no modificar el original
  const protectedState = JSON.parse(JSON.stringify(state))

  // Verificar y corregir posibles manipulaciones según el rol
  if (user.role === "worker") {
    // Un trabajador no debería tener acceso a datos de otros trabajadores
    if (protectedState.workers) {
      protectedState.workers = protectedState.workers.filter((w) => w.id === user.id)
    }

    // Un trabajador no debería tener acceso a todas las solicitudes de vacaciones
    if (protectedState.vacationRequests) {
      protectedState.vacationRequests = protectedState.vacationRequests.filter((r) => r.employeeId === user.id)
    }
  }

  return protectedState
}

// Crear un objeto que contenga todas las funciones
export const securityUtils = {
  sanitizeInput,
  validateEmail,
  validatePhone,
  validatePassword,
  validateDate,
  generateCSRFToken,
  hasPermission,
  protectState,
}

// Exportar por defecto para mantener compatibilidad
export default securityUtils
