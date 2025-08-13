// Archivo de exportación centralizada de utilidades
// Facilita las importaciones y evita la duplicación de código

import { sanitizeInput } from "./securityUtils"

// Exportar funciones de utilidad
export { sanitizeInput }

// Utilidades de fecha y hora
export const dateUtils = {
  // Formatear fecha en formato local
  formatDate: (date, options = {}) => {
    if (!date) return ""
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleDateString(undefined, options)
  },

  // Formatear hora en formato local
  formatTime: (date, options = {}) => {
    if (!date) return ""
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleTimeString(undefined, options)
  },

  // Formatear fecha y hora en formato local
  formatDateTime: (date, options = {}) => {
    if (!date) return ""
    const dateObj = typeof date === "string" ? new Date(date) : date
    return dateObj.toLocaleString(undefined, options)
  },

  // Calcular duración entre dos fechas en minutos
  calculateDurationMinutes: (startDate, endDate) => {
    if (!startDate || !endDate) return 0
    const start = typeof startDate === "string" ? new Date(startDate) : startDate
    const end = typeof endDate === "string" ? new Date(endDate) : endDate
    return Math.round((end - start) / 60000)
  },

  // Calcular duración entre dos fechas en formato legible
  formatDuration: (startDate, endDate) => {
    const minutes = dateUtils.calculateDurationMinutes(startDate, endDate)
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}min`
  },
}

// Utilidades de validación
export const validationUtils = {
  // Validar email
  isValidEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(String(email).toLowerCase())
  },

  // Validar contraseña (mínimo 8 caracteres, al menos una letra y un número)
  isValidPassword: (password) => {
    const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/
    return re.test(String(password))
  },

  // Validar que un string no esté vacío
  isNotEmpty: (str) => {
    return str && str.trim() !== ""
  },
}

// Utilidades de formato
export const formatUtils = {
  // Formatear número con separador de miles
  formatNumber: (number, decimals = 0) => {
    return Number(number).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  },

  // Truncar texto con ellipsis
  truncateText: (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text
    return `${text.substring(0, maxLength)}...`
  },

  // Convertir primera letra a mayúscula
  capitalize: (text) => {
    if (!text) return ""
    return text.charAt(0).toUpperCase() + text.slice(1)
  },
}

// Utilidades de dispositivo
export const deviceUtils = {
  // Detectar si es dispositivo móvil
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  },

  // Detectar si es tablet
  isTablet: () => {
    return /(iPad|Android(?!.*Mobile)|Tablet)/i.test(navigator.userAgent)
  },

  // Detectar si es dispositivo de escritorio
  isDesktop: () => {
    return !deviceUtils.isMobile() && !deviceUtils.isTablet()
  },

  // Obtener información del dispositivo
  getDeviceInfo: () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
    }
  },
}
