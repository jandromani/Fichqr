import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

// Importamos solo los idiomas que tenemos disponibles
import translationES from "./locales/es/translation.json"
import translationEN from "./locales/en/translation.json"

// Recursos de idiomas disponibles
const resources = {
  es: {
    translation: translationES,
  },
  en: {
    translation: translationEN,
  },
}

// Inicializar i18next
i18n
  .use(LanguageDetector) // Detecta el idioma del navegador
  .use(initReactI18next) // Pasa i18n a react-i18next
  .init({
    resources,
    fallbackLng: "es", // Idioma de respaldo
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false, // No es necesario para React
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false, // Evita problemas con SSR
    },
    // Importante: asegurarse de que las claves no traducidas se muestren con un valor por defecto
    // en lugar de mostrar la clave
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
    saveMissing: true,
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      console.warn(`Clave de traducción faltante: ${key}`)
      return fallbackValue || key
    },
  })

export default i18n
