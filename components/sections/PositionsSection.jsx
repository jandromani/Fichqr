"use client"

import { useState, useEffect, useRef } from "react"
import QRCode from "react-qr-code"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import Tooltip from "../ui/Tooltip"
import ConfirmationModal from "../ui/ConfirmationModal"
import { sanitizeInput } from "../../utils/securityUtils"
import Modal from "../ui/Modal"

// Importar el servicio de almacenamiento
import { positionService } from "../../services/storage"
// Modificar la función para recibir props
function PositionsSection({ addPosition }) {
  // Estado para el formulario de nuevo puesto
  const [newPosition, setNewPosition] = useState({
    name: "",
    location: "",
    mode: "onsite", // Valor por defecto: presencial
  })
  const [showForm, setShowForm] = useState(false)

  // Estado para validación del formulario
  const [formErrors, setFormErrors] = useState({})

  // Estado para controlar qué QR se muestra ampliado
  const [expandedQR, setExpandedQR] = useState(null)

  // Estado para controlar la carga durante la generación del PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Estado para el modal de confirmación de eliminación
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [positionToDelete, setPositionToDelete] = useState(null)

  // Estado para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState(null)

  // Referencia para el elemento QR que queremos convertir a imagen
  const qrRef = useRef(null)

  // Estado local para posiciones
  const [localPositions, setLocalPositions] = useState([])

  // Mock user object (replace with actual user data fetching)
  const [user, setUser] = useState({ companyId: "unknown" }) // Default value

  // Cargar posiciones desde localStorage al montar el componente
  useEffect(() => {
    const storedPositions = positionService.getAll()
    setLocalPositions(storedPositions)
  }, [])

  // Función para generar la URL completa para un puesto
  const generatePositionUrl = (positionId) => {
    // Usamos window.location.origin para obtener la base de la URL actual
    // Esto funciona tanto en desarrollo como en producción
    return `${window.location.origin}/?positionId=${positionId}`
  }

  // Función para validar el formulario
  const validateForm = () => {
    const errors = {}

    if (!newPosition.name.trim()) {
      errors.name = "El nombre del puesto es obligatorio"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Función para añadir un nuevo puesto
  const handleAddPosition = () => {
    // Validar el formulario
    if (!validateForm()) {
      return
    }

    // Sanitizar entradas
    const sanitizedName = sanitizeInput(newPosition.name)
    const sanitizedLocation = sanitizeInput(newPosition.location)
    const sanitizedMode = sanitizeInput(newPosition.mode)

    // Crear el nuevo puesto
    const position = {
      id: `pos${Date.now()}`, // Generamos un ID único basado en timestamp
      name: sanitizedName,
      location: sanitizedLocation || "",
      mode: sanitizedMode || "onsite", // Modo: presencial o remoto
      companyId: user?.companyId || "unknown", // Añadir el ID de empresa
    }

    // Guardar en localStorage usando el servicio
    positionService.add(position)

    // Actualizar el estado local
    setLocalPositions([...localPositions, position])

    // Llamar a la función que viene de props (para compatibilidad)
    if (addPosition) {
      addPosition(position)
    }

    // Limpiamos el formulario
    setNewPosition({ name: "", location: "", mode: "onsite" })
    setShowForm(false)
    setFormErrors({})
  }

  // Función para abrir el modal de edición
  const handleEditClick = (position) => {
    setEditingPosition({
      id: position.id,
      name: position.name,
      location: position.location || "",
      mode: position.mode || "onsite",
    })
    setShowEditModal(true)
  }

  // Función para guardar los cambios de edición
  const handleSaveEdit = () => {
    // Validar que el nombre no esté vacío
    if (!editingPosition.name.trim()) {
      return
    }

    // Sanitizar entradas
    const sanitizedName = sanitizeInput(editingPosition.name)
    const sanitizedLocation = sanitizeInput(editingPosition.location)
    const sanitizedMode = sanitizeInput(editingPosition.mode)

    // Actualizar la posición en localStorage
    positionService.update(editingPosition.id, {
      name: sanitizedName,
      location: sanitizedLocation,
      mode: sanitizedMode,
      updatedAt: new Date().toISOString(),
    })

    // Actualizar la posición en el estado local
    const updatedPositions = localPositions.map((pos) =>
      pos.id === editingPosition.id
        ? {
            ...pos,
            name: sanitizedName,
            location: sanitizedLocation,
            mode: sanitizedMode,
            updatedAt: new Date().toISOString(),
          }
        : pos,
    )

    setLocalPositions(updatedPositions)

    // Cerrar el modal
    setShowEditModal(false)
    setEditingPosition(null)
  }

  // Función para confirmar la eliminación de un puesto
  const handleDeleteClick = (position) => {
    setPositionToDelete(position)
    setShowDeleteConfirmation(true)
  }

  // Función para eliminar un puesto
  const handleDeletePosition = () => {
    if (!positionToDelete) return

    // Eliminar la posición de localStorage
    positionService.remove(positionToDelete.id)

    // Eliminar la posición del estado local
    const updatedPositions = localPositions.filter((pos) => pos.id !== positionToDelete.id)
    setLocalPositions(updatedPositions)

    // Cerrar el modal
    setShowDeleteConfirmation(false)
    setPositionToDelete(null)
  }

  // Función para mostrar/ocultar QR ampliado
  const toggleExpandQR = (positionId) => {
    if (expandedQR === positionId) {
      setExpandedQR(null)
    } else {
      setExpandedQR(positionId)
    }
  }

  // Función para generar y descargar el QR como PDF
  const handleDownloadQR = async (position) => {
    try {
      setIsGeneratingPDF(true)

      // Obtenemos el elemento QR que queremos convertir a imagen
      const qrElement = document.getElementById(`qr-${position.id}`)

      if (!qrElement) {
        console.error("No se encontró el elemento QR")
        setIsGeneratingPDF(false)
        return
      }

      // Convertimos el elemento QR a un canvas usando html2canvas
      const canvas = await html2canvas(qrElement, {
        scale: 3, // Mayor escala para mejor calidad
        backgroundColor: "#ffffff",
      })

      // Convertimos el canvas a una imagen en formato base64
      const imgData = canvas.toDataURL("image/png")

      // Creamos un nuevo documento PDF (A4 por defecto)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
      })

      // Configuramos el tamaño de página y márgenes
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20 // margen en mm

      // Añadimos el título (nombre del puesto)
      pdf.setFontSize(24)
      pdf.setTextColor(0, 102, 204) // Color azul similar al de la aplicación
      const title = `Puesto: ${position.name}`
      pdf.text(title, pageWidth / 2, margin + 10, { align: "center" })

      // Añadimos la ubicación si existe
      if (position.location) {
        pdf.setFontSize(16)
        pdf.setTextColor(51, 51, 51) // Color gris oscuro
        pdf.text(`Ubicación: ${position.location}`, pageWidth / 2, margin + 20, { align: "center" })
      }

      // Añadimos el modo de trabajo
      pdf.setFontSize(16)
      pdf.setTextColor(51, 51, 51)
      pdf.text(
        `Modo: ${position.mode === "remote" ? "Teletrabajo" : "Presencial"}`,
        pageWidth / 2,
        margin + (position.location ? 30 : 20),
        { align: "center" },
      )

      // Calculamos el tamaño del QR (queremos que sea grande pero que quepa en la página)
      const qrSize = Math.min(pageWidth - 2 * margin, 150) // máximo 150mm o el ancho disponible

      // Calculamos la posición para centrar el QR
      const qrX = (pageWidth - qrSize) / 2
      const qrY = margin + (position.location ? 40 : 30) // Dejamos espacio para el título, ubicación y modo

      // Añadimos la imagen del QR al PDF
      pdf.addImage(imgData, "PNG", qrX, qrY, qrSize, qrSize)

      // Añadimos la URL debajo del QR
      pdf.setFontSize(10)
      pdf.setTextColor(102, 102, 102) // Color gris
      const url = generatePositionUrl(position.id)
      pdf.text(url, pageWidth / 2, qrY + qrSize + 10, { align: "center" })

      // Añadimos instrucciones
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      const instructions = [
        "Instrucciones:",
        "1. Imprima este código QR y colóquelo en un lugar visible en el puesto de trabajo.",
        "2. Los trabajadores pueden escanear este código con la cámara de su smartphone.",
        "3. Al escanear, se abrirá automáticamente la aplicación de fichaje para este puesto.",
        "4. No es necesario instalar ninguna aplicación especial para escanear el código.",
      ]

      let yPos = qrY + qrSize + 25
      instructions.forEach((line) => {
        pdf.text(line, margin, yPos)
        yPos += 7
      })

      // Añadimos un pie de página con la fecha de generación
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      const today = new Date().toLocaleDateString()
      pdf.text(`Generado el ${today}`, pageWidth / 2, pageHeight - 10, { align: "center" })

      // Guardamos el PDF con un nombre que incluye el nombre del puesto
      const fileName = `QR_${position.name.replace(/\s+/g, "_")}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      alert("Hubo un error al generar el PDF. Por favor, inténtelo de nuevo.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Función para obtener el texto del modo de trabajo
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

  // Función para obtener el color del badge del modo
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
    <div className="section">
      <h2>Mis Puestos de Trabajo</h2>

      <div className="positions-list">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Ubicación</th>
              <th>Modo</th>
              <th>Código QR</th>
              <th>
                Acciones
                <Tooltip
                  content="Aquí puedes editar o eliminar puestos de trabajo, así como generar y descargar códigos QR para cada puesto."
                  position="top"
                >
                  <span className="help-icon ml-1">?</span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {localPositions.map((position) => (
              <tr key={position.id}>
                <td>{position.name}</td>
                <td>{position.location}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs ${getModeColor(position.mode)}`}>
                    {getModeText(position.mode)}
                  </span>
                </td>
                <td>
                  <div className="qr-container">
                    {/* QR pequeño que se puede expandir */}
                    <div className="qr-small" onClick={() => toggleExpandQR(position.id)} title="Click para ampliar">
                      <QRCode value={generatePositionUrl(position.id)} size={60} id={`qr-small-${position.id}`} />
                    </div>

                    {/* QR ampliado (modal) */}
                    {expandedQR === position.id && (
                      <div className="qr-modal">
                        <div className="qr-modal-content">
                          <h3>{position.name}</h3>
                          <p>Ubicación: {position.location}</p>
                          <p>Modo: {getModeText(position.mode)}</p>
                          <div className="qr-large" id={`qr-${position.id}`} ref={qrRef}>
                            <QRCode value={generatePositionUrl(position.id)} size={200} />
                          </div>
                          <p className="qr-url">{generatePositionUrl(position.id)}</p>
                          <div className="qr-modal-actions">
                            <button
                              onClick={() => handleDownloadQR(position)}
                              className="action-btn"
                              disabled={isGeneratingPDF}
                            >
                              {isGeneratingPDF ? "Generando PDF..." : "Descargar PDF"}
                            </button>
                            <button onClick={() => setExpandedQR(null)} className="action-btn secondary">
                              Cerrar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <button className="action-btn small" onClick={() => handleEditClick(position)}>
                    Editar
                  </button>
                  <button className="action-btn small danger" onClick={() => handleDeleteClick(position)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="add-position-form">
          <h3>Nuevo Puesto</h3>
          <div className="form-group">
            <label htmlFor="position-name">
              Nombre:
              <span className="text-red-500 ml-1">*</span>
              <Tooltip content="Introduce un nombre descriptivo para el puesto de trabajo">
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
          <div className="form-actions">
            <button onClick={handleAddPosition} className="action-btn">
              Guardar
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setFormErrors({})
                setNewPosition({ name: "", location: "", mode: "onsite" })
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
            Añadir Puesto
          </button>
        </div>
      )}

      {/* Instrucciones de uso */}
      <div className="qr-instructions">
        <h3>¿Cómo funciona el fichaje con QR?</h3>
        <ol>
          <li>Genera el código QR para cada puesto de trabajo haciendo clic en el QR pequeño.</li>
          <li>Descarga el QR como PDF e imprímelo.</li>
          <li>Coloca el QR impreso en un lugar visible en el puesto de trabajo físico.</li>
          <li>Los trabajadores escanean el QR con la cámara de su smartphone.</li>
          <li>
            Al escanear, se abrirá automáticamente la aplicación con la pantalla de fichaje para ese puesto específico.
          </li>
          <li>El trabajador puede entonces iniciar o finalizar su jornada con un solo clic.</li>
        </ol>
        <p>
          <strong>Nota:</strong> No es necesario instalar ninguna aplicación especial de lectura de QR. La mayoría de
          smartphones modernos pueden escanear códigos QR directamente desde la aplicación de cámara.
        </p>
      </div>

      {/* Instrucciones para teletrabajo */}
      <div className="remote-work-instructions mt-4 p-4 bg-purple-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-purple-800">Fichaje en Teletrabajo</h3>
        <p className="mb-2">
          Para los puestos configurados como "Teletrabajo", los empleados pueden fichar desde cualquier ubicación:
        </p>
        <ul className="list-disc pl-5 mb-2">
          <li>Comparte el enlace del puesto directamente con los trabajadores remotos.</li>
          <li>Los trabajadores pueden guardar el enlace en sus favoritos para acceder fácilmente.</li>
          <li>El sistema registrará datos adicionales para garantizar la trazabilidad del fichaje remoto.</li>
          <li>No es necesario verificar la ubicación física para puestos de teletrabajo.</li>
        </ul>
        <p className="text-sm text-purple-700">
          <strong>Recomendación:</strong> Establece políticas claras sobre los horarios de teletrabajo y la
          disponibilidad esperada.
        </p>
      </div>

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeletePosition}
        title="Eliminar puesto"
        message={`¿Estás seguro de que deseas eliminar el puesto "${positionToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de edición */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Puesto">
        {editingPosition && (
          <div className="edit-position-form">
            <div className="form-group">
              <label htmlFor="edit-position-name">
                Nombre:
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                id="edit-position-name"
                value={editingPosition.name}
                onChange={(e) => setEditingPosition({ ...editingPosition, name: e.target.value })}
                className={!editingPosition.name.trim() ? "input-error" : ""}
              />
              {!editingPosition.name.trim() && <p className="error-message">El nombre del puesto es obligatorio</p>}
            </div>
            <div className="form-group">
              <label htmlFor="edit-position-location">Ubicación:</label>
              <input
                type="text"
                id="edit-position-location"
                value={editingPosition.location}
                onChange={(e) => setEditingPosition({ ...editingPosition, location: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-position-mode">Modo de trabajo:</label>
              <select
                id="edit-position-mode"
                value={editingPosition.mode}
                onChange={(e) => setEditingPosition({ ...editingPosition, mode: e.target.value })}
              >
                <option value="onsite">Presencial</option>
                <option value="remote">Teletrabajo</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </div>
            <div className="form-actions">
              <button onClick={handleSaveEdit} className="action-btn" disabled={!editingPosition.name.trim()}>
                Guardar Cambios
              </button>
              <button onClick={() => setShowEditModal(false)} className="action-btn secondary">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PositionsSection
