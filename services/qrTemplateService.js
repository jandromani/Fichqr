/**
 * Servicio para gestionar plantillas de códigos QR
 * Permite crear, editar y aplicar plantillas personalizadas a los códigos QR
 */

import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getData, setData } from "./storage/baseStorage"
import { qrGenerationService } from "./qrGenerationService"

// Plantillas predefinidas
const DEFAULT_TEMPLATES = [
  {
    id: "template_standard",
    name: "Estándar",
    description: "Plantilla básica para uso general",
    config: qrGenerationService.QR_TEMPLATES.STANDARD,
    customization: {
      colorFilter: "#000000",
      overlay: null,
      instructions: {
        title: "Escanee para fichar",
        text: "Utilice la cámara de su smartphone",
      },
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "template_outdoor",
    name: "Exterior",
    description: "Optimizado para uso en exteriores",
    config: qrGenerationService.QR_TEMPLATES.OUTDOOR,
    customization: {
      colorFilter: "#000000",
      overlay: null,
      instructions: {
        title: "Escanee para fichar",
        text: "Utilice la cámara de su smartphone",
      },
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "template_factory",
    name: "Fábrica",
    description: "Alta visibilidad para entornos industriales",
    config: qrGenerationService.QR_TEMPLATES.FACTORY,
    customization: {
      colorFilter: "#ff6700",
      overlay: null,
      instructions: {
        title: "Escanee para fichar",
        text: "Utilice la cámara de su smartphone",
      },
    },
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
]

/**
 * Inicializa las plantillas predeterminadas si no existen
 */
const initializeDefaultTemplates = () => {
  const templates = getData(STORAGE_KEYS.QR_TEMPLATES, [])

  // Si no hay plantillas, crear las predeterminadas
  if (templates.length === 0) {
    setData(STORAGE_KEYS.QR_TEMPLATES, DEFAULT_TEMPLATES)
    return DEFAULT_TEMPLATES
  }

  // Asegurarse de que existen las plantillas predeterminadas
  let updated = false
  const existingIds = templates.map((t) => t.id)

  const updatedTemplates = [...templates]

  DEFAULT_TEMPLATES.forEach((defaultTemplate) => {
    if (!existingIds.includes(defaultTemplate.id)) {
      updatedTemplates.push(defaultTemplate)
      updated = true
    }
  })

  if (updated) {
    setData(STORAGE_KEYS.QR_TEMPLATES, updatedTemplates)
    return updatedTemplates
  }

  return templates
}

/**
 * Obtiene todas las plantillas disponibles
 * @returns {Array} - Lista de plantillas
 */
const getAllTemplates = () => {
  const templates = getData(STORAGE_KEYS.QR_TEMPLATES, [])

  // Si no hay plantillas, inicializar las predeterminadas
  if (templates.length === 0) {
    return initializeDefaultTemplates()
  }

  return templates
}

/**
 * Obtiene una plantilla por su ID
 * @param {string} id - ID de la plantilla
 * @returns {Object|null} - Plantilla encontrada o null
 */
const getTemplateById = (id) => {
  const templates = getAllTemplates()
  return templates.find((template) => template.id === id) || null
}

/**
 * Crea una nueva plantilla
 * @param {Object} templateData - Datos de la plantilla
 * @returns {Object} - Plantilla creada
 */
const createTemplate = (templateData) => {
  const templates = getAllTemplates()

  const newTemplate = {
    id: templateData.id || `template_${uuidv4()}`,
    name: templateData.name || "Nueva Plantilla",
    description: templateData.description || "",
    config: templateData.config || qrGenerationService.QR_TEMPLATES.STANDARD,
    customization: {
      colorFilter: templateData.customization?.colorFilter || "#000000",
      overlay: templateData.customization?.overlay || null,
      instructions: {
        title: templateData.customization?.instructions?.title || "Escanee para fichar",
        text: templateData.customization?.instructions?.text || "Utilice la cámara de su smartphone",
      },
    },
    isDefault: false,
    createdAt: new Date().toISOString(),
  }

  templates.push(newTemplate)
  setData(STORAGE_KEYS.QR_TEMPLATES, templates)

  return newTemplate
}

/**
 * Actualiza una plantilla existente
 * @param {string} id - ID de la plantilla
 * @param {Object} updates - Actualizaciones a aplicar
 * @returns {Object|null} - Plantilla actualizada o null
 */
const updateTemplate = (id, updates) => {
  const templates = getAllTemplates()
  const index = templates.findIndex((template) => template.id === id)

  if (index === -1) return null

  // No permitir modificar plantillas predeterminadas
  if (templates[index].isDefault) {
    console.warn("No se pueden modificar las plantillas predeterminadas")
    return null
  }

  // Actualizar la plantilla
  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  setData(STORAGE_KEYS.QR_TEMPLATES, templates)
  return templates[index]
}

/**
 * Elimina una plantilla
 * @param {string} id - ID de la plantilla
 * @returns {boolean} - true si se eliminó correctamente
 */
const deleteTemplate = (id) => {
  const templates = getAllTemplates()
  const template = templates.find((t) => t.id === id)

  // No permitir eliminar plantillas predeterminadas
  if (template && template.isDefault) {
    console.warn("No se pueden eliminar las plantillas predeterminadas")
    return false
  }

  const filteredTemplates = templates.filter((template) => template.id !== id)

  if (filteredTemplates.length === templates.length) {
    return false // No se encontró la plantilla
  }

  setData(STORAGE_KEYS.QR_TEMPLATES, filteredTemplates)
  return true
}

/**
 * Aplica una plantilla a los datos de un código QR
 * @param {Object} qrData - Datos del código QR
 * @param {string} templateId - ID de la plantilla
 * @returns {Object} - Datos del QR con la plantilla aplicada
 */
const applyTemplate = (qrData, templateId) => {
  const template = getTemplateById(templateId)

  if (!template) {
    console.warn(`Plantilla con ID ${templateId} no encontrada`)
    return qrData
  }

  return {
    ...qrData,
    template: templateId,
    config: template.config,
    customization: template.customization,
  }
}

/**
 * Duplica una plantilla existente
 * @param {string} id - ID de la plantilla a duplicar
 * @returns {Object|null} - Nueva plantilla o null
 */
const duplicateTemplate = (id) => {
  const template = getTemplateById(id)

  if (!template) return null

  const { id: oldId, createdAt, updatedAt, ...templateData } = template

  return createTemplate({
    ...templateData,
    name: `${template.name} (Copia)`,
    isDefault: false,
  })
}

/**
 * Guarda una plantilla (nueva o actualizada)
 * @param {Object} template - Plantilla a guardar
 * @returns {Object} - Plantilla guardada
 */
const saveTemplate = (template) => {
  if (template.id) {
    // Actualizar plantilla existente
    const result = updateTemplate(template.id, template)
    if (!result) {
      throw new Error("No se pudo actualizar la plantilla")
    }
    return result
  } else {
    // Crear nueva plantilla
    return createTemplate(template)
  }
}

/**
 * Genera una vista previa de la plantilla
 * @param {Object} template - Plantilla para generar vista previa
 * @returns {string} - URL de la imagen de vista previa
 */
const generateTemplatePreview = async (template) => {
  try {
    // Datos de ejemplo para la vista previa
    const previewData = {
      url: "https://ejemplo.com/fichaje?id=preview",
      positionName: "Puesto de ejemplo",
      timestamp: new Date().toISOString(),
    }

    // Aplicar la plantilla a los datos de ejemplo
    const qrData = {
      ...previewData,
      config: template.config,
      customization: template.customization,
    }

    // Generar el código QR
    const qrImage = await qrGenerationService.generateQRCode(qrData.url, qrData.config, qrData.customization)

    return qrImage
  } catch (error) {
    console.error("Error al generar vista previa de plantilla:", error)
    return null
  }
}

export const qrTemplateService = {
  initializeDefaultTemplates,
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplate,
  duplicateTemplate,
  saveTemplate,
  generateTemplatePreview,
}

export default qrTemplateService
