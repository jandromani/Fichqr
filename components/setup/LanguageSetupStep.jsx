"use client"

import { useState } from "react"
import { useLanguage } from "../../contexts/LanguageContext"
import { Globe } from "lucide-react"

function LanguageSetupStep({ onNext, onBack }) {
  const { languages, currentLanguage, changeLanguage, t } = useLanguage()
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage)

  // Agrupar idiomas por región
  const regions = [
    {
      name: "Europa",
      languages: ["es", "en"],
    },
    {
      name: "Asia",
      languages: ["hi", "ur"],
    },
    {
      name: "Oriente Medio",
      languages: ["ar"],
    },
    {
      name: "África",
      languages: ["sw", "ha"],
    },
  ]

  // Manejar la selección de idioma
  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode)
    changeLanguage(langCode)
  }

  // Continuar al siguiente paso
  const handleContinue = () => {
    onNext()
  }

  return (
    <div className="language-setup-step">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Globe size={32} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("config.language")}</h2>
        <p className="text-gray-600">{t("setup.selectLanguage")}</p>
      </div>

      <div className="language-grid grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {regions.map((region) => (
          <div key={region.name} className="region-group">
            <h3 className="font-medium mb-2">{region.name}</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {region.languages.map((langCode) => {
                const lang = languages[langCode]
                return (
                  <button
                    key={langCode}
                    className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 ${
                      selectedLanguage === langCode ? "bg-blue-50 border-l-4 border-blue-500" : ""
                    }`}
                    onClick={() => handleLanguageSelect(langCode)}
                  >
                    <span className="text-xl mr-3">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            {t("common.back")}
          </button>
        )}
        <button
          onClick={handleContinue}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-auto"
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  )
}

export default LanguageSetupStep
