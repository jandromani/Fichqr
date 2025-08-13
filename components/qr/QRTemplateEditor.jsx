"use client"

/**
 * Componente para crear y editar plantillas personalizadas de códigos QR
 * Permite configurar colores, instrucciones y optimizaciones para diferentes entornos
 */

import { useState, useEffect } from "react"
import { qrTemplateService } from "../../services/qrTemplateService"
import { qrGenerationService } from "../../services/qrGenerationService"
import Tooltip from "../ui/Tooltip"
import ConfirmationModal from "../ui/ConfirmationModal"

const QRTemplateEditor = ({ onSave, onCancel }) => {
  // Estado para la plantilla actual
  const [template, setTemplate] = useState({
    id: null,
    name: "",
    description: "",
    config: qrGenerationService.QR_TEMPLATES.STANDARD,
    customization: {
      colorFilter: "#000000",
      overlay: null,
      instructions: {
        title: "Escanee para fichar",
        text: "Utilice la cámara de su smartphone",
      },
    },
    isDefault: false,
  })

  // Estado para la vista previa
  const [previewUrl, setPreviewUrl] = useState("")

  // Estado para la lista de plantillas existentes
  const [templates, setTemplates] = useState([])

  // Estado para la plantilla seleccionada (para editar)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")

  // Estado para errores de validación
  const [errors, setErrors] = useState({})

  // Estado para el modal de confirmación
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  // Cargar plantillas al montar el componente
  useEffect(() => {
    loadTemplates()
  }, [])

  // Generar vista previa cuando cambia la plantilla
  useEffect(() => {
    generatePreview()
  }, [template])

  // Cargar plantillas existentes
  const loadTemplates = () => {
    try {
      const availableTemplates = qrTemplateService.getAllTemplates()
      setTemplates(availableTemplates)
    } catch (error) {
      console.error("Error al cargar plantillas:", error)
    }
  }

  // Generar vista previa de la plantilla
  const generatePreview = async () => {
    try {
      const previewImage = await qrTemplateService.generateTemplatePreview(template)
      setPreviewUrl(previewImage)
    } catch (error) {
      console.error("Error al generar vista previa:", error)
    }
  }

  // Manejar cambios en los campos del formulario
  const handleChange = (field, value) => {
    setTemplate((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Limpiar error si se corrige
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }))
    }
  }

  // Manejar cambios en la configuración
  const handleConfigChange = (configType) => {
    setTemplate((prev) => ({
      ...prev,
      config: qrGenerationService.QR_TEMPLATES[configType],
    }))
  }

  // Manejar cambios en la personalización
  const handleCustomizationChange = (field, value) => {
    setTemplate((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        [field]: value,
      },
    }))
  }

  // Manejar cambios en las instrucciones
  const handleInstructionChange = (field, value) => {
    setTemplate((prev) => ({
      ...prev,
      customization: {
        ...prev.customization,
        instructions: {
          ...prev.customization.instructions,
          [field]: value,
        },
      },
    }))
  }

  // Cargar una plantilla existente para editar
  const loadTemplate = (templateId) => {
    if (!templateId) {
      // Resetear a valores por defecto
      setTemplate({
        id: null,
        name: "",
        description: "",
        config: qrGenerationService.QR_TEMPLATES.STANDARD,
        customization: {
          colorFilter: "#000000",
          overlay: null,
          instructions: {
            title: "Escanee para fichar",
            text: "Utilice la cámara de su smartphone",
          },
        },
        isDefault: false,
      })
      return
    }

    const selectedTemplate = templates.find((t) => t.id === templateId)
    if (selectedTemplate) {
      setTemplate(selectedTemplate)
    }
  }

  // Validar el formulario
  const validateForm = () => {
    const newErrors = {}

    if (!template.name.trim()) {
      newErrors.name = "El nombre de la plantilla es obligatorio"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Guardar la plantilla
  const handleSave = () => {
    if (!validateForm()) {
      return
    }

    try {
      const savedTemplate = qrTemplateService.saveTemplate(template)

      // Actualizar la lista de plantillas
      loadTemplates()

      // Notificar al componente padre
      if (onSave) {
        onSave(savedTemplate)
      }

      // Resetear el formulario
      setTemplate({
        id: null,
        name: "",
        description: "",
        config: qrGenerationService.QR_TEMPLATES.STANDARD,
        customization: {
          colorFilter: "#000000",
          overlay: null,
          instructions: {
            title: "Escanee para fichar",
            text: "Utilice la cámara de su smartphone",
          },
        },
        isDefault: false,
      })

      setSelectedTemplateId("")
    } catch (error) {
      console.error("Error al guardar plantilla:", error)
      setErrors({ submit: `Error al guardar: ${error.message}` })
    }
  }

  // Eliminar una plantilla
  const handleDelete = () => {
    if (!template.id) return

    try {
      const isDeleted = qrTemplateService.deleteTemplate(template.id)

      if (isDeleted) {
        // Actualizar la lista de plantillas
        loadTemplates()

        // Resetear el formulario
        setTemplate({
          id: null,
          name: "",
          description: "",
          config: qrGenerationService.QR_TEMPLATES.STANDARD,
          customization: {
            colorFilter: "#000000",
            overlay: null,
            instructions: {
              title: "Escanee para fichar",
              text: "Utilice la cámara de su smartphone",
            },
          },
          isDefault: false,
        })

        setSelectedTemplateId("")
      }
    } catch (error) {
      console.error("Error al eliminar plantilla:", error)
      setErrors({ submit: `Error al eliminar: ${error.message}` })
    } finally {
      setShowDeleteConfirmation(false)
    }
  }

  return (
    <div className="qr-template-editor">
      <div className="editor-header">
        <h3>{template.id ? "Editar Plantilla" : "Nueva Plantilla"}</h3>
      </div>

      <div className="editor-content">
        <div className="template-form">
          <div className="form-group">
            <label htmlFor="template-select">
              Plantillas existentes:
              <Tooltip content="Seleccione una plantilla para editarla o cree una nueva">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <select
              id="template-select"
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value)
                loadTemplate(e.target.value)
              }}
              className="select-input"
            >
              <option value="">-- Nueva plantilla --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isDefault ? "(Predeterminada)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="template-name">
              Nombre:
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="template-name"
              value={template.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`text-input ${errors.name ? "input-error" : ""}`}
              placeholder="Nombre de la plantilla"
              disabled={template.isDefault}
            />
            {errors.name && <p className="error-message">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="template-description">Descripción:</label>
            <textarea
              id="template-description"
              value={template.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="text-area"
              placeholder="Descripción de la plantilla"
              disabled={template.isDefault}
            />
          </div>

          <div className="form-group">
            <label>
              Tipo de QR:
              <Tooltip content="Seleccione el tipo de QR según el entorno donde se utilizará">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="qr-type"
                  checked={template.config.type === "standard"}
                  onChange={() => handleConfigChange("STANDARD")}
                  disabled={template.isDefault}
                />
                Estándar
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="qr-type"
                  checked={template.config.type === "high_density"}
                  onChange={() => handleConfigChange("HIGH_DENSITY")}
                  disabled={template.isDefault}
                />
                Alta Densidad
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="qr-type"
                  checked={template.config.type === "print_optimized"}
                  onChange={() => handleConfigChange("PRINT_OPTIMIZED")}
                  disabled={template.isDefault}
                />
                Optimizado para Impresión
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="qr-type"
                  checked={template.config.type === "outdoor"}
                  onChange={() => handleConfigChange("OUTDOOR")}
                  disabled={template.isDefault}
                />
                Exteriores
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="qr-type"
                  checked={template.config.type === "factory"}
                  onChange={() => handleConfigChange("FACTORY")}
                  disabled={template.isDefault}
                />
                Entorno Industrial
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="qr-color">
              Color del QR:
              <Tooltip content="Personalice el color del código QR">
                <span className="help-icon ml-1">?</span>
              </Tooltip>
            </label>
            <input
              type="color"
              id="qr-color"
              value={template.customization.colorFilter}
              onChange={(e) => handleCustomizationChange("colorFilter", e.target.value)}
              className="color-input"
              disabled={template.isDefault}
            />
          </div>

          <div className="form-group">
            <label htmlFor="instruction-title">Título de instrucciones:</label>
            <input
              type="text"
              id="instruction-title"
              value={template.customization.instructions.title}
              onChange={(e) => handleInstructionChange("title", e.target.value)}
              className="text-input"
              placeholder="Escanee para fichar"
              disabled={template.isDefault}
            />
          </div>

          <div className="form-group">
            <label htmlFor="instruction-text">Texto de instrucciones:</label>
            <input
              type="text"
              id="instruction-text"
              value={template.customization.instructions.text}
              onChange={(e) => handleInstructionChange("text", e.target.value)}
              className="text-input"
              placeholder="Utilice la cámara de su smartphone"
              disabled={template.isDefault}
            />
          </div>

          {errors.submit && <p className="error-message">{errors.submit}</p>}

          <div className="form-actions">
            <button onClick={handleSave} className="action-btn primary" disabled={template.isDefault}>
              {template.id ? "Actualizar" : "Guardar"}
            </button>

            {template.id && !template.isDefault && (
              <button onClick={() => setShowDeleteConfirmation(true)} className="action-btn danger">
                Eliminar
              </button>
            )}

            <button onClick={onCancel} className="action-btn secondary">
              Cancelar
            </button>
          </div>
        </div>

        <div className="template-preview">
          <h4>Vista Previa</h4>
          <div className="preview-container">
            {previewUrl ? (
              <img src={previewUrl || "/placeholder.svg"} alt="Vista previa de QR" className="preview-image" />
            ) : (
              <div className="preview-loading">Generando vista previa...</div>
            )}
          </div>

          <div className="preview-info">
            <p>
              <strong>Tipo:</strong> {template.config.name}
            </p>
            <p>
              <strong>Corrección de errores:</strong>{" "}
              {template.config.errorCorrectionLevel === "L"
                ? "Baja (7%)"
                : template.config.errorCorrectionLevel === "M"
                  ? "Media (15%)"
                  : template.config.errorCorrectionLevel === "Q"
                    ? "Alta (25%)"
                    : "Máxima (30%)"}
            </p>
            <p>
              <strong>Color:</strong>{" "}
              <span className="color-preview" style={{ backgroundColor: template.customization.colorFilter }}></span>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDelete}
        title="Eliminar plantilla"
        message={`¿Estás seguro de que deseas eliminar la plantilla "${template.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  )
}

export default QRTemplateEditor
