"use client"

/**
 * Componente para gestionar puestos de trabajo temporales con QR autogenerados
 * Permite crear, editar, extender y eliminar puestos temporales
 */

import { useState, useEffect, useRef } from "react"
import { temporaryPositionService } from "../../services/temporaryPositionService"
import { qrTemplateService } from "../../services/qrTemplateService"
import { qrGenerationService } from "../../services/qrGenerationService"
import Tooltip from "../ui/Tooltip"
import ConfirmationModal from "../ui/ConfirmationModal"
import Modal from "../ui/Modal"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

const TemporaryPositionManager = ({ user, onPositionCreated }) => {
  // Estado para la lista de puestos temporales
  const [temporaryPositions, setTemporaryPositions] = useState([])

  // Estado para el formulario de nuevo puesto
  const [newPosition, setNewPosition] = useState({
    name: "",
    location: "",
    mode: "onsite",
    expiresIn: 24, // Horas
  })

  // Estado para mostrar/ocultar el formulario
  const [showForm, setShowForm] = useState(false)

  // Estado para errores de validación
  const [formErrors, setFormErrors] = useState({})

  // Estado para el modal de confirmación de eliminación
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [positionToDelete, setPositionToDelete] = useState(null)

  // Estado para el modal de QR ampliado
  const [expandedQR, setExpandedQR] = useState(null)

  // Estado para la generación de PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Estado para el modal de extensión de tiempo
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [positionToExtend, setPositionToExtend] = useState(null)
  const [extensionHours, setExtensionHours] = useState(24)

  // Estado para las plantillas de QR disponibles
  const [qrTemplates, setQrTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState("default")

  // Referencia al elemento QR para exportación
  const qrRef = useRef(null)

  // Cargar puestos temporales y plantillas al montar el componente
  useEffect(() => {
    loadTemporaryPositions()
    loadQRTemplates()

    // Configurar limpieza periódica de puestos expirados
    const cleanupInterval = setInterval(() => {
      temporaryPositionService.cleanupExpiredPositions()
      loadTemporaryPositions()
    }, 60000) // Cada minuto

    return () => clearInterval(cleanupInterval)
  }, [])

  // Cargar puestos temporales
  const loadTemporaryPositions = () => {
    try {
      const positions = temporaryPositionService.getTemporaryPositions({
        companyId: user?.companyId,
      })
      setTemporaryPositions(positions)
    } catch (error) {
      console.error("Error al cargar puestos temporales:", error)
    }
  }

  // Cargar plantillas de QR
  const loadQRTemplates = () => {
    try {
      const templates = qrTemplateService.getAllTemplates()
      setQrTemplates(templates)
    } catch (error) {
      console.error("Error al cargar plantillas de QR:", error)
    }
  }

  // Validar el formulario
  const validateForm = () => {
    const errors = {}

    if (!newPosition.name.trim()) {
      errors.name = "El nombre del puesto es obligatorio"
    }

    if (newPosition.expiresIn <= 0) {
      errors.expiresIn = "La duración debe ser mayor a 0 horas"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Crear un nuevo puesto temporal
  const handleCreatePosition = async () => {
    if (!validateForm()) {
      return
    }

    try {
      // Calcular fecha de expiración
      const expiresAt = Date.now() + newPosition.expiresIn * 60 * 60 * 1000

      // Obtener plantilla seleccionada
      const template = qrTemplates.find((t) => t.id === selectedTemplate)
      const qrTemplate = template ? template.config : qrGenerationService.QR_TEMPLATES.STANDARD

      // Crear puesto temporal
      const temporaryPosition = await temporaryPositionService.createTemporaryPosition(
        {
          name: newPosition.name,
          location: newPosition.location,
          mode: newPosition.mode,
          companyId: user?.companyId,
        },
        {
          expiresAt,
          userId: user?.id,
          qrTemplate,
          notifyAdmins: true,
        },
      )

      // Actualizar lista de puestos
      loadTemporaryPositions()

      // Notificar al componente padre si es necesario
      if (onPositionCreated) {
        onPositionCreated(temporaryPosition)
      }

      // Resetear formulario
      setNewPosition({
        name: "",
        location: "",
        mode: "onsite",
        expiresIn: 24,
      })

      setShowForm(false)
    } catch (error) {
      console.error("Error al crear puesto temporal:", error)
      setFormErrors({ submit: `Error al crear puesto: ${error.message}` })
    }
  }

  // Eliminar un puesto temporal
  const handleDeletePosition = () => {
    if (!positionToDelete) return

    try {
      const isDeleted = temporaryPositionService.deleteTemporaryPosition(positionToDelete.id)

      if (isDeleted) {
        // Actualizar lista de puestos
        loadTemporaryPositions()
      }
    } catch (error) {
      console.error("Error al eliminar puesto temporal:", error)
    } finally {
      setShowDeleteConfirmation(false)
      setPositionToDelete(null)
    }
  }

  // Extender la duración de un puesto temporal
  const handleExtendPosition = () => {
    if (!positionToExtend) return

    try {
      const updatedPosition = temporaryPositionService.extendTemporaryPosition(positionToExtend.id, extensionHours)

      if (updatedPosition) {
        // Actualizar lista de puestos
        loadTemporaryPositions()
      }
    } catch (error) {
      console.error("Error al extender puesto temporal:", error)
    } finally {
      setShowExtendModal(false)
      setPositionToExtend(null)
      setExtensionHours(24)
    }
  }

  // Generar y descargar el QR como PDF
  const handleDownloadQR = async (position) => {
    try {
      setIsGeneratingPDF(true)

      // Obtener el elemento QR que queremos convertir a imagen
      const qrElement = document.getElementById(`qr-${position.id}`)

      if (!qrElement) {
        console.error("No se encontró el elemento QR")
        setIsGeneratingPDF(false)
        return
      }

      // Convertir el elemento QR a un canvas usando html2canvas
      const canvas = await html2canvas(qrElement, {
        scale: 3, // Mayor escala para mejor calidad
        backgroundColor: "#ffffff",
      })

      // Convertir el canvas a una imagen en formato base64
      const imgData = canvas.toDataURL("image/png")

      // Crear un nuevo documento PDF (A4 por defecto)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
      })

      // Configurar el tamaño de página y márgenes
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20 // margen en mm

      // Añadir el título (nombre del puesto)
      pdf.setFontSize(24)
      pdf.setTextColor(0, 102, 204) // Color azul similar al de la aplicación
      const title = `Puesto Temporal: ${position.name}`
      pdf.text(title, pageWidth / 2, margin + 10, { align: "center" })

      // Añadir la ubicación si existe
      if (position.location) {
        pdf.setFontSize(16)
        pdf.setTextColor(51, 51, 51) // Color gris oscuro
        pdf.text(`Ubicación: ${position.location}`, pageWidth / 2, margin + 20, { align: "center" })
      }

      // Añadir el modo de trabajo
      pdf.setFontSize(16)
      pdf.setTextColor(51, 51, 51)
      const modeText =
        position.mode === "remote" ? "Teletrabajo" : position.mode === "hybrid" ? "Híbrido" : "Presencial"
      pdf.text(`Modo: ${modeText}`, pageWidth / 2, margin + (position.location ? 30 : 20), { align: "center" })

      // Añadir fecha de expiración
      pdf.setFontSize(14)
      pdf.setTextColor(255, 0, 0) // Rojo para destacar
      const expirationDate = new Date(position.expiresAt).toLocaleString()
      pdf.text(`Válido hasta: ${expirationDate}`, pageWidth / 2, margin + (position.location ? 40 : 30), {
        align: "center",
      })

      // Calcular el tamaño del QR (queremos que sea grande pero que quepa en la página)
      const qrSize = Math.min(pageWidth - 2 * margin, 150) // máximo 150mm o el ancho disponible

      // Calcular la posición para centrar el QR
      const qrX = (pageWidth - qrSize) / 2
      const qrY = margin + (position.location ? 50 : 40) // Dejamos espacio para el título, ubicación, modo y expiración

      // Añadir la imagen del QR al PDF
      pdf.addImage(imgData, "PNG", qrX, qrY, qrSize, qrSize)

      // Añadir advertencia de temporalidad
      pdf.setFontSize(12)
      pdf.setTextColor(255, 0, 0)
      pdf.text("IMPORTANTE: Este es un puesto temporal con fecha de caducidad.", pageWidth / 2, qrY + qrSize + 15, {
        align: "center",
      })

      // Añadir instrucciones
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      const instructions = [
        "Instrucciones:",
        "1. Imprima este código QR y colóquelo en un lugar visible en el puesto temporal.",
        "2. Los trabajadores pueden escanear este código con la cámara de su smartphone.",
        "3. Al escanear, se abrirá automáticamente la aplicación de fichaje para este puesto.",
        "4. Este QR dejará de funcionar automáticamente después de la fecha de caducidad.",
      ]

      let yPos = qrY + qrSize + 30
      instructions.forEach((line) => {
        pdf.text(line, margin, yPos)
        yPos += 7
      })

      // Añadir un pie de página con la fecha de generación
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      const today = new Date().toLocaleDateString()
      pdf.text(`Generado el ${today}`, pageWidth / 2, pageHeight - 10, { align: "center" })

      // Guardar el PDF con un nombre que incluye el nombre del puesto
      const fileName = `QR_Temporal_${position.name.replace(/\s+/g, "_")}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      alert("Hubo un error al generar el PDF. Por favor, inténtelo de nuevo.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Formatear fecha de expiración
  const formatExpirationDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  // Calcular tiempo restante
  const getRemainingTime = (expiresAt) => {
    const now = Date.now()
    const remaining = expiresAt - now

    if (remaining <= 0) {
      return "Expirado"
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} día${days !== 1 ? "s" : ""} y ${hours % 24} hora${hours % 24 !== 1 ? "s" : ""}`
    }

    return `${hours} hora${hours !== 1 ? "s" : ""} y ${minutes} minuto${minutes !== 1 ? "s" : ""}`
  }

  // Obtener color según tiempo restante
  const getTimeColor = (expiresAt) => {
    const now = Date.now()
    const remaining = expiresAt - now

    if (remaining <= 0) {
      return "text-red-600"
    }

    const hours = remaining / (1000 * 60 * 60)

    if (hours <= 1) {
      return "text-red-600" // Menos de 1 hora
    } else if (hours <= 3) {
      return "text-orange-500" // Menos de 3 horas
    } else if (hours <= 12) {
      return "text-yellow-500" // Menos de 12 horas
    } else {
      return "text-green-600" // Más de 12 horas
    }
  }

  // Obtener texto del modo de trabajo
  const getModeText = (mode) => {
    switch (mode) {
      case "remote":
        return "Teletrabajo"
      case "hybrid":
        return "Híbrido"
      case "onsite":
      default:
        return "Presencial"
    }
  }

  // Obtener color del badge del modo
  const getModeColor = (mode) => {
    switch (mode) {
      case "remote":
        return "bg-purple-100 text-purple-800"
      case "hybrid":
        return "bg-blue-100 text-blue-800"
      case "onsite":
      default:
        return "bg-green-100 text-green-800"
    }
  }

  return (
    <div className="temporary-position-manager">
      <div className="section-header">
        <h2>Puestos de Trabajo Temporales</h2>
        <Tooltip content="Los puestos temporales son ideales para eventos, obras o ubicaciones que solo necesitan control de presencia por un tiempo limitado">
          <span className="help-icon ml-1">?</span>
        </Tooltip>
      </div>

      <div className="positions-list">
        {temporaryPositions.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Modo</th>
                <th>Expira en</th>
                <th>Código QR</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {temporaryPositions.map((position) => (
                <tr key={position.id}>
                  <td>{position.name}</td>
                  <td>{position.location || "-"}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${getModeColor(position.mode)}`}>
                      {getModeText(position.mode)}
                    </span>
                  </td>
                  <td className={getTimeColor(position.expiresAt)}>
                    {getRemainingTime(position.expiresAt)}
                    <div className="text-xs text-gray-500">{formatExpirationDate(position.expiresAt)}</div>
                  </td>
                  <td>
                    <div className="qr-container">
                      <div className="qr-small" onClick={() => setExpandedQR(position)} title="Click para ampliar">
                        <img src={position.qrUrl || "/placeholder.svg"} alt="QR" width="60" height="60" />
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      className="action-btn small"
                      onClick={() => {
                        setPositionToExtend(position)
                        setShowExtendModal(true)
                      }}
                    >
                      Extender
                    </button>
                    <button
                      className="action-btn small danger"
                      onClick={() => {
                        setPositionToDelete(position)
                        setShowDeleteConfirmation(true)
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>No hay puestos temporales creados.</p>
          </div>
        )}
      </div>

      {showForm ? (
        <div className="add-position-form">
          <h3>Nuevo Puesto Temporal</h3>
          <div className="form-group">
            <label htmlFor="position-name">
              Nombre:
              <span className="text-red-500 ml-1">*</span>
              <Tooltip content="Introduce un nombre descriptivo para el puesto temporal">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <input
              type="text"
              id="position-name"
              value={newPosition.name}
              onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
              className={formErrors.name ? "input-error" : ""}
            />
            {formErrors.name && <p className="error-message">{formErrors.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="position-location">
              Ubicación:
              <Tooltip content="Especifica dónde se encuentra este puesto (opcional)">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <input
              type="text"
              id="position-location"
              value={newPosition.location}
              onChange={(e) => setNewPosition({ ...newPosition, location: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="position-mode">
              Modo de trabajo:
              <Tooltip content="Selecciona si este puesto es presencial, remoto o híbrido">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <select
              id="position-mode"
              value={newPosition.mode}
              onChange={(e) => setNewPosition({ ...newPosition, mode: e.target.value })}
            >
              <option value="onsite">Presencial</option>
              <option value="remote">Teletrabajo</option>
              <option value="hybrid">Híbrido</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="position-expires">
              Duración (horas):
              <span className="text-red-500 ml-1">*</span>
              <Tooltip content="Tiempo de validez del puesto temporal en horas">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <input
              type="number"
              id="position-expires"
              value={newPosition.expiresIn}
              onChange={(e) => setNewPosition({ ...newPosition, expiresIn: Number.parseInt(e.target.value) || 0 })}
              min="1"
              max="720" // 30 días
              className={formErrors.expiresIn ? "input-error" : ""}
            />
            {formErrors.expiresIn && <p className="error-message">{formErrors.expiresIn}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="qr-template">
              Plantilla de QR:
              <Tooltip content="Selecciona una plantilla para el código QR">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <select id="qr-template" value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
              {qrTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          {formErrors.submit && <p className="error-message">{formErrors.submit}</p>}
          <div className="form-actions">
            <button onClick={handleCreatePosition} className="action-btn">
              Crear Puesto Temporal
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setFormErrors({})
                setNewPosition({
                  name: "",
                  location: "",
                  mode: "onsite",
                  expiresIn: 24,
                })
              }}
              className="action-btn secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="section-actions">
          <button onClick={() => setShowForm(true)} className="action-btn">
            Crear Puesto Temporal
          </button>
        </div>
      )}

      {/* Instrucciones de uso */}
      <div className="temporary-position-info">
        <h3>¿Qué son los puestos temporales?</h3>
        <p>
          Los puestos temporales son ubicaciones de trabajo que solo necesitan control de presencia durante un período
          limitado. Son ideales para:
        </p>
        <ul>
          <li>Eventos y ferias</li>
          <li>Obras y construcciones</li>
          <li>Proyectos con duración definida</li>
          <li>Ubicaciones temporales de trabajo</li>
        </ul>
        <p>
          Cada puesto temporal genera un código QR único que expira automáticamente después del tiempo establecido. Los
          trabajadores pueden fichar en estos puestos de la misma manera que en los puestos permanentes.
        </p>
        <div className="info-box warning">
          <h4>Importante</h4>
          <p>
            Los puestos temporales se eliminan automáticamente después de su fecha de expiración. Asegúrese de extender
            la duración si necesita mantener el puesto activo por más tiempo.
          </p>
        </div>
      </div>

      {/* Modal de QR ampliado */}
      {expandedQR && (
        <div className="qr-modal">
          <div className="qr-modal-content">
            <h3>{expandedQR.name}</h3>
            <p>Ubicación: {expandedQR.location || "-"}</p>
            <p>Modo: {getModeText(expandedQR.mode)}</p>
            <p className={`${getTimeColor(expandedQR.expiresAt)} font-semibold`}>
              Expira en: {getRemainingTime(expandedQR.expiresAt)}
            </p>
            <div className="qr-large" id={`qr-${expandedQR.id}`} ref={qrRef}>
              <img src={expandedQR.qrUrl || "/placeholder.svg"} alt="QR" width="200" height="200" />
            </div>
            <div className="qr-modal-actions">
              <button onClick={() => handleDownloadQR(expandedQR)} className="action-btn" disabled={isGeneratingPDF}>
                {isGeneratingPDF ? "Generando PDF..." : "Descargar PDF"}
              </button>
              <button onClick={() => setExpandedQR(null)} className="action-btn secondary">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeletePosition}
        title="Eliminar puesto temporal"
        message={`¿Estás seguro de que deseas eliminar el puesto temporal "${positionToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de extensión de tiempo */}
      <Modal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} title="Extender duración">
        {positionToExtend && (
          <div className="extend-form">
            <p>
              Puesto: <strong>{positionToExtend.name}</strong>
            </p>
            <p className={getTimeColor(positionToExtend.expiresAt)}>
              Tiempo restante actual: {getRemainingTime(positionToExtend.expiresAt)}
            </p>
            <div className="form-group">
              <label htmlFor="extension-hours">
                Añadir horas:
                <Tooltip content="Número de horas a añadir a la duración actual">
                  <span className="help-icon ml-1">?</span>
                </Tooltip>
              </label>
              <input
                type="number"
                id="extension-hours"
                value={extensionHours}
                onChange={(e) => setExtensionHours(Number.parseInt(e.target.value) || 0)}
                min="1"
                max="720" // 30 días
              />
            </div>
            <div className="form-actions">
              <button onClick={handleExtendPosition} className="action-btn" disabled={extensionHours <= 0}>
                Extender
              </button>
              <button onClick={() => setShowExtendModal(false)} className="action-btn secondary">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TemporaryPositionManager
