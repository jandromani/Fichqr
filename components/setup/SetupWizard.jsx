"use client"

import { useState } from "react"
import { useEnvironment } from "../../contexts/EnvironmentContext"
import { initializeDefaultEnvironment } from "../../services/initializationService"
import InitialConfigForm from "./InitialConfigForm"
import EnvironmentSelector from "./EnvironmentSelector"
import { ENVIRONMENT_MODES } from "../../services/environmentService"

const SetupWizard = ({ onComplete }) => {
  const { changeMode } = useEnvironment()
  const [step, setStep] = useState(1)
  const [selectedMode, setSelectedMode] = useState(ENVIRONMENT_MODES.PRODUCTION)
  const [config, setConfig] = useState({
    companyName: "",
    adminEmail: "",
    enableNotifications: true,
    dataRetentionDays: 90,
    createSampleData: false,
  })

  const totalSteps = 3

  const handleModeChange = (mode) => {
    setSelectedMode(mode)
  }

  const handleConfigChange = (newConfig) => {
    setConfig({ ...config, ...newConfig })
  }

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      completeSetup()
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const completeSetup = () => {
    // Inicializar con el modo seleccionado y la configuración
    initializeDefaultEnvironment(selectedMode, config)

    // Actualizar el contexto con el modo seleccionado
    changeMode(selectedMode)

    // Notificar que la configuración está completa
    if (onComplete) {
      onComplete()
    }
  }

  return (
    <div className="setup-wizard bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto my-10">
      <div className="wizard-header mb-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">Configuración Inicial</h2>
        <div className="flex justify-center mt-4">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`step-indicator h-2 w-10 mx-1 rounded-full ${
                index + 1 === step ? "bg-blue-500" : index + 1 < step ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-gray-600 mt-2">
          Paso {step} de {totalSteps}
        </p>
      </div>

      <div className="wizard-content">
        {step === 1 && (
          <div className="step-content">
            <h3 className="text-xl font-semibold mb-4">Bienvenido a Fichaje QR</h3>
            <p className="mb-4 text-gray-700">
              Este asistente te ayudará a configurar la aplicación para su primer uso. Vamos a configurar el entorno y
              los ajustes básicos.
            </p>
            <p className="mb-6 text-gray-700">
              Puedes cambiar estos ajustes más tarde desde el panel de administración.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <h3 className="text-xl font-semibold mb-4">Selecciona el Modo de Entorno</h3>
            <p className="mb-4 text-gray-700">Elige el modo en el que quieres ejecutar la aplicación:</p>
            <EnvironmentSelector selectedMode={selectedMode} onChange={handleModeChange} showDescriptions={true} />
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            <h3 className="text-xl font-semibold mb-4">Configuración Básica</h3>
            <InitialConfigForm config={config} onChange={handleConfigChange} mode={selectedMode} />
          </div>
        )}
      </div>

      <div className="wizard-footer flex justify-between mt-6">
        {step > 1 ? (
          <button
            onClick={prevStep}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Anterior
          </button>
        ) : (
          <div></div> // Espacio vacío para mantener la alineación
        )}

        <button
          onClick={nextStep}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {step === totalSteps ? "Finalizar" : "Siguiente"}
        </button>
      </div>
    </div>
  )
}

export default SetupWizard
