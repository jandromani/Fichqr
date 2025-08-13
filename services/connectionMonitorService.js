/**
 * Servicio para monitorear el estado de la conexión a Internet
 * y proporcionar información sobre la conectividad
 */

class ConnectionMonitorService {
  constructor() {
    this.online = navigator.onLine
    this.listeners = []
    this.lastOnlineTime = this.online ? Date.now() : null
    this.lastOfflineTime = !this.online ? Date.now() : null
    this.connectionType = this.getConnectionType()
    this.connectionQuality = "unknown"
    this.isMonitoring = false

    // Configurar event listeners para cambios de conexión
    window.addEventListener("online", this.handleOnline.bind(this))
    window.addEventListener("offline", this.handleOffline.bind(this))

    // Monitorear cambios en la calidad de la conexión si está disponible
    if ("connection" in navigator) {
      const connection = navigator.connection
      connection.addEventListener("change", this.updateConnectionInfo.bind(this))
      this.updateConnectionInfo()
    }
  }

  /**
   * Inicia el monitoreo periódico de la conexión
   */
  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.pingInterval = setInterval(() => this.checkRealConnectivity(), 30000)
    this.checkRealConnectivity() // Comprobar inmediatamente
  }

  /**
   * Detiene el monitoreo periódico
   */
  stopMonitoring() {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Maneja el evento online
   */
  handleOnline() {
    this.online = true
    this.lastOnlineTime = Date.now()
    this.updateConnectionInfo()
    this.notifyListeners()
  }

  /**
   * Maneja el evento offline
   */
  handleOffline() {
    this.online = false
    this.lastOfflineTime = Date.now()
    this.connectionQuality = "offline"
    this.notifyListeners()
  }

  /**
   * Actualiza la información de la conexión
   */
  updateConnectionInfo() {
    this.connectionType = this.getConnectionType()

    if (!this.online) {
      this.connectionQuality = "offline"
      return
    }

    // Estimar calidad basada en tipo de conexión
    if (this.connectionType === "wifi" || this.connectionType === "ethernet") {
      this.connectionQuality = "good"
    } else if (this.connectionType === "4g") {
      this.connectionQuality = "medium"
    } else if (this.connectionType === "3g" || this.connectionType === "2g") {
      this.connectionQuality = "poor"
    } else {
      this.connectionQuality = "unknown"
    }

    this.notifyListeners()
  }

  /**
   * Obtiene el tipo de conexión actual
   * @returns {string} Tipo de conexión
   */
  getConnectionType() {
    if ("connection" in navigator) {
      const connection = navigator.connection
      return connection.type || connection.effectiveType || "unknown"
    }
    return "unknown"
  }

  /**
   * Comprueba la conectividad real haciendo un ping a un endpoint
   */
  async checkRealConnectivity() {
    if (!this.online) return

    try {
      const startTime = Date.now()
      // Usar un endpoint que debería responder rápidamente
      const response = await fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        mode: "no-cors", // Importante para evitar problemas CORS
        timeout: 5000, // 5 segundos de timeout
      })

      const pingTime = Date.now() - startTime

      // Actualizar calidad basada en tiempo de respuesta
      if (pingTime < 300) {
        this.connectionQuality = "good"
      } else if (pingTime < 1000) {
        this.connectionQuality = "medium"
      } else {
        this.connectionQuality = "poor"
      }
    } catch (error) {
      console.warn("Error al comprobar conectividad:", error)
      // No cambiar a offline porque podría ser solo el endpoint que falla
      this.connectionQuality = "poor"
    }

    this.notifyListeners()
  }

  /**
   * Obtiene el estado actual de la conexión
   * @returns {Object} Estado de la conexión
   */
  getStatus() {
    return {
      isOnline: this.online,
      lastChecked: new Date(),
      latency: this.getLatencyEstimate(),
      connectionType: this.connectionType,
      reliability: this.getReliabilityLevel(),
    }
  }

  /**
   * Estima la latencia basada en la calidad de conexión
   * @returns {number|null} Latencia estimada en ms
   */
  getLatencyEstimate() {
    if (!this.online) return null

    switch (this.connectionQuality) {
      case "good":
        return Math.floor(Math.random() * 100) + 50 // 50-150ms
      case "medium":
        return Math.floor(Math.random() * 200) + 150 // 150-350ms
      case "poor":
        return Math.floor(Math.random() * 500) + 350 // 350-850ms
      default:
        return null
    }
  }

  /**
   * Obtiene el nivel de fiabilidad de la conexión
   * @returns {string} Nivel de fiabilidad
   */
  getReliabilityLevel() {
    if (!this.online) return "offline"

    switch (this.connectionQuality) {
      case "good":
        return "high"
      case "medium":
        return "medium"
      case "poor":
        return "low"
      default:
        return "unknown"
    }
  }

  /**
   * Añade un listener para cambios en la conexión
   * @param {Function} listener - Función a llamar cuando cambia la conexión
   */
  addListener(listener) {
    this.listeners.push(listener)
  }

  /**
   * Elimina un listener
   * @param {Function} listener - Listener a eliminar
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  /**
   * Notifica a todos los listeners
   */
  notifyListeners() {
    const status = this.getStatus()
    this.listeners.forEach((listener) => {
      try {
        listener(status)
      } catch (error) {
        console.error("Error en listener de conexión:", error)
      }
    })
  }

  /**
   * Método para suscribirse a cambios en la conexión
   * @param {Function} callback - Función a llamar cuando cambia la conexión
   * @returns {Function} Función para cancelar la suscripción
   */
  subscribeToConnectionChanges(callback) {
    this.addListener(callback)
    // Llamar inmediatamente con el estado actual
    callback(this.getStatus())

    // Devolver función para cancelar suscripción
    return () => this.removeListener(callback)
  }

  /**
   * Método alternativo para suscribirse a cambios (para compatibilidad)
   * @param {Function} callback - Función a llamar cuando cambia la conexión
   * @returns {Object} Objeto con método para cancelar la suscripción
   */
  onConnectionChange(callback) {
    this.addListener(callback)
    return {
      unsubscribe: () => this.removeListener(callback),
    }
  }

  /**
   * Comprueba manualmente la conexión
   * @returns {Promise<Object>} Estado de la conexión
   */
  async checkConnection() {
    await this.checkRealConnectivity()
    return this.getStatus()
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  destroy() {
    this.stopMonitoring()
    window.removeEventListener("online", this.handleOnline)
    window.removeEventListener("offline", this.handleOffline)

    if ("connection" in navigator) {
      const connection = navigator.connection
      connection.removeEventListener("change", this.updateConnectionInfo)
    }
  }
}

// Crear y exportar una instancia única del servicio
const connectionMonitorService = new ConnectionMonitorService()

export { connectionMonitorService }
export default connectionMonitorService
