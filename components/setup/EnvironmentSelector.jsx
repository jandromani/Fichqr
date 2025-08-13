"use client"
import { ENVIRONMENT_MODES } from "../../services/environmentService"

const EnvironmentSelector = ({ selectedMode, onChange, showDescriptions = false, className = "" }) => {
  const modes = [
    {
      id: ENVIRONMENT_MODES.PRODUCTION,
      name: "Producción",
      description: "Modo normal de operación. Todas las funciones están optimizadas para uso en producción.",
      icon: "🏢",
    },
    {
      id: ENVIRONMENT_MODES.DEMO,
      name: "Demostración",
      description: "Incluye datos de ejemplo y permite probar todas las funciones sin afectar datos reales.",
      icon: "🎮",
    },
    {
      id: ENVIRONMENT_MODES.DEBUG,
      name: "Depuración",
      description: "Muestra información adicional para desarrolladores y permite probar funciones avanzadas.",
      icon: "🔧",
    },
  ]

  return (
    <div className={`environment-selector ${className}`}>
      <div className="grid grid-cols-1 gap-3">
        {modes.map((mode) => (
          <div
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={`
              cursor-pointer p-3 rounded-lg border-2 transition-all
              ${
                selectedMode === mode.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              }
            `}
          >
            <div className="flex items-center">
              <div className="mode-icon text-2xl mr-3">{mode.icon}</div>
              <div className="flex-grow">
                <h4 className="font-medium text-gray-800">{mode.name}</h4>
                {showDescriptions && <p className="text-sm text-gray-600 mt-1">{mode.description}</p>}
              </div>
              <div className="ml-2">
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center
                  ${selectedMode === mode.id ? "border-blue-500" : "border-gray-300"}`}
                >
                  {selectedMode === mode.id && <div className="h-3 w-3 rounded-full bg-blue-500"></div>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EnvironmentSelector
