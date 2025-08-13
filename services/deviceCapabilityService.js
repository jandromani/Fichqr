/**
 * Servicio para detectar las capacidades del dispositivo
 * y determinar si es de gama baja
 */

// Umbrales para considerar un dispositivo de gama baja
const THRESHOLDS = {
  RAM_LOW: 2, // GB
  CPU_CORES_LOW: 4,
  STORAGE_LOW: 1, // GB
  BATTERY_LOW: 20, // %
  CONNECTION_SLOW: 0.5, // Mbps
}

/**
 * Detecta si el dispositivo es de gama baja basado en sus capacidades
 * @returns {Object} Objeto con información sobre las capacidades del dispositivo
 */
export const detectLowEndDevice = () => {
  const capabilities = {
    isLowEndDevice: false,
    isLowMemory: false,
    isLowCPU: false,
    isLowStorage: false,
    isLowBattery: false,
    isSlowConnection: false,
    isMobile: false,
    details: {},
  }

  try {
    // Detectar si es un dispositivo móvil
    capabilities.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    capabilities.details.userAgent = navigator.userAgent

    // Detectar memoria disponible (si está disponible la API)
    if (navigator.deviceMemory) {
      capabilities.details.memory = navigator.deviceMemory
      capabilities.isLowMemory = navigator.deviceMemory < THRESHOLDS.RAM_LOW
    }

    // Detectar número de núcleos de CPU
    if (navigator.hardwareConcurrency) {
      capabilities.details.cpuCores = navigator.hardwareConcurrency
      capabilities.isLowCPU = navigator.hardwareConcurrency < THRESHOLDS.CPU_CORES_LOW
    }

    // Detectar almacenamiento disponible
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const storageGB = estimate.quota / (1024 * 1024 * 1024)
        capabilities.details.storageQuota = storageGB.toFixed(2) + " GB"
        capabilities.details.storageUsage = ((estimate.usage / estimate.quota) * 100).toFixed(2) + "%"
        capabilities.isLowStorage = storageGB < THRESHOLDS.STORAGE_LOW
      })
    }

    // Detectar nivel de batería
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        capabilities.details.batteryLevel = (battery.level * 100).toFixed(2) + "%"
        capabilities.isLowBattery = battery.level * 100 < THRESHOLDS.BATTERY_LOW && !battery.charging
      })
    }

    // Detectar velocidad de conexión
    if (navigator.connection) {
      capabilities.details.connectionType = navigator.connection.effectiveType
      capabilities.details.saveData = navigator.connection.saveData ? "Activado" : "Desactivado"

      if (navigator.connection.downlink) {
        capabilities.details.connectionSpeed = navigator.connection.downlink + " Mbps"
        capabilities.isSlowConnection = navigator.connection.downlink < THRESHOLDS.CONNECTION_SLOW
      }
    }

    // Determinar si es un dispositivo de gama baja basado en múltiples factores
    capabilities.isLowEndDevice =
      capabilities.isLowMemory ||
      capabilities.isLowCPU ||
      capabilities.isLowStorage ||
      (capabilities.isLowBattery && capabilities.isSlowConnection) ||
      (capabilities.isMobile && (capabilities.isLowMemory || capabilities.isLowCPU))

    // Añadir información sobre el navegador y la plataforma
    capabilities.details.platform = navigator.platform
    capabilities.details.screenSize = `${window.screen.width}x${window.screen.height}`
    capabilities.details.pixelRatio = window.devicePixelRatio

    // Detectar si el navegador tiene soporte para características modernas
    capabilities.details.supportsWebWorkers = typeof Worker !== "undefined"
    capabilities.details.supportsIndexedDB = typeof indexedDB !== "undefined"
    capabilities.details.supportsServiceWorker = "serviceWorker" in navigator

    return capabilities
  } catch (error) {
    console.error("Error al detectar capacidades del dispositivo:", error)
    // En caso de error, asumir que no es un dispositivo de gama baja para evitar restricciones innecesarias
    return { isLowEndDevice: false, error: error.message }
  }
}

/**
 * Obtiene una estimación del espacio disponible en localStorage
 * @returns {Object} Información sobre el espacio utilizado y disponible
 */
export const getLocalStorageUsage = () => {
  try {
    let totalSize = 0
    let itemCount = 0
    const items = {}

    // Calcular el tamaño total y por clave
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      const size = (key.length + value.length) * 2 // Aproximación en bytes (2 bytes por carácter en UTF-16)

      totalSize += size
      itemCount++
      items[key] = {
        size: (size / 1024).toFixed(2) + " KB",
        sizeBytes: size,
      }
    }

    // Estimar el espacio máximo (varía según el navegador, pero 5MB es común)
    const estimatedMaxSize = 5 * 1024 * 1024 // 5MB en bytes
    const usedPercentage = (totalSize / estimatedMaxSize) * 100

    return {
      totalSize: (totalSize / 1024).toFixed(2) + " KB",
      totalSizeBytes: totalSize,
      itemCount,
      usedPercentage: usedPercentage.toFixed(2) + "%",
      estimatedMaxSize: "5 MB",
      items,
      isNearLimit: usedPercentage > 80, // Advertencia si se usa más del 80%
    }
  } catch (error) {
    console.error("Error al calcular uso de localStorage:", error)
    return { error: error.message }
  }
}

/**
 * Comprueba si hay suficiente espacio en localStorage para almacenar datos adicionales
 * @param {number} additionalBytes - Bytes adicionales que se quieren almacenar
 * @returns {boolean} true si hay suficiente espacio, false si no
 */
export const hasEnoughStorage = (additionalBytes = 0) => {
  try {
    const usage = getLocalStorageUsage()
    const estimatedMaxBytes = 5 * 1024 * 1024 // 5MB en bytes

    // Verificar si hay suficiente espacio
    return usage.totalSizeBytes + additionalBytes < estimatedMaxBytes * 0.95 // Dejar un 5% de margen
  } catch (error) {
    console.error("Error al verificar espacio disponible:", error)
    return true // En caso de error, asumir que hay espacio para evitar bloqueos
  }
}

// Exportar el objeto deviceCapabilityService para mantener consistencia con otros servicios
export const deviceCapabilityService = {
  detectLowEndDevice,
  getLocalStorageUsage,
  hasEnoughStorage,
}

// Mantener la exportación por defecto para compatibilidad
export default deviceCapabilityService
