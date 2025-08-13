/**
 * @fileoverview Servicio para la generación de códigos QR
 * con soporte para diferentes formatos, estilos y optimizaciones.
 */

import QRCode from "qrcode"
import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getData, setData } from "./storage/baseStorage"

// Constantes para tipos de QR
export const QR_TYPES = {
  POSITION: "position",
  WORKER: "worker",
  TEMPORARY: "temporary",
  SPECIAL: "special",
}

// Plantillas predefinidas para QR
export const QR_TEMPLATES = {
  STANDARD: "standard",
  HIGH_CONTRAST: "high_contrast",
  OUTDOOR: "outdoor",
  FACTORY: "factory",
}

// Opciones por defecto para generación de QR
const DEFAULT_QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 4,
  scale: 8,
  color: {
    dark: "#000000",
    light: "#ffffff",
  },
}

/**
 * Genera un código QR básico a partir de datos
 * @param {Object|string} data - Datos a codificar en el QR
 * @param {Object} options - Opciones de generación
 * @returns {Promise<string>} - URL de datos del QR generado
 */
export const generateBasicQR = async (data, options = {}) => {
  try {
    // Convertir datos a string JSON si es un objeto
    const qrData = typeof data === "string" ? data : JSON.stringify(data)

    // Combinar opciones por defecto con las proporcionadas
    const qrOptions = {
      ...DEFAULT_QR_OPTIONS,
      ...options,
    }

    // Generar QR como URL de datos
    const dataURL = await QRCode.toDataURL(qrData, qrOptions)
    return dataURL
  } catch (error) {
    console.error("Error al generar código QR básico:", error)
    throw new Error("No se pudo generar el código QR")
  }
}

/**
 * Genera un código QR para un puesto de trabajo
 * @param {Object} positionData - Datos del puesto
 * @param {Object} options - Opciones adicionales
 * @returns {Object} - Datos del QR generado
 */
