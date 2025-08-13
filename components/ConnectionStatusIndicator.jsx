"use client"

import { useState, useEffect } from "react"
import { connectionMonitorService } from "../services/connectionMonitorService"
import { useToast } from "../contexts/ToastContext"
import Tooltip from "./ui/Tooltip"

const ConnectionStatusIndicator = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    isOnline: navigator.onLine,
    lastChecked: new Date(),
    latency: null,
    connectionType: null,
    reliability: "unknown",
  })
  const [expanded, setExpanded] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    // Suscribirse a los cambios de estado de conexión
    const unsubscribe = connectionMonitorService.subscribeToConnectionChanges((status) => {
      setConnectionStatus(status)

      // Mostrar toast solo cuando cambia el estado online/offline
      if (status.isOnline !== connectionStatus.isOnline) {
        showToast({
          type: status.isOnline ? "success" : "warning",
          message: status.isOnline
            ? "Conexión restablecida. Sincronizando datos..."
            : "Conexión perdida. Modo offline activado.",
        })
      }
    })

    // Iniciar monitoreo de conexión
    connectionMonitorService.startMonitoring()

    return () => {
      unsubscribe()
      connectionMonitorService.stopMonitoring()
    }
  }, [connectionStatus.isOnline, showToast])

  const getStatusColor = () => {
    if (!connectionStatus.isOnline) return "bg-red-500"

    // Si está online, el color depende de la fiabilidad
    switch (connectionStatus.reliability) {
      case "high":
        return "bg-green-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getConnectionTypeIcon = () => {
    if (!connectionStatus.connectionType) return "📡"

    switch (connectionStatus.connectionType) {
      case "wifi":
        return "📶"
      case "cellular":
        return "📱"
      case "ethernet":
        return "🔌"
      default:
        return "📡"
    }
  }

  const getLatencyText = () => {
    if (connectionStatus.latency === null) return "Midiendo..."
    if (connectionStatus.latency < 100) return `${connectionStatus.latency}ms (Excelente)`
    if (connectionStatus.latency < 300) return `${connectionStatus.latency}ms (Buena)`
    if (connectionStatus.latency < 600) return `${connectionStatus.latency}ms (Regular)`
    return `${connectionStatus.latency}ms (Lenta)`
  }

  const toggleExpanded = () => {
    setExpanded(!expanded)
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="connection-status-container">
      <Tooltip content={connectionStatus.isOnline ? "Conectado" : "Sin conexión"}>
        <div className="connection-status-indicator cursor-pointer" onClick={toggleExpanded}>
          <div className={`status-dot ${getStatusColor()}`}></div>
          <span className="status-text">{connectionStatus.isOnline ? "Online" : "Offline"}</span>
          {expanded ? "▲" : "▼"}
        </div>
      </Tooltip>

      {expanded && (
        <div className="connection-details-panel">
          <div className="details-row">
            <span className="detail-label">Estado:</span>
            <span className="detail-value">{connectionStatus.isOnline ? "Conectado" : "Sin conexión"}</span>
          </div>
          <div className="details-row">
            <span className="detail-label">Tipo:</span>
            <span className="detail-value">
              {getConnectionTypeIcon()} {connectionStatus.connectionType || "Desconocido"}
            </span>
          </div>
          <div className="details-row">
            <span className="detail-label">Latencia:</span>
            <span className="detail-value">{getLatencyText()}</span>
          </div>
          <div className="details-row">
            <span className="detail-label">Fiabilidad:</span>
            <span className="detail-value">
              {connectionStatus.reliability === "high" && "⭐⭐⭐ Alta"}
              {connectionStatus.reliability === "medium" && "⭐⭐ Media"}
              {connectionStatus.reliability === "low" && "⭐ Baja"}
              {connectionStatus.reliability === "unknown" && "❓ Desconocida"}
            </span>
          </div>
          <div className="details-row">
            <span className="detail-label">Última comprobación:</span>
            <span className="detail-value">{formatTime(connectionStatus.lastChecked)}</span>
          </div>
          <button className="check-connection-btn" onClick={() => connectionMonitorService.checkConnection()}>
            Comprobar ahora
          </button>
        </div>
      )}

      <style jsx>{`
        .connection-status-container {
          position: relative;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .connection-status-indicator {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 20px;
          background-color: #f5f5f5;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }
        .connection-status-indicator:hover {
          background-color: #e9e9e9;
        }
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .bg-green-500 { background-color: #10b981; }
        .bg-yellow-500 { background-color: #f59e0b; }
        .bg-orange-500 { background-color: #f97316; }
        .bg-red-500 { background-color: #ef4444; }
        .bg-gray-500 { background-color: #6b7280; }
        .status-text {
          font-weight: 500;
          margin-right: 8px;
        }
        .connection-details-panel {
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 12px;
          margin-top: 8px;
          z-index: 10;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f0f0f0;
        }
        .details-row:last-of-type {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 500;
          color: #4b5563;
        }
        .detail-value {
          color: #1f2937;
        }
        .check-connection-btn {
          width: 100%;
          padding: 8px;
          background-color: #e5e7eb;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 8px;
        }
        .check-connection-btn:hover {
          background-color: #d1d5db;
        }
      `}</style>
    </div>
  )
}

export default ConnectionStatusIndicator
