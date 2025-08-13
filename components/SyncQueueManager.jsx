"use client"

import { useState, useEffect } from "react"
import { syncQueueService } from "../services/syncQueueService"
import { connectionMonitorService } from "../services/connectionMonitorService"
import { useToast } from "../contexts/ToastContext"
import Modal from "./ui/Modal"

const SyncQueueManager = () => {
  const [queueItems, setQueueItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showItemDetails, setShowItemDetails] = useState(false)
  const [filterType, setFilterType] = useState("all")
  const { showToast } = useToast()

  useEffect(() => {
    // Cargar la cola de sincronización
    loadQueueItems()

    // Suscribirse a cambios en la cola
    const queueListener = (status, items) => {
      setQueueItems(items || [])
    }

    syncQueueService.addListener(queueListener)

    // Suscribirse a cambios en la conexión
    const connectionListener = (status) => {
      setIsOnline(status?.isOnline || navigator.onLine)
    }

    const unsubscribeConnection = connectionMonitorService.subscribeToConnectionChanges(connectionListener)

    return () => {
      syncQueueService.removeListener(queueListener)
      unsubscribeConnection()
    }
  }, [])

  const loadQueueItems = async () => {
    setIsLoading(true)
    try {
      const items = syncQueueService.getQueueItems()
      setQueueItems(items || [])
    } catch (error) {
      console.error("Error al cargar la cola de sincronización:", error)
      showToast("Error al cargar la cola de sincronización", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncAll = async () => {
    if (!isOnline) {
      showToast("No hay conexión a internet. No se puede sincronizar.", "error")
      return
    }

    setSyncInProgress(true)
    try {
      await syncQueueService.processQueue()
      showToast("Sincronización completada con éxito", "success")
      loadQueueItems()
    } catch (error) {
      console.error("Error durante la sincronización:", error)
      showToast("Error durante la sincronización", "error")
    } finally {
      setSyncInProgress(false)
    }
  }

  const handleSyncItem = async (itemId) => {
    if (!isOnline) {
      showToast("No hay conexión a internet. No se puede sincronizar.", "error")
      return
    }

    setSyncInProgress(true)
    try {
      await syncQueueService.processQueueItem(itemId)
      showToast("Elemento sincronizado con éxito", "success")
      loadQueueItems()
    } catch (error) {
      console.error("Error al sincronizar el elemento:", error)
      showToast("Error al sincronizar el elemento", "error")
    } finally {
      setSyncInProgress(false)
    }
  }

  const handleRemoveItem = async (itemId) => {
    try {
      syncQueueService.removeQueueItem(itemId)
      showToast("Elemento eliminado de la cola", "success")
      loadQueueItems()
    } catch (error) {
      console.error("Error al eliminar el elemento:", error)
      showToast("Error al eliminar el elemento", "error")
    }
  }

  const handleClearQueue = async () => {
    if (window.confirm("¿Estás seguro de que deseas eliminar todos los elementos de la cola?")) {
      try {
        syncQueueService.clearQueue()
        showToast("Cola de sincronización vaciada", "success")
        loadQueueItems()
      } catch (error) {
        console.error("Error al vaciar la cola:", error)
        showToast("Error al vaciar la cola", "error")
      }
    }
  }

  const handleViewDetails = (item) => {
    setSelectedItem(item)
    setShowItemDetails(true)
  }

  const getFilteredItems = () => {
    if (filterType === "all") return queueItems
    return queueItems.filter((item) => item.type === filterType)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pendiente
          </span>
        )
      case "processing":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Procesando
          </span>
        )
      case "error":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Error
          </span>
        )
      case "completed":
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Completado
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            Desconocido
          </span>
        )
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    try {
      const date = new Date(timestamp)
      return date.toLocaleString()
    } catch (e) {
      return "Fecha inválida"
    }
  }

  const renderItemDetails = () => {
    if (!selectedItem) return null

    return (
      <Modal
        isOpen={showItemDetails}
        onClose={() => setShowItemDetails(false)}
        title="Detalles del elemento de sincronización"
      >
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Información general</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">ID:</div>
              <div>{selectedItem.id}</div>
              <div className="font-medium">Tipo:</div>
              <div className="capitalize">{selectedItem.type || "No especificado"}</div>
              <div className="font-medium">Estado:</div>
              <div>{getStatusBadge(selectedItem.status)}</div>
              <div className="font-medium">Creado:</div>
              <div>{formatDate(selectedItem.createdAt)}</div>
              <div className="font-medium">Última actualización:</div>
              <div>{formatDate(selectedItem.updatedAt)}</div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Datos</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto text-xs max-h-60">
              {JSON.stringify(selectedItem.data || selectedItem.metadata || {}, null, 2)}
            </pre>
          </div>

          {selectedItem.lastError && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2 text-red-600">Error</h3>
              <pre className="bg-red-50 dark:bg-red-900 p-3 rounded-md overflow-auto text-xs max-h-40 text-red-800 dark:text-red-200">
                {selectedItem.lastError}
              </pre>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-4">
            {selectedItem.status !== "completed" && isOnline && (
              <button
                onClick={() => {
                  handleSyncItem(selectedItem.id)
                  setShowItemDetails(false)
                }}
                disabled={syncInProgress}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Sincronizar ahora
              </button>
            )}
            <button
              onClick={() => {
                handleRemoveItem(selectedItem.id)
                setShowItemDetails(false)
              }}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Eliminar
            </button>
            <button
              onClick={() => setShowItemDetails(false)}
              className="px-3 py-1 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Cola de sincronización</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleSyncAll}
            disabled={!isOnline || syncInProgress || queueItems.length === 0}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm flex items-center"
          >
            {syncInProgress ? (
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
                Sincronizando...
              </>
            ) : (
              "Sincronizar todo"
            )}
          </button>
          <button
            onClick={handleClearQueue}
            disabled={queueItems.length === 0}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm"
          >
            Vaciar cola
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex space-x-2 mb-2">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 text-sm rounded ${
              filterType === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType("worker")}
            className={`px-3 py-1 text-sm rounded ${
              filterType === "worker"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            Trabajadores
          </button>
          <button
            onClick={() => setFilterType("position")}
            className={`px-3 py-1 text-sm rounded ${
              filterType === "position"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            Posiciones
          </button>
          <button
            onClick={() => setFilterType("clockRecord")}
            className={`px-3 py-1 text-sm rounded ${
              filterType === "clockRecord"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            Fichajes
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
      ) : getFilteredItems().length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {queueItems.length === 0 ? (
            <p>No hay elementos en la cola de sincronización</p>
          ) : (
            <p>No hay elementos que coincidan con el filtro seleccionado</p>
          )}
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
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Creado
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
              {getFilteredItems().map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{item.type || "No especificado"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(item.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(item.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(item)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Ver detalles
                      </button>
                      {item.status !== "completed" && isOnline && (
                        <button
                          onClick={() => handleSyncItem(item.id)}
                          disabled={syncInProgress}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                        >
                          Sincronizar
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
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

      {renderItemDetails()}
    </div>
  )
}

export default SyncQueueManager
