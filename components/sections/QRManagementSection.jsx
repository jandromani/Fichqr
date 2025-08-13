"use client"

/**
 * Sección para gestionar todos los aspectos relacionados con los códigos QR
 * Incluye generación, personalización, escaneo y gestión de puestos temporales
 */

import { useState, useEffect } from "react"
import { qrTemplateService } from "../../services/qrTemplateService"
import { positionService } from "../../services/storage/positionService"
import EnhancedQRGenerator from "../qr/EnhancedQRGenerator"
import QRScannerOptimized from "../qr/QRScannerOptimized"
import QRTemplateEditor from "../qr/QRTemplateEditor"
import TemporaryPositionManager from "../qr/TemporaryPositionManager"
import Tooltip from "../ui/Tooltip"
import Modal from "../ui/Modal"

const QRManagementSection = ({ user }) => {
  // Estado para las posiciones disponibles
  const [positions, setPositions] = useState([])

  // Estado para la posición seleccionada
  const [selectedPosition, setSelectedPosition] = useState(null)

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState("generator")

  // Estado para los modales
  const [showScannerModal, setShowScannerModal] = useState(false)
  const [showTemplateEditorModal, setShowTemplateEditorModal] = useState(false)

  // Estado para el resultado del escaneo
  const [scanResult, setScanResult] = useState(null)

  // Cargar posiciones al montar el componente
  useEffect(() => {
    loadPositions()

    // Inicializar plantillas predeterminadas
    qrTemplateService.initializeDefaultTemplates()
  }, [])

  // Cargar posiciones desde localStorage
  const loadPositions = () => {
    try {
      const storedPositions = positionService.getAll()
      setPositions(storedPositions)

      // Seleccionar la primera posición por defecto si hay alguna
      if (storedPositions.length > 0 && !selectedPosition) {
        setSelectedPosition(storedPositions[0])
      }
    } catch (error) {
      console.error("Error al cargar posiciones:", error)
    }
  }

  // Manejar cambio de posición seleccionada
  const handlePositionChange = (e) => {
    const positionId = e.target.value
    const position = positions.find((pos) => pos.id === positionId)
    setSelectedPosition(position)
  }

  // Manejar detección de QR
  const handleQRDetected = (result) => {
    setScanResult(result)
  }

  // Renderizar contenido según la pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case "generator":
        return (
          <div className="tab-content">
            <div className="position-selector">
              <label htmlFor="position-select">
                Seleccionar puesto:
                <Tooltip content="Elija el puesto para el que desea generar un código QR">
                  <span className="help-icon ml-1">?</span>
                </Tooltip>
              </label>
              <select
                id="position-select"
                value={selectedPosition?.id || ""}
                onChange={handlePositionChange}
                className="select-input"
              >
                <option value="" disabled>
                  Seleccione un puesto
                </option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name} {position.location ? `(${position.location})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedPosition ? (
              <EnhancedQRGenerator position={selectedPosition} />
            ) : (
              <div className="empty-state">
                <p>Seleccione un puesto para generar su código QR o cree uno nuevo en la sección de Puestos.</p>
              </div>
            )}
          </div>
        )

      case "templates":
        return (
          <div className="tab-content">
            <div className="templates-info">
              <h3>Plantillas de QR</h3>
              <p>
                Las plantillas le permiten personalizar la apariencia y configuración de sus códigos QR para diferentes
                entornos y necesidades.
              </p>
              <button onClick={() => setShowTemplateEditorModal(true)} className="action-btn">
                Gestionar Plantillas
              </button>
            </div>

            <div className="templates-tips">
              <h4>Recomendaciones según el entorno:</h4>
              <ul>
                <li>
                  <strong>Exteriores:</strong> Use alta corrección de errores y márgenes amplios para resistir
                  condiciones climáticas.
                </li>
                <li>
                  <strong>Entorno Industrial:</strong> Optimizado para resistir suciedad y daños parciales.
                </li>
                <li>
                  <strong>Impresión:</strong> Configuración optimizada para impresoras básicas.
                </li>
                <li>
                  <strong>Alta Densidad:</strong> Para incluir más información en el QR, ideal para puestos con datos
                  adicionales.
                </li>
              </ul>
            </div>
          </div>
        )

      case "scanner":
        return (
          <div className="tab-content">
            <div className="scanner-info">
              <h3>Escáner de QR</h3>
              <p>
                Utilice el escáner para leer códigos QR de puestos de trabajo. El escáner está optimizado para funcionar
                en diferentes condiciones de iluminación y distancia.
              </p>
              <button onClick={() => setShowScannerModal(true)} className="action-btn">
                Abrir Escáner
              </button>
            </div>

            {scanResult && (
              <div className="scan-result">
                <h4>Resultado del escaneo:</h4>
                <div className={`result-box ${scanResult.isValid ? "valid" : "invalid"}`}>
                  <p>
                    <strong>Estado:</strong> {scanResult.isValid ? "Válido" : "Inválido"}
                  </p>
                  <p>
                    <strong>Mensaje:</strong> {scanResult.message}
                  </p>
                  {scanResult.isValid && scanResult.positionId && (
                    <p>
                      <strong>ID de Puesto:</strong> {scanResult.positionId}
                    </p>
                  )}
                  {!scanResult.isValid && scanResult.reason && (
                    <p>
                      <strong>Razón:</strong> {scanResult.reason}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case "temporary":
        return (
          <div className="tab-content">
            <TemporaryPositionManager
              user={user}
              onPositionCreated={() => {
                // Actualizar lista de posiciones si es necesario
              }}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="qr-management-section">
      <div className="section-header">
        <h2>Gestión de Códigos QR</h2>
        <Tooltip content="Aquí puede generar, personalizar y gestionar todos los aspectos relacionados con los códigos QR de la aplicación">
          <span className="help-icon ml-1">?</span>
        </Tooltip>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === "generator" ? "active" : ""}`}
          onClick={() => setActiveTab("generator")}
        >
          Generador QR
        </button>
        <button
          className={`tab-btn ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          Plantillas
        </button>
        <button
          className={`tab-btn ${activeTab === "scanner" ? "active" : ""}`}
          onClick={() => setActiveTab("scanner")}
        >
          Escáner
        </button>
        <button
          className={`tab-btn ${activeTab === "temporary" ? "active" : ""}`}
          onClick={() => setActiveTab("temporary")}
        >
          Puestos Temporales
        </button>
      </div>

      {renderTabContent()}

      {/* Modal para el escáner */}
      <Modal isOpen={showScannerModal} onClose={() => setShowScannerModal(false)} title="Escáner de QR" fullWidth>
        <QRScannerOptimized
          onQRDetected={(result) => {
            handleQRDetected(result)
            // No cerramos el modal automáticamente para permitir escaneos múltiples
          }}
        />

        {scanResult && (
          <div className="scan-result mt-4">
            <h4>Resultado del escaneo:</h4>
            <div className={`result-box ${scanResult.isValid ? "valid" : "invalid"}`}>
              <p>
                <strong>Estado:</strong> {scanResult.isValid ? "Válido" : "Inválido"}
              </p>
              <p>
                <strong>Mensaje:</strong> {scanResult.message}
              </p>
              {scanResult.isValid && scanResult.positionId && (
                <p>
                  <strong>ID de Puesto:</strong> {scanResult.positionId}
                </p>
              )}
              {!scanResult.isValid && scanResult.reason && (
                <p>
                  <strong>Razón:</strong> {scanResult.reason}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={() => setShowScannerModal(false)} className="action-btn">
            Cerrar
          </button>
        </div>
      </Modal>

      {/* Modal para el editor de plantillas */}
      <Modal
        isOpen={showTemplateEditorModal}
        onClose={() => setShowTemplateEditorModal(false)}
        title="Editor de Plantillas"
        fullWidth
      >
        <QRTemplateEditor
          onSave={() => setShowTemplateEditorModal(false)}
          onCancel={() => setShowTemplateEditorModal(false)}
        />
      </Modal>
    </div>
  )
}

export default QRManagementSection
