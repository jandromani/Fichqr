"use client"

import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import { workerService, positionService } from "../../services/storage"
import { sanitizeInput } from "../../utils/securityUtils"
import ConfirmationModal from "../ui/ConfirmationModal"
import Modal from "../ui/Modal"

function WorkersSection({ addWorker }) {
  // Estado para los trabajadores, ahora se cargará desde localStorage
  const [workers, setWorkers] = useState([])

  // Estado para el formulario de nuevo trabajador
  const [newWorker, setNewWorker] = useState({ name: "", email: "", position: "" })
  const [showForm, setShowForm] = useState(false)

  // Estado para validación del formulario
  const [formErrors, setFormErrors] = useState({})

  // Estado para posiciones disponibles
  const [positions, setPositions] = useState([])

  // Estado para modales
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [workerToDelete, setWorkerToDelete] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWorker, setEditingWorker] = useState(null)

  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Cargar trabajadores y posiciones desde localStorage al montar el componente
  useEffect(() => {
    const storedWorkers = workerService.getAll()
    const storedPositions = positionService.getAll()

    setWorkers(storedWorkers)
    setPositions(storedPositions)
  }, [])

  // Función para validar el formulario
  const validateForm = (worker) => {
    const errors = {}

    if (!worker.name.trim()) {
      errors.name = "El nombre es obligatorio"
    }

    if (!worker.email.trim()) {
      errors.email = "El email es obligatorio"
    } else if (!/\S+@\S+\.\S+/.test(worker.email)) {
      errors.email = "El formato del email no es válido"
    }

    // Verificar si el email ya existe (excepto para el trabajador que se está editando)
    const emailExists = workers.some((w) => w.email === worker.email && (!editingWorker || w.id !== editingWorker.id))

    if (emailExists) {
      errors.email = "Este email ya está registrado"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Función para añadir un nuevo trabajador
  const handleAddWorker = () => {
    // Validar el formulario
    if (!validateForm(newWorker)) {
      return
    }

    // Sanitizar entradas
    const sanitizedName = sanitizeInput(newWorker.name)
    const sanitizedEmail = sanitizeInput(newWorker.email)
    const sanitizedPosition = sanitizeInput(newWorker.position)

    // Crear el nuevo trabajador
    const worker = {
      id: `w${Date.now()}`, // Generamos un ID único basado en timestamp
      name: sanitizedName,
      email: sanitizedEmail,
      position: sanitizedPosition || "",
      createdAt: new Date().toISOString(),
    }

    // Guardar en localStorage usando el servicio
    workerService.add(worker)

    // Actualizar el estado local
    setWorkers([...workers, worker])

    // Llamar a la función que viene de props (para compatibilidad)
    if (addWorker) {
      addWorker(worker)
    }

    // Mostrar notificación de éxito
    toast.showSuccess(`Trabajador ${worker.name} añadido correctamente`)

    // Limpiamos el formulario
    setNewWorker({ name: "", email: "", position: "" })
    setShowForm(false)
    setFormErrors({})
  }

  // Función para abrir el modal de edición
  const handleEditClick = (worker) => {
    setEditingWorker({
      id: worker.id,
      name: worker.name,
      email: worker.email,
      position: worker.position || "",
    })
    setShowEditModal(true)
  }

  // Función para guardar los cambios de edición
  const handleSaveEdit = () => {
    // Validar el formulario
    if (!validateForm(editingWorker)) {
      return
    }

    // Sanitizar entradas
    const sanitizedName = sanitizeInput(editingWorker.name)
    const sanitizedEmail = sanitizeInput(editingWorker.email)
    const sanitizedPosition = sanitizeInput(editingWorker.position)

    // Actualizar el trabajador en localStorage
    workerService.update(editingWorker.id, {
      name: sanitizedName,
      email: sanitizedEmail,
      position: sanitizedPosition,
      updatedAt: new Date().toISOString(),
    })

    // Actualizar el trabajador en el estado local
    const updatedWorkers = workers.map((w) =>
      w.id === editingWorker.id
        ? {
            ...w,
            name: sanitizedName,
            email: sanitizedEmail,
            position: sanitizedPosition,
            updatedAt: new Date().toISOString(),
          }
        : w,
    )

    setWorkers(updatedWorkers)

    // Mostrar notificación de éxito
    toast.showSuccess(`Trabajador ${sanitizedName} actualizado correctamente`)

    // Cerrar el modal
    setShowEditModal(false)
    setEditingWorker(null)
  }

  // Función para confirmar la eliminación de un trabajador
  const handleDeleteClick = (worker) => {
    setWorkerToDelete(worker)
    setShowDeleteConfirmation(true)
  }

  // Función para eliminar un trabajador
  const handleDeleteWorker = () => {
    if (!workerToDelete) return

    // Eliminar el trabajador de localStorage
    workerService.remove(workerToDelete.id)

    // Eliminar el trabajador del estado local
    const updatedWorkers = workers.filter((w) => w.id !== workerToDelete.id)
    setWorkers(updatedWorkers)

    // Mostrar notificación de éxito
    toast.showSuccess(`Trabajador ${workerToDelete.name} eliminado correctamente`)

    // Cerrar el modal
    setShowDeleteConfirmation(false)
    setWorkerToDelete(null)
  }

  return (
    <div className="section">
      <h2>Mis Trabajadores</h2>

      <div className="workers-list">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Puesto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td>{worker.name}</td>
                <td>{worker.email}</td>
                <td>{worker.position}</td>
                <td>
                  <button className="action-btn small" onClick={() => handleEditClick(worker)}>
                    Editar
                  </button>
                  <button className="action-btn small danger" onClick={() => handleDeleteClick(worker)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No hay trabajadores registrados. Añade tu primer trabajador.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="add-worker-form">
          <h3>Nuevo Trabajador</h3>
          <div className="form-group">
            <label htmlFor="worker-name">
              Nombre:
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              id="worker-name"
              value={newWorker.name}
              onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
              className={formErrors.name ? "input-error" : ""}
            />
            {formErrors.name && <p className="error-message">{formErrors.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="worker-email">
              Email:
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="email"
              id="worker-email"
              value={newWorker.email}
              onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
              className={formErrors.email ? "input-error" : ""}
            />
            {formErrors.email && <p className="error-message">{formErrors.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="worker-position">Puesto:</label>
            <select
              id="worker-position"
              value={newWorker.position}
              onChange={(e) => setNewWorker({ ...newWorker, position: e.target.value })}
            >
              <option value="">Seleccionar puesto</option>
              {positions.map((position) => (
                <option key={position.id} value={position.name}>
                  {position.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button onClick={handleAddWorker} className="action-btn">
              Guardar
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setFormErrors({})
                setNewWorker({ name: "", email: "", position: "" })
              }}
              className="action-btn secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="section-actions">
          <button onClick={() => setShowForm(true)} className="action-btn">
            Añadir Trabajador
          </button>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteWorker}
        title="Eliminar trabajador"
        message={`¿Estás seguro de que deseas eliminar al trabajador "${workerToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de edición */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Trabajador">
        {editingWorker && (
          <div className="edit-worker-form">
            <div className="form-group">
              <label htmlFor="edit-worker-name">
                Nombre:
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                id="edit-worker-name"
                value={editingWorker.name}
                onChange={(e) => setEditingWorker({ ...editingWorker, name: e.target.value })}
                className={formErrors.name ? "input-error" : ""}
              />
              {formErrors.name && <p className="error-message">{formErrors.name}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="edit-worker-email">
                Email:
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                id="edit-worker-email"
                value={editingWorker.email}
                onChange={(e) => setEditingWorker({ ...editingWorker, email: e.target.value })}
                className={formErrors.email ? "input-error" : ""}
              />
              {formErrors.email && <p className="error-message">{formErrors.email}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="edit-worker-position">Puesto:</label>
              <select
                id="edit-worker-position"
                value={editingWorker.position}
                onChange={(e) => setEditingWorker({ ...editingWorker, position: e.target.value })}
              >
                <option value="">Seleccionar puesto</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.name}>
                    {position.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button
                onClick={handleSaveEdit}
                className="action-btn"
                disabled={!editingWorker.name.trim() || !editingWorker.email.trim()}
              >
                Guardar Cambios
              </button>
              <button onClick={() => setShowEditModal(false)} className="action-btn secondary">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default WorkersSection
