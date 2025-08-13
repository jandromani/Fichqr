"use client"

import { useState, useEffect } from "react"
import { useToast } from "../contexts/ToastContext"
import { getDeleteHistory, restoreItem, permanentDelete } from "../services/storage"
import ConfirmationModal from "./ui/ConfirmationModal"

function RecoveryManager() {
  const [deleteHistory, setDeleteHistory] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [actionType, setActionType] = useState(null) // 'restore' or 'permanentDelete'
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadDeleteHistory()
  }, [])

  const loadDeleteHistory = () => {
    const history = getDeleteHistory()
    setDeleteHistory(history)
  }

  const handleRestore = (item) => {
    setSelectedItem(item)
    setActionType("restore")
    setShowConfirmation(true)
  }

  const handlePermanentDelete = (item) => {
    setSelectedItem(item)
    setActionType("permanentDelete")
    setShowConfirmation(true)
  }

  const confirmAction = async () => {
    if (!selectedItem || !actionType) return

    setIsLoading(true)
    try {
      let success = false
      switch (actionType) {
        case "restore":
          success = restoreItem(selectedItem.storageKey, selectedItem.itemId)
          break
        case "permanentDelete":
          success = permanentDelete(selectedItem.storageKey, selectedItem.itemId)
          break
        default:
          break
      }

      if (success) {
        toast.showSuccess(`Elemento ${actionType === "restore" ? "restaurado" : "eliminado permanentemente"}`)
        loadDeleteHistory()
      } else {
        toast.showError(`Error al ${actionType === "restore" ? "restaurar" : "eliminar permanentemente"} elemento`)
      }
    } catch (error) {
      console.error(`Error al ${actionType} elemento:`, error)
      toast.showError(`Error al ${actionType} elemento: ${error.message}`)
    } finally {
      setIsLoading(false)
      setShowConfirmation(false)
      setSelectedItem(null)
      setActionType(null)
    }
  }

  const cancelAction = () => {
    setShowConfirmation(false)
    setSelectedItem(null)
    setActionType(null)
  }

  const getItemName = (item) => {
    return item.itemName || `ID: ${item.itemId}`
  }

  return (
    <div className="recovery-manager">
      <h3 className="text-lg font-semibold mb-4">Historial de Eliminaciones</h3>

      {deleteHistory.length === 0 ? (
        <div className="no-data-message">
          <p>No hay elementos eliminados para mostrar.</p>
        </div>
      ) : (
        <div className="deleted-items-list">
          <table>
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Tipo</th>
                <th>Fecha de Eliminación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {deleteHistory.map((item) => (
                <tr key={item.id}>
                  <td>{getItemName(item)}</td>
                  <td>{item.itemType}</td>
                  <td>{new Date(item.timestamp).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleRestore(item)} className="action-btn small">
                      Restaurar
                    </button>
                    <button onClick={() => handlePermanentDelete(item)} className="action-btn small danger">
                      Eliminar Permanentemente
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={cancelAction}
        onConfirm={confirmAction}
        title={`Confirmar ${actionType === "restore" ? "Restauración" : "Eliminación Permanente"}`}
        message={`¿Estás seguro de que deseas ${actionType === "restore" ? "restaurar" : "eliminar permanentemente"} el elemento "${selectedItem ? getItemName(selectedItem) : ""}"?`}
        confirmText={actionType === "restore" ? "Restaurar" : "Eliminar Permanentemente"}
        cancelText="Cancelar"
        type={actionType === "restore" ? "info" : "danger"}
      />
    </div>
  )
}

export default RecoveryManager
