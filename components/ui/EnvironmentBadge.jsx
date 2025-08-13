import { useEnvironment } from "../../contexts/EnvironmentContext"
import { ENVIRONMENT_MODES } from "../../services/environmentService"

const EnvironmentBadge = ({ className = "", showLabel = true }) => {
  const { currentMode } = useEnvironment()

  // Configuración según el modo
  const config = {
    [ENVIRONMENT_MODES.PRODUCTION]: {
      bgColor: "bg-green-500",
      textColor: "text-white",
      label: "PROD",
      icon: "🏢",
      tooltip: "Modo Producción",
    },
    [ENVIRONMENT_MODES.DEMO]: {
      bgColor: "bg-blue-500",
      textColor: "text-white",
      label: "DEMO",
      icon: "🎮",
      tooltip: "Modo Demostración",
    },
    [ENVIRONMENT_MODES.DEBUG]: {
      bgColor: "bg-yellow-500",
      textColor: "text-black",
      label: "DEBUG",
      icon: "🔧",
      tooltip: "Modo Depuración",
    },
  }

  const { bgColor, textColor, label, icon, tooltip } = config[currentMode] || {
    bgColor: "bg-gray-500",
    textColor: "text-white",
    label: "?",
    icon: "❓",
    tooltip: "Modo Desconocido",
  }

  return (
    <div
      className={`environment-badge ${bgColor} ${textColor} rounded-md px-2 py-1 inline-flex items-center text-xs font-bold ${className}`}
      title={tooltip}
    >
      <span className="mr-1">{icon}</span>
      {showLabel && <span>{label}</span>}
    </div>
  )
}

export default EnvironmentBadge
