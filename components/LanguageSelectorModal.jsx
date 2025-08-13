"use client"

import { useState } from "react"
import { useLanguage } from "../contexts/LanguageContext"
import { Globe, X } from "lucide-react"

function LanguageSelectorModal({ onClose }) {
  const { languages, changeLanguage, t } = useLanguage()
  const [selectedRegion, setSelectedRegion] = useState(null)

  // Regiones con sus idiomas correspondientes
  const regions = [
    {
      name: "Europa",
      languages: ["es", "en"],
      icon: "🇪🇺",
    },
    {
      name: "Asia",
      languages: ["hi", "ur"],
      icon: "🌏",
    },
    {
      name: "Oriente Medio",
      languages: ["ar"],
      icon: "🌍",
    },
    {
      name: "África",
      languages: ["sw", "ha"],
      icon: "🌍",
    },
  ]

  // Seleccionar una región
  const handleSelectRegion = (region) => {
    setSelectedRegion(region)
  }

  // Seleccionar un idioma
  const handleSelectLanguage = (langCode) => {
    changeLanguage(langCode)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <Globe className="mr-2" size={24} />
            {t("config.language")}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        {!selectedRegion ? (
          <div className="grid grid-cols-2 gap-4">
            {regions.map((region) => (
              <button
                key={region.name}
                className="p-4 border rounded-lg hover:bg-gray-50 flex flex-col items-center justify-center"
                onClick={() => handleSelectRegion(region)}
              >
                <span className="text-4xl mb-2">{region.icon}</span>
                <span className="font-medium">{region.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button className="mb-4 text-blue-500 flex items-center" onClick={() => setSelectedRegion(null)}>
              ← {t("common.back")}
            </button>

            <h3 className="font-medium mb-3 flex items-center">
              <span className="mr-2">{selectedRegion.icon}</span>
              {selectedRegion.name}
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {selectedRegion.languages.map((langCode) => {
                const lang = languages[langCode]
                return (
                  <button
                    key={langCode}
                    className="p-3 border rounded-lg hover:bg-gray-50 flex items-center"
                    onClick={() => handleSelectLanguage(langCode)}
                  >
                    <span className="text-xl mr-3">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LanguageSelectorModal
