"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import i18n from "../services/i18n/i18n" // Importar directamente la instancia de i18n

// Definición de idiomas disponibles
export const supportedLanguages = [
  { code: "es", name: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "en", name: "English", flag: "🇬🇧", dir: "ltr" },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  { code: "ur", name: "اردو", flag: "🇵🇰", dir: "rtl" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪", dir: "ltr" },
  { code: "ha", name: "Hausa", flag: "🇳🇬", dir: "ltr" },
]

// Crear el contexto
const LanguageContext = createContext()

// Hook personalizado para usar el contexto
export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage debe usarse dentro de un LanguageProvider")
  }
  return context
}

// Proveedor del contexto
export const LanguageProvider = ({ children }) => {
  const { t, i18n: i18nextInstance } = useTranslation()
  const [language, setLanguage] = useState(i18nextInstance.language || "es")
  const [isRTL, setIsRTL] = useState(false)

  // Cambiar el idioma
  const changeLanguage = async (lng) => {
    try {
      // Cambiar el idioma en i18next usando la instancia importada
      await i18n.changeLanguage(lng)

      // Actualizar el estado
      setLanguage(lng)

      // Verificar si es un idioma RTL
      const langInfo = supportedLanguages.find((l) => l.code === lng)
      setIsRTL(langInfo?.dir === "rtl")

      // Actualizar la dirección del documento
      document.documentElement.dir = langInfo?.dir || "ltr"
      document.documentElement.lang = lng

      // Guardar la preferencia en localStorage
      localStorage.setItem("i18nextLng", lng)

      return true
    } catch (error) {
      console.error("Error al cambiar el idioma:", error)
      return false
    }
  }

  // Formatear fecha según el idioma actual
  const formatDate = (date, options = {}) => {
    if (!date) return ""

    const dateObj = typeof date === "string" ? new Date(date) : date

    try {
      return new Intl.DateTimeFormat(language, options).format(dateObj)
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return dateObj.toLocaleDateString()
    }
  }

  // Formatear número según el idioma actual
  const formatNumber = (number, options = {}) => {
    if (number === undefined || number === null) return ""

    try {
      return new Intl.NumberFormat(language, options).format(number)
    } catch (error) {
      console.error("Error al formatear número:", error)
      return number.toString()
    }
  }

  // Efecto para inicializar el idioma
  useEffect(() => {
    const initLanguage = async () => {
      // Obtener el idioma guardado o detectado
      const detectedLanguage = localStorage.getItem("i18nextLng") || navigator.language
      const languageCode = detectedLanguage.split("-")[0] // Obtener solo el código de idioma (es-ES -> es)

      // Verificar si el idioma está soportado
      const isSupported = supportedLanguages.some((l) => l.code === languageCode)
      const langToUse = isSupported ? languageCode : "es" // Usar español como fallback

      // Cambiar al idioma detectado
      await changeLanguage(langToUse)
    }

    initLanguage()
  }, [])

  // Valor del contexto
  const value = {
    language,
    supportedLanguages,
    changeLanguage,
    formatDate,
    formatNumber,
    isRTL,
    t,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export default LanguageContext
