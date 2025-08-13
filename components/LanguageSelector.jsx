"use client"

import { useState } from "react"
import { useLanguage } from "../contexts/LanguageContext"

function LanguageSelector({ variant = "dropdown", size = "md", className = "" }) {
  const { language, changeLanguage, supportedLanguages } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  // Obtener el idioma actual
  const currentLang = supportedLanguages.find((lang) => lang.code === language) || supportedLanguages[0]

  // Manejar el cambio de idioma
  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode)
    setIsOpen(false)
  }

  // Estilos según el tamaño
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "text-xs p-1"
      case "lg":
        return "text-lg p-3"
      default:
        return "text-sm p-2"
    }
  }

  // Renderizar selector de tipo iconos (compacto)
  if (variant === "icons") {
    return (
      <div className={`language-selector-icons relative ${className}`}>
        <button
          className="flex items-center justify-center p-1 rounded-full hover:bg-gray-100 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Cambiar idioma"
        >
          <span className="text-lg">{currentLang.flag}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 py-1 bg-white rounded-md shadow-lg z-50 border border-gray-200">
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                className={`w-full text-left px-3 py-1 hover:bg-gray-100 flex items-center ${
                  language === lang.code ? "font-medium bg-gray-50" : ""
                }`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <span className="mr-2 text-lg">{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Renderizar selector de tipo dropdown (predeterminado)
  return (
    <div className={`language-selector relative ${className}`}>
      <button
        className={`flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none ${getSizeClasses()}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Cambiar idioma"
      >
        <div className="flex items-center">
          <span className="mr-2 text-lg">{currentLang.flag}</span>
          <span>{currentLang.name}</span>
        </div>
        <span className="ml-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 py-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center ${
                language === lang.code ? "font-medium bg-gray-50" : ""
              }`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className="mr-2 text-lg">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSelector
