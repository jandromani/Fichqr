/**
 * @fileoverview Servicio para escaneo y procesamiento de códigos QR
 * con validación, verificación de integridad y manejo de errores.
 */

import jsQR from "jsqr"
import { compressionService } from "./compressionService"
import { securityUtils } from "../utils/securityUtils"
import { deviceCapabilityService } from "./deviceCapabilityService"
import { storageService } from "./storageService"
import { v4 as uuidv4 } from "uuid"
import { STORAGE_KEYS } from "./storage/constants"
import { getData, setData } from "./storage/baseStorage"
import { QR_TYPES } from "./qrGenerationService"

// Constantes para resultados de escaneo
export const SCAN_RESULT = {
  SUCCESS: "success",
  INVALID_FORMAT: "invalid_format",
  EXPIRED: "expired",
  UNKNOWN_TYPE: "unknown_type",
  INVALID_SIGNATURE: "invalid_signature",
  DUPLICATE: "duplicate",
  ERROR: "error",
}

/**
 * Procesa un código QR escaneado
 * @param {string} qrData - Datos del QR escaneado
 * @param {Object} options - Opciones de procesamiento
 * @returns {Object} - Resultado del procesamiento
 */
export const processScannedQR = (qrData, options = {}) => {
  try {
    // Intentar parsear los datos del QR
    let parsedData
    try {
      parsedData = typeof qrData === "string" ? JSON.parse(qrData) : qrData
    } catch (error) {
      return {
        success: false,
        result: SCAN_RESULT.INVALID_FORMAT,
        message: "Formato de QR inválido",
        error: "Los datos no son un JSON válido",
      }
    }

    // Verificar que tenga un tipo válido
    if (!parsedData.type || !Object.values(QR_TYPES).includes(parsedData.type)) {
      return {
        success: false,
        result: SCAN_RESULT.UNKNOWN_TYPE,
        message: "Tipo de QR desconocido",
        data: parsedData,
      }
    }

    // Verificar firma si está presente y se requiere verificación
    if (options.verifySignature && parsedData.signature) {
      const isValid = verifyQRSignature(parsedData)
      if (!isValid) {
        return {
          success: false,
          result: SCAN_RESULT.INVALID_SIGNATURE,
          message: "Firma del QR inválida",
          data: parsedData,
        }
      }
    }

    // Verificar expiración para QR temporales
    if (parsedData.type === QR_TYPES.TEMPORARY && parsedData.expiresAt) {
      const expiryDate = new Date(parsedData.expiresAt)
      if (expiryDate < new Date()) {
        return {
          success: false,
          result: SCAN_RESULT.EXPIRED,
          message: "QR temporal expirado",
          data: parsedData,
          expiryDate: parsedData.expiresAt,
        }
      }
    }

    // Verificar duplicados si está habilitado
    if (options.checkDuplicates && isDuplicateScan(parsedData)) {
      return {
        success: false,
        result: SCAN_RESULT.DUPLICATE,
        message: "QR ya escaneado recientemente",
        data: parsedData,
      }
    }

    // Registrar escaneo exitoso
    if (options.recordScan !== false) {
      recordQRScan(parsedData, SCAN_RESULT.SUCCESS)
    }

    // Devolver resultado exitoso
    return {
      success: true,
      result: SCAN_RESULT.SUCCESS,
      message: "QR procesado correctamente",
      data: parsedData,
      scannedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error al procesar QR escaneado:", error)
    return {
      success: false,
      result: SCAN_RESULT.ERROR,
      message: "Error al procesar el QR",
      error: error.message,
    }
  }
}

/**
 * Verifica la firma digital de un QR
 * @param {Object} data - Datos del QR con firma
 * @returns {boolean} - true si la firma es válida
 */
export const verifyQRSignature = (data) => {
  try {
    // Clonar datos sin la firma
    const { signature, ...dataWithoutSignature } = data

    // Regenerar firma y comparar
    const expectedSignature = generateQRSignature(dataWithoutSignature)
    return signature === expectedSignature
  } catch (error) {
    console.error("Error al verificar firma de QR:", error)
    return false
  }
}

/**
 * Genera una firma digital para verificación
 * @param {Object} data - Datos a firmar
 * @returns {string} - Firma generada
 */
export const generateQRSignature = (data) => {
  try {
    // Implementación básica de firma (debe coincidir con la de qrGenerationService)
    const dataString = JSON.stringify(data)
    let signature = ""

    for (let i = 0; i < dataString.length; i++) {
      signature += dataString.charCodeAt(i).toString(16)
    }

    return signature.substring(0, 32)
  } catch (error) {
    console.error("Error al generar firma:", error)
    return ""
  }
}

/**
 * Verifica si un QR ya ha sido escaneado recientemente
 * @param {Object} data - Datos del QR
 * @returns {boolean} - true si es un escaneo duplicado
 */
export const isDuplicateScan = (data) => {
  try {
    // Obtener historial reciente de escaneos
    const scanHistory = getData(STORAGE_KEYS.QR_SCAN_HISTORY, [])

    // Buscar escaneos recientes del mismo QR
    const recentScans = scanHistory.filter((scan) => {
      // Verificar si es el mismo QR
      const isSameQR = scan.data.id === data.id && scan.data.type === data.type

      // Verificar si es reciente (últimos 5 minutos)
      const scanTime = new Date(scan.timestamp)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const isRecent = scanTime > fiveMinutesAgo

      return isSameQR && isRecent
    })

    return recentScans.length > 0
  } catch (error) {
    console.error("Error al verificar duplicados:", error)
    return false
  }
}

/**
 * Registra un escaneo de QR en el historial
 * @param {Object} data - Datos del QR escaneado
 * @param {string} result - Resultado del escaneo
 */
export const recordQRScan = (data, result) => {
  try {
    // Obtener historial existente
    const scanHistory = getData(STORAGE_KEYS.QR_SCAN_HISTORY, [])

    // Añadir nuevo registro
    scanHistory.push({
      id: uuidv4(),
      data,
      result,
      timestamp: new Date().toISOString(),
      device: getDeviceInfo(),
    })

    // Limitar tamaño del historial (mantener últimos 100)
    if (scanHistory.length > 100) {
      scanHistory.splice(0, scanHistory.length - 100)
    }

    // Guardar historial actualizado
    setData(STORAGE_KEYS.QR_SCAN_HISTORY, scanHistory)
  } catch (error) {
    console.error("Error al registrar escaneo de QR:", error)
  }
}

/**
 * Obtiene información básica del dispositivo
 * @returns {Object} - Información del dispositivo
 */
export const getDeviceInfo = () => {
  try {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error al obtener información del dispositivo:", error)
    return {}
  }
}

/**
 * Obtiene el historial de escaneos de QR
 * @param {Object} filters - Filtros opcionales
 * @returns {Array} - Historial filtrado
 */
export const getQRScanHistory = (filters = {}) => {
  try {
    const scanHistory = getData(STORAGE_KEYS.QR_SCAN_HISTORY, [])

    // Aplicar filtros si existen
    if (Object.keys(filters).length === 0) {
      return scanHistory
    }

    return scanHistory.filter((record) => {
      let matches = true

      if (filters.result && record.result !== filters.result) {
        matches = false
      }

      if (filters.type && record.data.type !== filters.type) {
        matches = false
      }

      if (filters.id && record.data.id !== filters.id) {
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
    console.error("Error al obtener historial de escaneos:", error)
    return []
  }
}

/**
 * Limpia el historial de escaneos de QR
 * @param {number} olderThanDays - Eliminar registros más antiguos que estos días
 * @returns {number} - Número de registros eliminados
 */
export const clearQRScanHistory = (olderThanDays = 7) => {
  try {
    const scanHistory = getData(STORAGE_KEYS.QR_SCAN_HISTORY, [])
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const filteredHistory = scanHistory.filter((record) => {
      const recordDate = new Date(record.timestamp)
      return recordDate >= cutoffDate
    })

    const removedCount = scanHistory.length - filteredHistory.length

    if (removedCount > 0) {
      setData(STORAGE_KEYS.QR_SCAN_HISTORY, filteredHistory)
    }

    return removedCount
  } catch (error) {
    console.error("Error al limpiar historial de escaneos:", error)
    return 0
  }
}

/**
 * Servicio para la lectura optimizada de códigos QR
 */
export const qrScanningService = {
  /**
   * Configuración actual del escáner
   */
  scannerConfig: {
    attemptBorderDetection: true,
    attemptToRotate: true,
    brightnessCompensation: false,
    contrastEnhancement: false,
    multiSampling: false,
    samplingRate: 1,
    processingWorker: null,
  },

  /**
   * Inicializa el servicio de escaneo con configuración óptima
   * basada en las capacidades del dispositivo
   */
  initialize: () => {
    const deviceCapabilities = deviceCapabilityService.getDeviceCapabilities()

    // Ajustar configuración según capacidades del dispositivo
    qrScanningService.scannerConfig.multiSampling = !deviceCapabilities.hasHighPerformanceCPU
    qrScanningService.scannerConfig.samplingRate = deviceCapabilities.hasHighPerformanceCPU ? 2 : 1
    qrScanningService.scannerConfig.brightnessCompensation = !deviceCapabilities.hasHighQualityCamera
    qrScanningService.scannerConfig.contrastEnhancement = !deviceCapabilities.hasHighQualityCamera

    // Inicializar worker si el dispositivo lo soporta
    if (deviceCapabilities.supportsWebWorkers && window.Worker) {
      try {
        // Aquí se inicializaría un Web Worker para procesamiento en segundo plano
        // qrScanningService.processingWorker = new Worker('qrProcessingWorker.js');
      } catch (error) {
        console.warn("No se pudo inicializar Web Worker para procesamiento de QR:", error)
      }
    }

    return qrScanningService.scannerConfig
  },

  /**
   * Procesa un frame de video para detectar códigos QR
   * @param {ImageData} imageData - Datos de imagen del frame de video
   * @returns {Promise<Object|null>} - Datos decodificados del QR o null si no se detecta
   */
  processVideoFrame: async (imageData) => {
    try {
      // Aplicar mejoras de imagen si es necesario
      const processedImageData = qrScanningService.enhanceImageIfNeeded(imageData)

      // Detectar código QR en la imagen
      const code = jsQR(processedImageData.data, processedImageData.width, processedImageData.height, {
        inversionAttempts: "dontInvert", // Puede ser "attemptBoth" para mayor robustez
      })

      if (!code) {
        return null
      }

      // Descomprimir y verificar los datos
      return await qrScanningService.decodeQRData(code.data)
    } catch (error) {
      console.error("Error al procesar frame para detección de QR:", error)
      return null
    }
  },

  /**
   * Mejora la imagen para mejor detección en condiciones adversas
   * @param {ImageData} imageData - Datos de imagen original
   * @returns {ImageData} - Datos de imagen mejorados
   */
  enhanceImageIfNeeded: (imageData) => {
    // Crear copia de los datos para no modificar el original
    const enhancedData = new Uint8ClampedArray(imageData.data)
    const { width, height } = imageData

    // Aplicar mejoras según la configuración
    if (qrScanningService.scannerConfig.brightnessCompensation) {
      // Algoritmo simple para aumentar brillo en condiciones de baja luz
      for (let i = 0; i < enhancedData.length; i += 4) {
        enhancedData[i] = Math.min(enhancedData[i] + 20, 255) // R
        enhancedData[i + 1] = Math.min(enhancedData[i + 1] + 20, 255) // G
        enhancedData[i + 2] = Math.min(enhancedData[i + 2] + 20, 255) // B
      }
    }

    if (qrScanningService.scannerConfig.contrastEnhancement) {
      // Algoritmo simple para mejorar contraste
      const factor = 1.2
      for (let i = 0; i < enhancedData.length; i += 4) {
        enhancedData[i] = Math.min(Math.max(((enhancedData[i] / 255 - 0.5) * factor + 0.5) * 255, 0), 255)
        enhancedData[i + 1] = Math.min(Math.max(((enhancedData[i + 1] / 255 - 0.5) * factor + 0.5) * 255, 0), 255)
        enhancedData[i + 2] = Math.min(Math.max(((enhancedData[i + 2] / 255 - 0.5) * factor + 0.5) * 255, 0), 255)
      }
    }

    return new ImageData(enhancedData, width, height)
  },

  /**
   * Decodifica y verifica los datos de un código QR
   * @param {string} rawData - Datos crudos del código QR
   * @returns {Promise<Object|null>} - Datos decodificados y verificados o null si son inválidos
   */
  decodeQRData: async (rawData) => {
    try {
      // Intentar descomprimir los datos (asumiendo que están comprimidos)
      let jsonData
      try {
        const decompressedData = await compressionService.decompressData(rawData)
        jsonData = JSON.parse(decompressedData)
      } catch (e) {
        // Si falla la descompresión, intentar parsear directamente (podría ser un QR antiguo)
        jsonData = JSON.parse(rawData)
      }

      // Verificar si el QR tiene firma digital
      if (jsonData.signature) {
        const { signature, ...dataToVerify } = jsonData
        const isValid = await securityUtils.verifySignature(JSON.stringify(dataToVerify), signature)

        if (!isValid) {
          console.warn("QR con firma inválida detectado")
          return {
            ...jsonData,
            isValid: false,
            validationMessage: "Firma digital inválida",
          }
        }
      }

      // Verificar si el QR pertenece a la empresa actual
      const currentCompanyId = storageService.getCompanyId() || "default"
      if (jsonData.companyId && jsonData.companyId !== currentCompanyId) {
        return {
          ...jsonData,
          isValid: false,
          validationMessage: "QR pertenece a otra empresa",
        }
      }

      return {
        ...jsonData,
        isValid: true,
        scannedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error al decodificar datos de QR:", error)
      return {
        isValid: false,
        validationMessage: "Formato de QR no reconocido",
        error: error.message,
      }
    }
  },

  /**
   * Configura los parámetros óptimos para la cámara
   * @param {MediaStreamTrack} videoTrack - Track de video de la cámara
   * @returns {Promise<void>}
   */
  optimizeCameraForQR: async (videoTrack) => {
    try {
      const capabilities = videoTrack.getCapabilities()
      const settings = {}

      // Configurar enfoque automático continuo si está disponible
      if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
        settings.focusMode = "continuous"
      }

      // Optimizar para QR: priorizar nitidez sobre exposición
      if (capabilities.whiteBalanceMode) {
        settings.whiteBalanceMode = "auto"
      }

      // Ajustar exposición para QR (valores medios suelen funcionar mejor)
      if (capabilities.exposureMode) {
        settings.exposureMode = "auto"
      }

      // Configurar resolución óptima (no demasiado alta para mejor rendimiento)
      const deviceCapabilities = deviceCapabilityService.getDeviceCapabilities()
      if (capabilities.width && capabilities.height) {
        // Usar resolución media en dispositivos de bajo rendimiento
        if (!deviceCapabilities.hasHighPerformanceCPU) {
          settings.width = { ideal: 640 }
          settings.height = { ideal: 480 }
        } else {
          settings.width = { ideal: 1280 }
          settings.height = { ideal: 720 }
        }
      }

      // Aplicar configuración
      await videoTrack.applyConstraints(settings)
    } catch (error) {
      console.warn("No se pudieron aplicar configuraciones óptimas a la cámara:", error)
    }
  },
  processScannedQR,
  verifyQRSignature,
  isDuplicateScan,
  recordQRScan,
  getQRScanHistory,
  clearQRScanHistory,
  SCAN_RESULT,
}

export default qrScanningService
