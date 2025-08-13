"use client"
import { ENVIRONMENT_MODES } from "../../services/environmentService"

const InitialConfigForm = ({ config, onChange, mode }) => {
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    onChange({
      [name]: type === "checkbox" ? checked : value,
    })
  }

  return (
    <div className="initial-config-form">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
          Nombre de la Empresa
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          value={config.companyName}
          onChange={handleInputChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Nombre de tu empresa"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="adminEmail">
          Email del Administrador
        </label>
        <input
          id="adminEmail"
          name="adminEmail"
          type="email"
          value={config.adminEmail}
          onChange={handleInputChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="admin@empresa.com"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dataRetentionDays">
          Días de Retención de Datos
        </label>
        <input
          id="dataRetentionDays"
          name="dataRetentionDays"
          type="number"
          min="1"
          max="365"
          value={config.dataRetentionDays}
          onChange={handleInputChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
        <p className="text-xs text-gray-500 mt-1">
          Número de días que se conservarán los registros antes de archivarlos.
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center">
          <input
            id="enableNotifications"
            name="enableNotifications"
            type="checkbox"
            checked={config.enableNotifications}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-gray-700 text-sm font-bold" htmlFor="enableNotifications">
            Habilitar Notificaciones
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-6">Recibe alertas sobre eventos importantes del sistema.</p>
      </div>

      {(mode === ENVIRONMENT_MODES.DEMO || mode === ENVIRONMENT_MODES.DEBUG) && (
        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="createSampleData"
              name="createSampleData"
              type="checkbox"
              checked={config.createSampleData}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-gray-700 text-sm font-bold" htmlFor="createSampleData">
              Crear Datos de Ejemplo
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Genera trabajadores, posiciones y registros de ejemplo para probar la aplicación.
          </p>
        </div>
      )}

      {mode === ENVIRONMENT_MODES.DEBUG && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-4">
          <p className="text-sm text-yellow-700">
            <strong>Modo Depuración:</strong> Se habilitarán herramientas adicionales para desarrolladores y se
            mostrarán mensajes de diagnóstico.
          </p>
        </div>
      )}

      {mode === ENVIRONMENT_MODES.DEMO && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mt-4">
          <p className="text-sm text-blue-700">
            <strong>Modo Demostración:</strong> Los datos generados son solo para fines de demostración y pueden ser
            reiniciados en cualquier momento.
          </p>
        </div>
      )}
    </div>
  )
}

export default InitialConfigForm
