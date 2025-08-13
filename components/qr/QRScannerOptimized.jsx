"use client"

/**
 * Componente para escanear códigos QR con optimizaciones para diferentes condiciones
 * Incluye mejoras para baja luz, distancia y verificación de autenticidad
 */

import { useState, useEffect, useRef } from "react"
import { qrScanningService } from "../../services/qrScanningService"
import { deviceCapabilityService } from "../../services/deviceCapabilityService"
import Tooltip from "../ui/Tooltip"

const QRScannerOptimized = ({ onQRDetected, autoStart = true }) => {
  // Referencias para elementos de video y canvas
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Estado para el stream de la cámara
  const [stream, setStream] = useState(null)

  // Estado para controlar si el escáner está activo
  const [isScanning, setIsScanning] = useState(autoStart)

  // Estado para el modo de escaneo
  const [scanMode, setScanMode] = useState("DEFAULT")

  // Estado para las capacidades de la cámara
  const [cameraCapabilities, setCameraCapabilities] = useState({
    hasCamera: false,
    hasFrontCamera: false,
    hasBackCamera: false,
    supportsTorch: false,
  })

  // Estado para la cámara activa (frontal o trasera)
  const [activeCamera, setActiveCamera] = useState("environment")

  // Estado para el flash/torch
  const [torchActive, setTorchActive] = useState(false)

  // Estado para mensajes de error
  const [error, setError] = useState(null)

  // Estado para mensajes de estado
  const [statusMessage, setStatusMessage] = useState("Iniciando cámara...")

  // Función para detener el escaneo
  const stopScanner = useRef(null)

  // Detectar capacidades de la cámara al montar el componente
  useEffect(() => {
    const detectCapabilities = async () => {
      try {
        // Verificar si el dispositivo tiene cámara
        const hasCamera = await deviceCapabilityService.hasCamera()

        if (!hasCamera) {
          setError("Este dispositivo no tiene cámara o no se ha concedido permiso para usarla.")
          setStatusMessage("No se puede acceder a la cámara")
          return
        }

        // Detectar capacidades específicas de la cámara
        const capabilities = await qrScanningService.detectCameraCapabilities()
        setCameraCapabilities(capabilities)

        if (!capabilities.hasCamera) {
          setError("No se detectó ninguna cámara en el dispositivo.")
          setStatusMessage("Cámara no disponible")
        }
      } catch (error) {
        console.error("Error al detectar capacidades de la cámara:", error)
        setError(`Error al acceder a la cámara: ${error.message}`)
        setStatusMessage("Error de cámara")
      }
    }

    detectCapabilities()
  }, [])

  // Iniciar/detener la cámara cuando cambia isScanning
  useEffect(() => {
    const startCamera = async () => {
      try {
        if (!isScanning) {
          // Detener el escáner si está activo
          if (stopScanner.current) {
            stopScanner.current()
            stopScanner.current = null
          }

          // Detener el stream de la cámara
          if (stream) {
            stream.getTracks().forEach((track) => track.stop())
            setStream(null)
          }

          setStatusMessage("Escáner detenido")
          return
        }

        setStatusMessage("Iniciando cámara...")
        setError(null)

        // Configurar restricciones para la cámara
        const constraints = {
          video: {
            facingMode: activeCamera,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        }

        // Iniciar la cámara
        const cameraStream = await qrScanningService.startCamera(videoRef.current, constraints)
        setStream(cameraStream)

        // Esperar a que el video esté listo
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setStatusMessage("Escaneando...")

          // Configurar el modo de escaneo según las condiciones
          const scanConfig = qrScanningService.SCAN_CONFIGS[scanMode]

          // Iniciar el escáner de QR
          const stopScannerFn = qrScanningService.startQRScanFromVideo(videoRef.current, handleQRDetected, scanConfig)

          stopScanner.current = stopScannerFn
        }

        // Activar flash si está disponible y seleccionado
        if (torchActive && cameraCapabilities.supportsTorch) {
          const videoTrack = cameraStream.getVideoTracks()[0]
          if (videoTrack && videoTrack.applyConstraints) {
            await videoTrack.applyConstraints({
              advanced: [{ torch: true }],
            })
          }
        }
      } catch (error) {
        console.error("Error al iniciar la cámara:", error)
        setError(`Error al iniciar la cámara: ${error.message}`)
        setStatusMessage("Error de cámara")
        setIsScanning(false)
      }
    }

    startCamera()

    // Limpiar al desmontar
    return () => {
      if (stopScanner.current) {
        stopScanner.current()
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isScanning, activeCamera, scanMode, torchActive, cameraCapabilities.supportsTorch])

  // Manejar la detección de QR
  const handleQRDetected = async (result) => {
    // Reproducir sonido de éxito
    const beepSound = new Audio("/sounds/beep.mp3")
    beepSound.play().catch((e) => console.log("No se pudo reproducir el sonido", e))

    // Pausar brevemente el escáner
    setIsScanning(false)

    // Mostrar mensaje de éxito
    setStatusMessage("¡QR detectado!")

    // Llamar al callback con el resultado
    if (onQRDetected) {
      onQRDetected(result)
    }

    // Reanudar el escáner después de un breve retraso
    setTimeout(() => {
      if (autoStart) {
        setIsScanning(true)
        setStatusMessage("Escaneando...")
      }
    }, 2000)
  }

  // Cambiar entre cámaras frontal y trasera
  const toggleCamera = () => {
    if (!cameraCapabilities.hasFrontCamera && !cameraCapabilities.hasBackCamera) {
      return
    }

    // Detener el escáner actual
    if (stopScanner.current) {
      stopScanner.current()
      stopScanner.current = null
    }

    // Detener el stream actual
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    // Cambiar la cámara activa
    setActiveCamera(activeCamera === "environment" ? "user" : "environment")

    // Reiniciar el escáner
    setIsScanning(true)
  }

  // Cambiar el modo de escaneo
  const handleScanModeChange = (e) => {
    setScanMode(e.target.value)

    // Reiniciar el escáner para aplicar el nuevo modo
    if (isScanning) {
      setIsScanning(false)
      setTimeout(() => setIsScanning(true), 100)
    }
  }

  // Activar/desactivar el flash
  const toggleTorch = async () => {
    if (!cameraCapabilities.supportsTorch || !stream) {
      return
    }

    try {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack && videoTrack.applyConstraints) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !torchActive }],
        })
        setTorchActive(!torchActive)
      }
    } catch (error) {
      console.error("Error al cambiar el estado del flash:", error)
    }
  }

  return (
    <div className="qr-scanner-optimized">
      <div className="scanner-container">
        {error ? (
          <div className="scanner-error">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null)
                setIsScanning(true)
              }}
              className="action-btn"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="video-container">
              <video ref={videoRef} className="scanner-video" playsInline muted />
              <div className="scanner-overlay">
                <div className="scanner-target"></div>
                <p className="scanner-status">{statusMessage}</p>
              </div>
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </>
        )}
      </div>

      <div className="scanner-controls">
        <div className="control-group">
          <button onClick={() => setIsScanning(!isScanning)} className={`control-btn ${isScanning ? "active" : ""}`}>
            {isScanning ? "Pausar" : "Iniciar"}
          </button>

          {cameraCapabilities.cameraCount > 1 && (
            <button onClick={toggleCamera} className="control-btn" title="Cambiar cámara">
              <span className="icon">🔄</span>
            </button>
          )}

          {cameraCapabilities.supportsTorch && (
            <button
              onClick={toggleTorch}
              className={`control-btn ${torchActive ? "active" : ""}`}
              title="Activar/desactivar flash"
            >
              <span className="icon">💡</span>
            </button>
          )}
        </div>

        <div className="mode-selector">
          <label htmlFor="scan-mode">
            Modo de escaneo:
            <Tooltip content="Seleccione el modo según las condiciones de iluminación y distancia">
              <span className="help-icon ml-1">?</span>
            </Tooltip>
          </label>
          <select id="scan-mode" value={scanMode} onChange={handleScanModeChange} className="select-input">
            <option value="DEFAULT">Normal</option>
            <option value="LOW_LIGHT">Baja luz</option>
            <option value="DISTANCE">Larga distancia</option>
          </select>
        </div>
      </div>

      <div className="scanner-tips">
        <h4>Consejos para un mejor escaneo:</h4>
        <ul>
          <li>Mantenga el QR dentro del recuadro central</li>
          <li>Asegúrese de que el QR esté bien iluminado</li>
          <li>Evite movimientos bruscos</li>
          <li>Si está en un entorno con poca luz, active el flash o use el modo "Baja luz"</li>
          <li>Para escanear desde lejos, use el modo "Larga distancia"</li>
        </ul>
      </div>
    </div>
  )
}

export default QRScannerOptimized
