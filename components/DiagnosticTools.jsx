"use client"

import { useState, useEffect } from "react"
import { diagnosticService } from "../services/diagnosticService"
import { connectionMonitorService } from "../services/connectionMonitorService"
import { syncQueueService } from "../services/syncQueueService"
import { offlineBackupService } from "../services/offlineBackupService"
import { useToast } from "../contexts/ToastContext"

/**
 * Componente para herramientas de diagnóstico
 * Permite realizar pruebas y verificaciones del sistema
 */
function DiagnosticTools() {
  // Estado para almacenar los resultados de diagnóstico
  const [diagnosticResults, setDiagnosticResults] = useState({})

  // Estado para controlar si hay un diagnóstico en progreso
  const [isRunning, setIsRunning] = useState(false)

  // Estado para controlar qué pruebas ejecutar
  const [selectedTests, setSelectedTests] = useState({
    storage: true,
    connection: true,
    sync: true,
    backup: true,
    performance: true,
  })

  // Estado para almacenar estadísticas del sistema
  const [systemStats, setSystemStats] = useState({
    storageUsage: null,
    recordsCount: null,
    lastBackup: null,
    pendingSyncs: null,
  })

  // Estado para controlar si se muestra el panel de detalles
  const [showDetails, setShowDetails] = useState({})

  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Efecto para cargar estadísticas al montar el componente
  useEffect(() => {
    loadSystemStats()
  }, [])

  // Cargar estadísticas del sistema
  const loadSystemStats = async () => {
    try {
      // Obtener uso de almacenamiento
      const storageUsage = await diagnosticService.getStorageUsage()

      // Obtener conteo de registros
      const recordsCount = await diagnosticService.getRecordsCount()

      // Obtener información del último respaldo
      const backups = offlineBackupService.getBackupsList()
      const lastBackup = backups.length > 0 ? backups.sort((a, b) => b.timestamp - a.timestamp)[0] : null

      // Obtener operaciones pendientes de sincronización
      const queueStatus = syncQueueService.getQueueStatus()

      setSystemStats({
        storageUsage,
        recordsCount,
        lastBackup,
        pendingSyncs: queueStatus.pending + queueStatus.retry,
      })
    } catch (error) {
      console.error("Error al cargar estadísticas del sistema:", error)
    }
  }

  // Función para ejecutar diagnóstico
  const runDiagnostic = async () => {
    try {
      setIsRunning(true)
      setDiagnosticResults({})

      const results = {}

      // Ejecutar pruebas seleccionadas
      if (selectedTests.storage) {
        results.storage = await diagnosticService.testStorage()
      }

      if (selectedTests.connection) {
        results.connection = await diagnosticService.testConnection()
      }

      if (selectedTests.sync) {
        results.sync = await diagnosticService.testSyncQueue()
      }

      if (selectedTests.backup) {
        results.backup = await diagnosticService.testBackupSystem()
      }

      if (selectedTests.performance) {
        results.performance = await diagnosticService.testPerformance()
      }

      setDiagnosticResults(results)

      // Actualizar estadísticas
      loadSystemStats()

      toast.showSuccess("Diagnóstico completado")
    } catch (error) {
      console.error("Error al ejecutar diagnóstico:", error)
      toast.showError(`Error al ejecutar diagnóstico: ${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  // Función para verificar la conexión
  const checkConnection = () => {
    connectionMonitorService.checkConnection()
    toast.showInfo("Verificando conexión...")
  }

  // Función para limpiar el almacenamiento
  const cleanupStorage = async () => {
    if (
      confirm("¿Estás seguro de que deseas limpiar datos temporales? Esta acción no afectará a tus datos principales.")
    ) {
      try {
        await diagnosticService.cleanupStorage()
        toast.showSuccess("Almacenamiento limpiado correctamente")
        loadSystemStats()
      } catch (error) {
        console.error("Error al limpiar almacenamiento:", error)
        toast.showError(`Error al limpiar almacenamiento: ${error.message}`)
      }
    }
  }

  // Función para optimizar el almacenamiento
  const optimizeStorage = async () => {
    try {
      toast.showInfo("Optimizando almacenamiento...")
      await diagnosticService.optimizeStorage()
      toast.showSuccess("Almacenamiento optimizado correctamente")
      loadSystemStats()
    } catch (error) {
      console.error("Error al optimizar almacenamiento:", error)
      toast.showError(`Error al optimizar almacenamiento: ${error.message}`)
    }
  }

  // Función para exportar diagnóstico
  const exportDiagnostic = () => {
    try {
      const diagnosticData = {
        timestamp: new Date().toISOString(),
        systemStats,
        diagnosticResults,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenSize: {
          width: window.screen.width,
          height: window.screen.height,
        },
      }

      // Convertir a JSON
      const jsonString = JSON.stringify(diagnosticData, null, 2)

      // Crear blob y descargar
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = `fichaje_qr_diagnostico_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      document.body.appendChild(a)
      a.click()

      // Limpiar
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.showSuccess("Diagnóstico exportado correctamente")
    } catch (error) {
      console.error("Error al exportar diagnóstico:", error)
      toast.showError(`Error al exportar diagnóstico: ${error.message}`)
    }
  }

  // Función para alternar la visualización de detalles
  const toggleDetails = (section) => {
    setShowDetails((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Formatear tamaño en bytes a formato legible
  const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined) return "Desconocido"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Obtener clase CSS según el estado
  const getStatusClass = (status) => {
    switch (status) {
      case "success":
        return "status-success"
      case "warning":
        return "status-warning"
      case "error":
        return "status-error"
      case "info":
        return "status-info"
      default:
        return ""
    }
  }

  return (
    <div className="diagnostic-tools">
      <div className="diagnostic-card">
        <div className="card-header">
          <h3>Herramientas de Diagnóstico</h3>
        </div>

        <div className="system-stats">
          <div className="stat-item">
            <div className="stat-icon storage">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12H2"></path>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                <line x1="6" y1="16" x2="6.01" y2="16"></line>
                <line x1="10" y1="16" x2="10.01" y2="16"></line>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Almacenamiento</div>
              <div className="stat-value">{formatSize(systemStats.storageUsage?.used)}</div>
              {systemStats.storageUsage && (
                <div className="stat-progress">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${(systemStats.storageUsage.used / systemStats.storageUsage.quota) * 100}%`,
                      backgroundColor:
                        systemStats.storageUsage.used / systemStats.storageUsage.quota > 0.8 ? "#f44336" : "#4caf50",
                    }}
                  ></div>
                </div>
              )}
              <div className="stat-subtext">
                {systemStats.storageUsage
                  ? `${Math.round((systemStats.storageUsage.used / systemStats.storageUsage.quota) * 100)}% de ${formatSize(systemStats.storageUsage.quota)}`
                  : "Calculando..."}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon records">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Registros</div>
              <div className="stat-value">{systemStats.recordsCount?.total || "0"}</div>
              <div className="stat-subtext">
                {systemStats.recordsCount
                  ? `${systemStats.recordsCount.clockRecords} fichajes, ${systemStats.recordsCount.workers} trabajadores`
                  : "Calculando..."}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon backup">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Último respaldo</div>
              <div className="stat-value">
                {systemStats.lastBackup ? new Date(systemStats.lastBackup.timestamp).toLocaleDateString() : "Ninguno"}
              </div>
              <div className="stat-subtext">
                {systemStats.lastBackup
                  ? `${new Date(systemStats.lastBackup.timestamp).toLocaleTimeString()} - ${systemStats.lastBackup.description}`
                  : "No hay respaldos"}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon sync">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-label">Sincronización</div>
              <div className="stat-value">{systemStats.pendingSyncs || "0"}</div>
              <div className="stat-subtext">
                {systemStats.pendingSyncs ? `${systemStats.pendingSyncs} operaciones pendientes` : "Todo sincronizado"}
              </div>
            </div>
          </div>
        </div>

        <div className="diagnostic-options">
          <h4>Opciones de diagnóstico</h4>

          <div className="options-grid">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={selectedTests.storage}
                onChange={() => setSelectedTests((prev) => ({ ...prev, storage: !prev.storage }))}
              />
              <span>Almacenamiento</span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={selectedTests.connection}
                onChange={() => setSelectedTests((prev) => ({ ...prev, connection: !prev.connection }))}
              />
              <span>Conexión</span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={selectedTests.sync}
                onChange={() => setSelectedTests((prev) => ({ ...prev, sync: !prev.sync }))}
              />
              <span>Sincronización</span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={selectedTests.backup}
                onChange={() => setSelectedTests((prev) => ({ ...prev, backup: !prev.backup }))}
              />
              <span>Respaldos</span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={selectedTests.performance}
                onChange={() => setSelectedTests((prev) => ({ ...prev, performance: !prev.performance }))}
              />
              <span>Rendimiento</span>
            </label>
          </div>
        </div>

        <div className="diagnostic-actions">
          <button
            className="action-button run"
            onClick={runDiagnostic}
            disabled={isRunning || Object.values(selectedTests).every((v) => !v)}
          >
            {isRunning ? (
              <>
                <span className="loading-spinner"></span>
                <span>Ejecutando diagnóstico...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>Ejecutar diagnóstico</span>
              </>
            )}
          </button>

          <button className="action-button check" onClick={checkConnection} disabled={isRunning}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>
            <span>Verificar conexión</span>
          </button>

          <button className="action-button cleanup" onClick={cleanupStorage} disabled={isRunning}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Limpiar datos temporales</span>
          </button>

          <button className="action-button optimize" onClick={optimizeStorage} disabled={isRunning}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 20V10"></path>
              <path d="M12 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
            <span>Optimizar almacenamiento</span>
          </button>
        </div>

        {Object.keys(diagnosticResults).length > 0 && (
          <div className="diagnostic-results">
            <div className="results-header">
              <h4>Resultados del diagnóstico</h4>
              <button className="export-button" onClick={exportDiagnostic} title="Exportar diagnóstico">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Exportar</span>
              </button>
            </div>

            {diagnosticResults.storage && (
              <div className="result-section">
                <div
                  className={`section-header ${getStatusClass(diagnosticResults.storage.status)}`}
                  onClick={() => toggleDetails("storage")}
                >
                  <div className="section-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 12H2"></path>
                      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                      <line x1="6" y1="16" x2="6.01" y2="16"></line>
                      <line x1="10" y1="16" x2="10.01" y2="16"></line>
                    </svg>
                    <span>Almacenamiento</span>
                  </div>
                  <div className="section-status">
                    {diagnosticResults.storage.status === "success" && "✓ Correcto"}
                    {diagnosticResults.storage.status === "warning" && "⚠ Advertencias"}
                    {diagnosticResults.storage.status === "error" && "✗ Problemas"}
                    <span className="toggle-icon">{showDetails.storage ? "▲" : "▼"}</span>
                  </div>
                </div>

                {showDetails.storage && (
                  <div className="section-details">
                    <div className="detail-item">
                      <span className="detail-label">Espacio utilizado:</span>
                      <span className="detail-value">{formatSize(diagnosticResults.storage.used)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Espacio disponible:</span>
                      <span className="detail-value">{formatSize(diagnosticResults.storage.available)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tiempo de escritura:</span>
                      <span className="detail-value">{diagnosticResults.storage.tests.write.time.toFixed(2)} ms</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tiempo de lectura:</span>
                      <span className="detail-value">{diagnosticResults.storage.tests.read.time.toFixed(2)} ms</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Ratio de compresión:</span>
                      <span className="detail-value">
                        {diagnosticResults.storage.tests.compression.ratio.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {diagnosticResults.connection && (
              <div className="result-section">
                <div
                  className={`section-header ${getStatusClass(diagnosticResults.connection.status)}`}
                  onClick={() => toggleDetails("connection")}
                >
                  <div className="section-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                      <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                      <line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                    <span>Conexión</span>
                  </div>
                  <div className="section-status">
                    {diagnosticResults.connection.status === "success" && "✓ Correcto"}
                    {diagnosticResults.connection.status === "warning" && "⚠ Advertencias"}
                    {diagnosticResults.connection.status === "error" && "✗ Problemas"}
                    <span className="toggle-icon">{showDetails.connection ? "▲" : "▼"}</span>
                  </div>
                </div>

                {showDetails.connection && (
                  <div className="section-details">
                    <div className="detail-item">
                      <span className="detail-label">Estado:</span>
                      <span className="detail-value">
                        {diagnosticResults.connection.tests.online.success ? "En línea" : "Sin conexión"}
                      </span>
                    </div>
                    {diagnosticResults.connection.tests.latency.value !== null && (
                      <div className="detail-item">
                        <span className="detail-label">Latencia:</span>
                        <span className="detail-value">{diagnosticResults.connection.tests.latency.value} ms</span>
                      </div>
                    )}
                    {diagnosticResults.connection.tests.stability.value !== null && (
                      <div className="detail-item">
                        <span className="detail-label">Estabilidad:</span>
                        <span className="detail-value">
                          {(diagnosticResults.connection.tests.stability.value * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {diagnosticResults.sync && (
              <div className="result-section">
                <div
                  className={`section-header ${getStatusClass(diagnosticResults.sync.status)}`}
                  onClick={() => toggleDetails("sync")}
                >
                  <div className="section-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    <span>Sincronización</span>
                  </div>
                  <div className="section-status">
                    {diagnosticResults.sync.status === "success" && "✓ Correcto"}
                    {diagnosticResults.sync.status === "warning" && "⚠ Advertencias"}
                    {diagnosticResults.sync.status === "error" && "✗ Problemas"}
                    <span className="toggle-icon">{showDetails.sync ? "▲" : "▼"}</span>
                  </div>
                </div>

                {showDetails.sync && (
                  <div className="section-details">
                    <div className="detail-item">
                      <span className="detail-label">Estado de la cola:</span>
                      <span className="detail-value">
                        {diagnosticResults.sync.tests.queueStatus.success ? "Normal" : "Procesando"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Elementos pendientes:</span>
                      <span className="detail-value">{diagnosticResults.sync.tests.pendingItems.count}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Elementos fallidos:</span>
                      <span className="detail-value">{diagnosticResults.sync.tests.failedItems.count}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {diagnosticResults.backup && (
              <div className="result-section">
                <div
                  className={`section-header ${getStatusClass(diagnosticResults.backup.status)}`}
                  onClick={() => toggleDetails("backup")}
                >
                  <div className="section-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                      <line x1="6" y1="6" x2="6.01" y2="6"></line>
                      <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                    <span>Respaldos</span>
                  </div>
                  <div className="section-status">
                    {diagnosticResults.backup.status === "success" && "✓ Correcto"}
                    {diagnosticResults.backup.status === "warning" && "⚠ Advertencias"}
                    {diagnosticResults.backup.status === "error" && "✗ Problemas"}
                    <span className="toggle-icon">{showDetails.backup ? "▲" : "▼"}</span>
                  </div>
                </div>

                {showDetails.backup && (
                  <div className="section-details">
                    <div className="detail-item">
                      <span className="detail-label">Respaldos disponibles:</span>
                      <span className="detail-value">{diagnosticResults.backup.tests.backupsExist.count}</span>
                    </div>
                    {diagnosticResults.backup.tests.recentBackup.daysAgo !== null && (
                      <div className="detail-item">
                        <span className="detail-label">Último respaldo hace:</span>
                        <span className="detail-value">
                          {diagnosticResults.backup.tests.recentBackup.daysAgo.toFixed(1)} días
                        </span>
                      </div>
                    )}
                    {diagnosticResults.backup.tests.backupSize.averageSize > 0 && (
                      <div className="detail-item">
                        <span className="detail-label">Tamaño promedio:</span>
                        <span className="detail-value">
                          {formatSize(diagnosticResults.backup.tests.backupSize.averageSize)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {diagnosticResults.performance && (
              <div className="result-section">
                <div
                  className={`section-header ${getStatusClass(diagnosticResults.performance.status)}`}
                  onClick={() => toggleDetails("performance")}
                >
                  <div className="section-title">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 20V10"></path>
                      <path d="M12 20V4"></path>
                      <path d="M6 20v-6"></path>
                    </svg>
                    <span>Rendimiento</span>
                  </div>
                  <div className="section-status">
                    {diagnosticResults.performance.status === "success" && "✓ Correcto"}
                    {diagnosticResults.performance.status === "warning" && "⚠ Advertencias"}
                    {diagnosticResults.performance.status === "error" && "✗ Problemas"}
                    <span className="toggle-icon">{showDetails.performance ? "▲" : "▼"}</span>
                  </div>
                </div>

                {showDetails.performance && (
                  <div className="section-details">
                    <div className="detail-item">
                      <span className="detail-label">Tiempo de escritura:</span>
                      <span className="detail-value">
                        {diagnosticResults.performance.tests.storage.writeTime.toFixed(2)} ms
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tiempo de lectura:</span>
                      <span className="detail-value">
                        {diagnosticResults.performance.tests.storage.readTime.toFixed(2)} ms
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tiempo de compresión:</span>
                      <span className="detail-value">
                        {diagnosticResults.performance.tests.compression.time.toFixed(2)} ms
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Ratio de compresión:</span>
                      <span className="detail-value">
                        {diagnosticResults.performance.tests.compression.ratio.toFixed(2)}x
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tiempo de renderizado:</span>
                      <span className="detail-value">
                        {diagnosticResults.performance.tests.rendering.time.toFixed(2)} ms
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .diagnostic-tools {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        
        .diagnostic-card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .card-header {
          padding: 16px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .card-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .system-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          padding: 16px;
          background-color: #f9f9f9;
        }
        
        .stat-item {
          display: flex;
          align-items: center;
          background-color: white;
          padding: 12px;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          margin-right: 12px;
        }
        
        .stat-icon.storage {
          background-color: #e3f2fd;
          color: #1976d2;
        }
        
        .stat-icon.records {
          background-color: #e8f5e9;
          color: #388e3c;
        }
        
        .stat-icon.backup {
          background-color: #fff3e0;
          color: #f57c00;
        }
        
        .stat-icon.sync {
          background-color: #e1f5fe;
          color: #0288d1;
        }
        
        .stat-content {
          flex: 1;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .stat-progress {
          height: 4px;
          background-color: #eee;
          border-radius: 2px;
          margin-bottom: 4px;
        }
        
        .progress-bar {
          height: 100%;
          border-radius: 2px;
        }
        
        .stat-subtext {
          font-size: 11px;
          color: #888;
        }
        
        .diagnostic-options {
          padding: 16px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .diagnostic-options h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }
        
        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }
        
        .option-checkbox {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .option-checkbox input {
          margin-right: 8px;
        }
        
        .option-checkbox span {
          font-size: 14px;
        }
        
        .diagnostic-actions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
          padding: 16px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .action-button svg {
          margin-right: 8px;
        }
        
        .action-button.run {
          background-color: #1976d2;
          color: white;
        }
        
        .action-button.run:hover {
          background-color: #1565c0;
        }
        
        .action-button.check {
          background-color: #0288d1;
          color: white;
        }
        
        .action-button.check:hover {
          background-color: #0277bd;
        }
        
        .action-button.cleanup {
          background-color: #f44336;
          color: white;
        }
        
        .action-button.cleanup:hover {
          background-color: #e53935;
        }
        
        .action-button.optimize {
          background-color: #4caf50;
          color: white;
        }
        
        .action-button.optimize:hover {
          background-color: #43a047;
        }
        
        .action-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin-right: 8px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .diagnostic-results {
          padding: 16px;
        }
        
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .results-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .export-button {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          background-color: #f5f5f5;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .export-button:hover {
          background-color: #e0e0e0;
        }
        
        .export-button svg {
          margin-right: 4px;
        }
        
        .result-section {
          margin-bottom: 12px;
          border: 1px solid #eaeaea;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .section-header:hover {
          background-color: #f9f9f9;
        }
        
        .section-title {
          display: flex;
          align-items: center;
        }
        
        .section-title svg {
          margin-right: 8px;
        }
        
        .section-status {
          display: flex;
          align-items: center;
          font-size: 14px;
        }
        
        .toggle-icon {
          margin-left: 8px;
          font-size: 10px;
        }
        
        .section-details {
          padding: 12px;
          background-color: #f9f9f9;
          border-top: 1px solid #eaeaea;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        
        .detail-item:last-child {
          margin-bottom: 0;
        }
        
        .detail-label {
          color: #666;
        }
        
        .detail-value {
          font-weight: 500;
        }
        
        .status-success {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .status-warning {
          background-color: #fff3e0;
          color: #ef6c00;
        }
        
        .status-error {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .status-info {
          background-color: #e3f2fd;
          color: #1565c0;
        }
        
        @media (max-width: 768px) {
          .system-stats {
            grid-template-columns: 1fr;
          }
          
          .diagnostic-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default DiagnosticTools
