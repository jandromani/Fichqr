"use client"

import { useState, useEffect } from "react"
import { offlineBackupService, BACKUP_TYPES } from "../services/offlineBackupService"
import { useToast } from "../contexts/ToastContext"
import Modal from "./ui/Modal"

/**
 * Componente para gestionar respaldos offline
 * Permite crear, restaurar y gestionar respaldos locales
 */
const OfflineBackupManager = () => {
  const [backups, setBackups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState(0)
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [restoreOptions, setRestoreOptions] = useState({
    full: true,
    merge: false,
    keys: [],
  })
  const [backupConfig, setBackupConfig] = useState({
    enabled: true,
    frequency: 24 * 60 * 60 * 1000, // 24 horas por defecto
    maxBackups: 5,
  })
  const [backupDescription, setBackupDescription] = useState("")

  const { showSuccess, showError, showInfo } = useToast()

  // Cargar respaldos al montar el componente
  useEffect(() => {
    loadBackups()
    loadConfig()
  }, [])

  // Cargar lista de respaldos
  const loadBackups = () => {
    try {
      setIsLoading(true)
      const backupsList = offlineBackupService.getBackupsList()
      setBackups(backupsList)
    } catch (error) {
      console.error("Error al cargar respaldos:", error)
      showError("Error al cargar respaldos")
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar configuración de respaldos
  const loadConfig = async () => {
    try {
      setBackupConfig({
        enabled: offlineBackupService.autoBackupEnabled,
        frequency: offlineBackupService.autoBackupFrequency,
        maxBackups: offlineBackupService.maxAutoBackups,
      })
    } catch (error) {
      console.error("Error al cargar configuración:", error)
    }
  }

  // Crear un nuevo respaldo
  const createBackup = async () => {
    try {
      setIsCreating(true)

      const backupId = await offlineBackupService.createBackup({
        type: BACKUP_TYPES.MANUAL,
        description: backupDescription || `Respaldo manual ${new Date().toLocaleString()}`,
      })

      showSuccess("Respaldo creado correctamente")
      setBackupDescription("")
      loadBackups()
    } catch (error) {
      console.error("Error al crear respaldo:", error)
      showError(`Error al crear respaldo: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  // Restaurar un respaldo
  const restoreBackup = async () => {
    try {
      setIsRestoring(true)

      const result = await offlineBackupService.restoreBackup(selectedBackup.id, {
        full: restoreOptions.full,
        keys: restoreOptions.keys,
        merge: restoreOptions.merge,
        progressCallback: (progress) => {
          setRestoreProgress(progress)
        },
      })

      showSuccess(`Respaldo restaurado correctamente. ${result.restoredItems.length} elementos restaurados.`)
      setShowRestoreModal(false)

      // Si hubo elementos que fallaron, mostrar advertencia
      if (result.failedItems.length > 0) {
        showInfo(`Advertencia: ${result.failedItems.length} elementos no pudieron ser restaurados.`)
      }

      // Recargar la página después de restaurar
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("Error al restaurar respaldo:", error)
      showError(`Error al restaurar respaldo: ${error.message}`)
    } finally {
      setIsRestoring(false)
      setRestoreProgress(0)
    }
  }

  // Eliminar un respaldo
  const deleteBackup = async (backupId) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este respaldo?")) {
      try {
        await offlineBackupService.deleteBackup(backupId)
        showSuccess("Respaldo eliminado correctamente")
        loadBackups()
      } catch (error) {
        console.error("Error al eliminar respaldo:", error)
        showError("Error al eliminar respaldo")
      }
    }
  }

  // Exportar un respaldo
  const exportBackup = async (backupId) => {
    try {
      const blob = await offlineBackupService.exportBackupToFile(backupId)

      // Crear nombre de archivo
      const backup = backups.find((b) => b.id === backupId)
      const timestamp = new Date(backup.timestamp).toISOString().replace(/[:.]/g, "-")
      const fileName = `fichaje_qr_backup_${timestamp}.json`

      // Descargar archivo
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()

      // Limpiar
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showSuccess("Respaldo exportado correctamente")
    } catch (error) {
      console.error("Error al exportar respaldo:", error)
      showError(`Error al exportar respaldo: ${error.message}`)
    }
  }

  // Importar un respaldo
  const importBackup = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      showInfo("Importando respaldo...")
      const backupId = await offlineBackupService.importBackupFromFile(file)
      showSuccess("Respaldo importado correctamente")
      loadBackups()

      // Limpiar input
      event.target.value = null
    } catch (error) {
      console.error("Error al importar respaldo:", error)
      showError(`Error al importar respaldo: ${error.message}`)

      // Limpiar input
      event.target.value = null
    }
  }

  // Guardar configuración de respaldos
  const saveConfig = async () => {
    try {
      await offlineBackupService.configureAutoBackup({
        enabled: backupConfig.enabled,
        frequency: backupConfig.frequency,
        maxBackups: backupConfig.maxBackups,
      })

      showSuccess("Configuración guardada correctamente")
      setShowConfigModal(false)
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      showError("Error al guardar configuración")
    }
  }

  // Mostrar modal de restauración
  const showRestore = (backup) => {
    setSelectedBackup(backup)
    setRestoreOptions({
      full: true,
      merge: false,
      keys: [],
    })
    setShowRestoreModal(true)
  }

  // Mostrar modal de detalles
  const showDetails = (backup) => {
    setSelectedBackup(backup)
    setShowDetailsModal(true)
  }

  // Formatear fecha
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  // Formatear tamaño
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Formatear tipo de respaldo
  const formatBackupType = (type) => {
    switch (type) {
      case BACKUP_TYPES.AUTO:
        return "Automático"
      case BACKUP_TYPES.MANUAL:
        return "Manual"
      case BACKUP_TYPES.FULL:
        return "Completo"
      case BACKUP_TYPES.PARTIAL:
        return "Parcial"
      default:
        return type
    }
  }

  // Formatear frecuencia
  const formatFrequency = (ms) => {
    const hours = ms / (1000 * 60 * 60)
    if (hours === 24) return "Diario"
    if (hours === 168) return "Semanal"
    if (hours === 720) return "Mensual"
    return `Cada ${hours} horas`
  }

  // Renderizar modal de restauración
  const renderRestoreModal = () => {
    if (!selectedBackup) return null

    return (
      <Modal
        isOpen={showRestoreModal}
        onClose={() => !isRestoring && setShowRestoreModal(false)}
        title="Restaurar respaldo"
      >
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Estás a punto de restaurar el siguiente respaldo:</p>
            <div className="bg-gray-100 p-3 rounded-md">
              <p className="font-medium">{selectedBackup.description}</p>
              <p className="text-sm text-gray-600">Creado el: {formatDate(selectedBackup.timestamp)}</p>
              <p className="text-sm text-gray-600">Tamaño: {formatSize(selectedBackup.size)}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-red-600 font-medium mb-2">
              ⚠️ Advertencia: La restauración puede sobrescribir datos existentes.
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Se creará un respaldo de seguridad automáticamente antes de restaurar.
            </p>
          </div>

          <div className="mb-4">
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={restoreOptions.full}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, full: e.target.checked })}
                className="mr-2"
              />
              <span>Restauración completa (todos los datos)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={restoreOptions.merge}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, merge: e.target.checked })}
                className="mr-2"
              />
              <span>Combinar con datos existentes (en lugar de reemplazar)</span>
            </label>
          </div>

          {isRestoring && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Progreso de restauración:</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${restoreProgress}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-1 text-right">{restoreProgress}%</p>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setShowRestoreModal(false)}
              disabled={isRestoring}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={restoreBackup}
              disabled={isRestoring}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              {isRestoring ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Restaurando...
                </>
              ) : (
                "Restaurar"
              )}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // Renderizar modal de configuración
  const renderConfigModal = () => {
    return (
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Configuración de respaldos automáticos"
      >
        <div className="p-4">
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={backupConfig.enabled}
                onChange={(e) => setBackupConfig({ ...backupConfig, enabled: e.target.checked })}
                className="mr-2"
              />
              <span>Habilitar respaldos automáticos</span>
            </label>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Frecuencia de respaldo</label>
            <select
              value={backupConfig.frequency}
              onChange={(e) => setBackupConfig({ ...backupConfig, frequency: Number(e.target.value) })}
              className="w-full p-2 border rounded"
              disabled={!backupConfig.enabled}
            >
              <option value={1000 * 60 * 60}>Cada hora</option>
              <option value={1000 * 60 * 60 * 6}>Cada 6 horas</option>
              <option value={1000 * 60 * 60 * 12}>Cada 12 horas</option>
              <option value={1000 * 60 * 60 * 24}>Diario</option>
              <option value={1000 * 60 * 60 * 24 * 7}>Semanal</option>
              <option value={1000 * 60 * 60 * 24 * 30}>Mensual</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Número máximo de respaldos automáticos</label>
            <input
              type="number"
              value={backupConfig.maxBackups}
              onChange={(e) => setBackupConfig({ ...backupConfig, maxBackups: Number(e.target.value) })}
              className="w-full p-2 border rounded"
              min="1"
              max="20"
              disabled={!backupConfig.enabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Los respaldos más antiguos se eliminarán automáticamente cuando se supere este límite.
            </p>
          </div>

          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setShowConfigModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button onClick={saveConfig} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Guardar configuración
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // Renderizar modal de detalles
  const renderDetailsModal = () => {
    if (!selectedBackup) return null

    return (
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalles del respaldo">
        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-medium text-lg">{selectedBackup.description}</h3>
            <p className="text-sm text-gray-600">ID: {selectedBackup.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium">Fecha de creación</p>
              <p className="text-sm text-gray-600">{formatDate(selectedBackup.timestamp)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Tipo</p>
              <p className="text-sm text-gray-600">{formatBackupType(selectedBackup.type)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Tamaño</p>
              <p className="text-sm text-gray-600">{formatSize(selectedBackup.size)}</p>
            </div>
            {selectedBackup.imported && (
              <div>
                <p className="text-sm font-medium">Importado</p>
                <p className="text-sm text-gray-600">Sí</p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium mb-1">Datos incluidos</p>
            <div className="max-h-40 overflow-y-auto bg-gray-100 p-2 rounded text-xs">
              {selectedBackup.keys.map((key) => (
                <div key={key} className="mb-1 pb-1 border-b border-gray-200 last:border-0">
                  {key}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <div>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  showRestore(selectedBackup)
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Restaurar
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => exportBackup(selectedBackup.id)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Exportar
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  deleteBackup(selectedBackup.id)
                }}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Gestor de Respaldos Offline</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuración
          </button>

          <label className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Importar
            <input type="file" className="hidden" accept=".json" onChange={importBackup} />
          </label>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-end space-x-2">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Descripción del respaldo"
              value={backupDescription}
              onChange={(e) => setBackupDescription(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            onClick={createBackup}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isCreating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creando...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear respaldo
              </>
            )}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : backups.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-2">No hay respaldos disponibles</p>
          <p className="text-sm">Crea un respaldo para proteger tus datos</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Descripción
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Fecha
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Tamaño
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {backup.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatDate(backup.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatBackupType(backup.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {formatSize(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => showDetails(backup)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Detalles
                      </button>
                      <button
                        onClick={() => showRestore(backup)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={() => exportBackup(backup.id)}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        Exportar
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {renderRestoreModal()}
      {renderConfigModal()}
      {renderDetailsModal()}
    </div>
  )
}

export default OfflineBackupManager