export const generatePositionQR = async (positionData, options = {}) => {
  try {
    if (!positionData || !positionData.positionId) {
      throw new Error("Datos de puesto incompletos")
    }

    // Crear objeto con datos esenciales y timestamp
    const qrPayload = {
      type: QR_TYPES.POSITION,
      id: positionData.positionId,
      name: positionData.positionName || "Puesto sin nombre",
      location: positionData.positionLocation || "",
      companyId: positionData.companyId || "default",
      timestamp: new Date().toISOString(),
      temporary: positionData.temporary || false,
      validFrom: positionData.validFrom || null,
      validUntil: positionData.validUntil || null,
    }

    // Añadir firma digital si está habilitada
    if (options.signed) {
      qrPayload.signature = generateQRSignature(qrPayload)
    }

    // Generar QR con opciones específicas para puestos
    const template = options.templateType || QR_TEMPLATES.STANDARD
    const qrOptions = getTemplateOptions(template, options)

    const dataURL = await generateBasicQR(qrPayload, qrOptions)

    // Registrar generación en historial si está habilitado
    if (options.trackGeneration !== false) {
      recordQRGeneration(qrPayload, template)
    }

    return {
      data: qrPayload,
      dataURL,
      template,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error al generar QR para puesto:", error)
    throw new Error(`No se pudo generar el QR para el puesto: ${error.message}`)
  }
}

/**
 * Genera un código QR temporal con fecha de expiración
 * @param {Object} data - Datos a incluir en el QR
 * @param {string} template - Plantilla a utilizar
 * @returns {Promise<string>} - URL de datos del QR generado
 */
export const generateTemporaryQR = async (data, template = QR_TEMPLATES.STANDARD) => {
  try {
    // Añadir información de temporalidad
    const temporaryData = {
      ...data,
      type: QR_TYPES.TEMPORARY,
      generatedAt: new Date().toISOString(),
      expiresAt: data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    // Usar opciones específicas para QR temporales
    const qrOptions = getTemplateOptions(template, {
      margin: 2, // Margen reducido para QR temporales
      scale: 6,
    })

    // Generar QR
    const dataURL = await generateBasicQR(temporaryData, qrOptions)

    // Registrar en historial
    recordQRGeneration(temporaryData, template)

    return dataURL
  } catch (error) {
    console.error("Error al generar QR temporal:", error)
    throw new Error("No se pudo generar el QR temporal")
  }
}

/**
 * Genera un QR visual con instrucciones y diseño personalizado
 * @param {Object} data - Datos a incluir en el QR
 * @param {Object} options - Opciones de personalización
 * @returns {Promise<Object>} - Datos del QR generado
 */
export const generateVisualQR = async (data, options = {}) => {
  try {
    // Generar QR básico primero
    const qrPayload = {
      ...data,
      timestamp: new Date().toISOString(),
    }

    // Obtener opciones de plantilla
    const templateType = options.templateType || QR_TEMPLATES.STANDARD
    const qrOptions = getTemplateOptions(templateType, options)

    // Generar QR básico
    const dataURL = await generateBasicQR(qrPayload, qrOptions)

    // Información para renderizado visual
    const visualInfo = {
      instructions: options.instructions || "Escanea para fichar",
      colorAccent: options.colorAccent || "#3498db",
      logo: options.logo || null,
      printable: options.printable !== false,
    }

    return {
      data: qrPayload,
      dataURL,
      visual: visualInfo,
      template: templateType,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error al generar QR visual:", error)
    throw new Error("No se pudo generar el QR visual")
  }
}

/**
 * Obtiene opciones de QR según la plantilla seleccionada
 * @param {string} templateType - Tipo de plantilla
 * @param {Object} customOptions - Opciones personalizadas
 * @returns {Object} - Opciones configuradas
 */
export const getTemplateOptions = (templateType, customOptions = {}) => {
  // Opciones base según plantilla
  let templateOptions = { ...DEFAULT_QR_OPTIONS }

  switch (templateType) {
    case QR_TEMPLATES.HIGH_CONTRAST:
      templateOptions = {
        ...templateOptions,
        errorCorrectionLevel: "Q",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        margin: 6,
        scale: 10,
      }
      break
    case QR_TEMPLATES.OUTDOOR:
      templateOptions = {
        ...templateOptions,
        errorCorrectionLevel: "H", // Mayor corrección para exteriores
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        margin: 8,
        scale: 12,
      }
      break
    case QR_TEMPLATES.FACTORY:
      templateOptions = {
        ...templateOptions,
        errorCorrectionLevel: "H",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        margin: 10,
        scale: 14,
      }
      break
    default:
      // Plantilla estándar, usar opciones por defecto
      break
  }

  // Sobrescribir con opciones personalizadas
  return {
    ...templateOptions,
    ...customOptions,
  }
}

/**
 * Genera una firma digital para el QR
 * @param {Object} data - Datos a firmar
 * @returns {string} - Firma generada
 */
export const generateQRSignature = (data) => {
  try {
    // Implementación básica de firma
    // En producción, usar una biblioteca criptográfica adecuada
    const dataString = JSON.stringify(data)
    let signature = ""

    // Simulación simple de firma
    for (let i = 0; i < dataString.length; i++) {
      signature += dataString.charCodeAt(i).toString(16)
    }

    return signature.substring(0, 32) // Limitar longitud
  } catch (error) {
    console.error("Error al generar firma:", error)
    return ""
  }
}

/**
 * Registra la generación de un QR en el historial
 * @param {Object} data - Datos del QR
 * @param {string} template - Plantilla utilizada
 */
export const recordQRGeneration = (data, template) => {
  try {
    // Obtener historial existente
    const qrHistory = getData(STORAGE_KEYS.QR_HISTORY, [])

    // Añadir nuevo registro
    qrHistory.push({
      id: uuidv4(),
      type: data.type,
      targetId: data.id,
      targetName: data.name,
      template,
      timestamp: new Date().toISOString(),
      user: data.user || "system",
    })

    // Limitar tamaño del historial (mantener últimos 100)
    if (qrHistory.length > 100) {
      qrHistory.splice(0, qrHistory.length - 100)
    }

    // Guardar historial actualizado
    setData(STORAGE_KEYS.QR_HISTORY, qrHistory)
  } catch (error) {
    console.error("Error al registrar generación de QR:", error)
  }
}

/**
 * Obtiene el historial de generación de QR
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} - Historial filtrado
 */
export const getQRGenerationHistory = (filters = {}) => {
  try {
    const qrHistory = getData(STORAGE_KEYS.QR_HISTORY, [])

    // Aplicar filtros si existen
    if (Object.keys(filters).length === 0) {
      return qrHistory
    }

    return qrHistory.filter((record) => {
      let matches = true

      if (filters.type && record.type !== filters.type) {
        matches = false
      }

      if (filters.targetId && record.targetId !== filters.targetId) {
        matches = false
      }

      if (filters.template && record.template !== filters.template) {
        matches = false
      }

      if (filters.fromDate) {
        const recordDate = new Date(record.timestamp)
        const fromDate = new Date(filters.fromDate)
        if (recordDate < fromDate) {
          matches = false
        }
      }

      if (filters.toDate) {
        const recordDate = new Date(record.timestamp)
        const toDate = new Date(filters.toDate)
        if (recordDate > toDate) {
          matches = false
        }
      }

      return matches
    })
  } catch (error) {
    console.error("Error al obtener historial de QR:", error)
    return []
  }
}

/**
 * Limpia el historial de generación de QR
 * @param {number} olderThanDays - Eliminar registros más antiguos que estos días
 * @returns {number} - Número de registros eliminados
 */
export const clearQRGenerationHistory = (olderThanDays = 30) => {
  try {
    const qrHistory = getData(STORAGE_KEYS.QR_HISTORY, [])
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const filteredHistory = qrHistory.filter((record) => {
      const recordDate = new Date(record.timestamp)
      return recordDate >= cutoffDate
    })

    const removedCount = qrHistory.length - filteredHistory.length

    if (removedCount > 0) {
      setData(STORAGE_KEYS.QR_HISTORY, filteredHistory)
    }

    return removedCount
  } catch (error) {
    console.error("Error al limpiar historial de QR:", error)
    return 0
  }
}

export const qrGenerationService = {
  generateBasicQR,
  generatePositionQR,
  generateTemporaryQR,
  generateVisualQR,
  getTemplateOptions,
  generateQRSignature,
  recordQRGeneration,
  getQRGenerationHistory,
  clearQRGenerationHistory,
  QR_TYPES,
  QR_TEMPLATES,
}

export default qrGenerationService
