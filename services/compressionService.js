/**
 * Servicio para comprimir y descomprimir datos
 * Utiliza algoritmos eficientes para reducir el tamaño de los datos almacenados
 */

// Función simple para comprimir datos usando LZW
const compressLZW = (input) => {
  if (!input) return ""

  // Convertir a string si no lo es
  const str = typeof input === "string" ? input : JSON.stringify(input)

  // Diccionario inicial con todos los caracteres ASCII
  const dictionary = {}
  for (let i = 0; i < 256; i++) {
    dictionary[String.fromCharCode(i)] = i
  }

  let currentPhrase = ""
  const result = []
  let dictSize = 256

  for (let i = 0; i < str.length; i++) {
    const currentChar = str[i]
    const phrase = currentPhrase + currentChar

    if (dictionary[phrase] !== undefined) {
      currentPhrase = phrase
    } else {
      result.push(dictionary[currentPhrase])
      dictionary[phrase] = dictSize++
      currentPhrase = currentChar
    }
  }

  if (currentPhrase !== "") {
    result.push(dictionary[currentPhrase])
  }

  return result
}

// Función para descomprimir datos comprimidos con LZW
const decompressLZW = (compressed) => {
  if (!compressed || !Array.isArray(compressed) || compressed.length === 0) return ""

  // Diccionario inicial con todos los caracteres ASCII
  const dictionary = {}
  for (let i = 0; i < 256; i++) {
    dictionary[i] = String.fromCharCode(i)
  }

  const currentCode = compressed[0]
  let oldPhrase = dictionary[currentCode]
  let result = oldPhrase
  let phrase
  let dictSize = 256

  for (let i = 1; i < compressed.length; i++) {
    const currentCode = compressed[i]

    if (dictionary[currentCode] !== undefined) {
      phrase = dictionary[currentCode]
    } else {
      phrase = oldPhrase + oldPhrase[0]
    }

    result += phrase
    dictionary[dictSize++] = oldPhrase + phrase[0]
    oldPhrase = phrase
  }

  return result
}

/**
 * Comprime un objeto o array para reducir su tamaño en almacenamiento
 * @param {Object|Array} data - Datos a comprimir
 * @param {boolean} addMetadata - Si se debe añadir metadatos de compresión
 * @returns {Object} Datos comprimidos con metadatos
 */
export const compressData = (data, addMetadata = true) => {
  try {
    if (!data) return data

    const startTime = performance.now()
    const originalSize = JSON.stringify(data).length

    // Comprimir los datos
    const compressed = compressLZW(data)

    // Calcular tamaño comprimido (aproximado)
    const compressedSize = JSON.stringify(compressed).length
    const endTime = performance.now()

    // Resultado con o sin metadatos
    if (addMetadata) {
      return {
        data: compressed,
        meta: {
          compressed: true,
          algorithm: "LZW",
          originalSize,
          compressedSize,
          compressionRatio: (compressedSize / originalSize).toFixed(2),
          timestamp: new Date().toISOString(),
          compressionTime: (endTime - startTime).toFixed(2) + "ms",
        },
      }
    } else {
      return {
        data: compressed,
        compressed: true,
      }
    }
  } catch (error) {
    console.error("Error al comprimir datos:", error)
    // En caso de error, devolver los datos originales
    return { data, compressed: false, error: error.message }
  }
}

/**
 * Descomprime datos previamente comprimidos
 * @param {Object} compressedData - Datos comprimidos con metadatos
 * @returns {Object|Array} Datos originales descomprimidos
 */
export const decompressData = (compressedData) => {
  try {
    // Verificar si los datos están comprimidos
    if (!compressedData || !compressedData.compressed) {
      return compressedData
    }

    // Descomprimir los datos
    const decompressed = decompressLZW(compressedData.data)

    // Convertir de vuelta a objeto/array si es necesario
    try {
      return JSON.parse(decompressed)
    } catch {
      // Si no es JSON válido, devolver como string
      return decompressed
    }
  } catch (error) {
    console.error("Error al descomprimir datos:", error)
    // En caso de error, devolver los datos comprimidos
    return compressedData
  }
}

/**
 * Comprime un conjunto de registros históricos para ahorrar espacio
 * @param {Array} records - Registros a comprimir
 * @param {Object} options - Opciones de compresión
 * @returns {Object} Objeto con registros comprimidos y metadatos
 */
export const compressHistoricalRecords = (records, options = {}) => {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return { records: [], compressed: false }
  }

  try {
    const startTime = performance.now()

    // Separar registros recientes (no comprimir) y antiguos (comprimir)
    const currentDate = new Date()
    const recentCutoff = new Date()
    recentCutoff.setDate(currentDate.getDate() - (options.recentDays || 30)) // Por defecto, 30 días

    const recentRecords = []
    const oldRecords = []

    records.forEach((record) => {
      const recordDate = new Date(record.date || record.createdAt || record.timestamp)
      if (recordDate >= recentCutoff) {
        recentRecords.push(record)
      } else {
        oldRecords.push(record)
      }
    })

    // Comprimir solo los registros antiguos
    const compressedOldRecords =
      oldRecords.length > 0 ? compressData(oldRecords, false) : { data: [], compressed: false }

    const endTime = performance.now()

    // Devolver estructura con metadatos
    return {
      recent: recentRecords,
      historical: compressedOldRecords,
      meta: {
        totalRecords: records.length,
        recentRecords: recentRecords.length,
        historicalRecords: oldRecords.length,
        compressionTime: (endTime - startTime).toFixed(2) + "ms",
        compressionDate: new Date().toISOString(),
        recentCutoffDate: recentCutoff.toISOString(),
      },
    }
  } catch (error) {
    console.error("Error al comprimir registros históricos:", error)
    // En caso de error, devolver los registros originales
    return { records, compressed: false, error: error.message }
  }
}

/**
 * Descomprime un conjunto de registros históricos
 * @param {Object} compressedRecords - Estructura con registros recientes y antiguos comprimidos
 * @returns {Array} Todos los registros descomprimidos
 */
export const decompressHistoricalRecords = (compressedRecords) => {
  if (!compressedRecords) return []

  try {
    // Si es un array simple, devolverlo directamente
    if (Array.isArray(compressedRecords)) {
      return compressedRecords
    }

    // Si tiene la estructura esperada
    if (compressedRecords.recent && compressedRecords.historical) {
      const recentRecords = compressedRecords.recent || []

      // Descomprimir registros históricos
      let historicalRecords = []
      if (compressedRecords.historical.compressed) {
        historicalRecords = decompressData(compressedRecords.historical) || []
      } else {
        historicalRecords = compressedRecords.historical.data || []
      }

      // Combinar y ordenar por fecha
      return [...recentRecords, ...historicalRecords].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || a.timestamp)
        const dateB = new Date(b.date || b.createdAt || b.timestamp)
        return dateB - dateA // Orden descendente (más reciente primero)
      })
    }

    // Si no tiene la estructura esperada, devolver lo que haya
    return compressedRecords.records || compressedRecords
  } catch (error) {
    console.error("Error al descomprimir registros históricos:", error)
    // En caso de error, intentar devolver algo útil
    if (compressedRecords.recent) {
      return compressedRecords.recent
    }
    return []
  }
}

/**
 * Función simple para comprimir un string
 * @param {string} str - String a comprimir
 * @returns {string} String comprimido
 */
export const compress = async (str) => {
  try {
    if (!str) return str
    const compressed = compressLZW(str)
    return JSON.stringify(compressed)
  } catch (error) {
    console.error("Error al comprimir string:", error)
    return str
  }
}

/**
 * Función simple para descomprimir un string
 * @param {string} compressedStr - String comprimido
 * @returns {string} String descomprimido
 */
export const decompress = async (compressedStr) => {
  try {
    if (!compressedStr) return compressedStr
    const compressed = JSON.parse(compressedStr)
    return decompressLZW(compressed)
  } catch (error) {
    console.error("Error al descomprimir string:", error)
    return compressedStr
  }
}

// Crear y exportar el objeto compressionService para mantener consistencia con otros servicios
export const compressionService = {
  compressData,
  decompressData,
  compressHistoricalRecords,
  decompressHistoricalRecords,
  compress,
  decompress,
}

// También mantener la exportación por defecto para compatibilidad
export default compressionService
