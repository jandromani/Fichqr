"use client"

import { useState, useEffect } from "react"
import { useToast } from "../../contexts/ToastContext"
import notificationService from "../../services/notificationService"
import Modal from "../ui/Modal"
import { absenceRequestService } from "../../services/storage"

function VacationRequestsSection({ user, isEmployer = false }) {
  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Estado para el formulario de solicitud
  const [newRequest, setNewRequest] = useState({
    startDate: "",
    endDate: "",
    type: "vacation",
    reason: "",
  })

  // Estado para mostrar/ocultar el formulario
  const [showForm, setShowForm] = useState(false)

  // Estado para almacenar las solicitudes
  const [requests, setRequests] = useState([])

  // Estado para el modal de aprobación/rechazo
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [approvalAction, setApprovalAction] = useState("") // "approve" o "reject"
  const [approvalComment, setApprovalComment] = useState("")

  // Estado para el modal de detalles
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsRequest, setDetailsRequest] = useState(null)

  // Cargar solicitudes al montar el componente
  useEffect(() => {
    loadRequests()
  }, [user, isEmployer])

  // Función para cargar solicitudes desde localStorage
  const loadRequests = () => {
    if (!user) return

    let filteredRequests = []

    if (isEmployer) {
      // Si es empleador, cargar todas las solicitudes
      filteredRequests = absenceRequestService.getAll()
    } else {
      // Si es trabajador, cargar solo sus solicitudes
      filteredRequests = absenceRequestService.getByUserId(user.id)
    }

    // Ordenar por fecha de creación (más recientes primero)
    filteredRequests.sort((a, b) => {
      const dateA = new Date(a.createdAt)
      const dateB = new Date(b.createdAt)
      return dateB - dateA
    })

    setRequests(filteredRequests)
  }

  // Función para enviar una nueva solicitud
  const handleSubmitRequest = (e) => {
    e.preventDefault()

    // Validación básica
    if (!newRequest.startDate || !newRequest.endDate || !newRequest.type) {
      toast.showError("Por favor, completa todos los campos obligatorios")
      return
    }

    // Validar que la fecha de fin no sea anterior a la de inicio
    const startDate = new Date(newRequest.startDate)
    const endDate = new Date(newRequest.endDate)

    if (endDate < startDate) {
      toast.showError("La fecha de fin no puede ser anterior a la fecha de inicio")
      return
    }

    // Crear nueva solicitud
    const request = {
      id: `req${Date.now()}`,
      employeeName: user?.name || "Usuario",
      employeeId: user?.id || "unknown",
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
      type: newRequest.type,
      reason: newRequest.reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    // Guardar en localStorage usando el servicio
    absenceRequestService.add(request)

    // Actualizar el estado local
    setRequests([request, ...requests])

    // Limpiar formulario
    setNewRequest({
      startDate: "",
      endDate: "",
      type: "vacation",
      reason: "",
    })

    setShowForm(false)

    // Mostrar notificación de éxito
    toast.showSuccess("Solicitud enviada correctamente")

    // Enviar notificación
    notificationService.showNotification("Solicitud enviada", {
      body: `Tu solicitud de ${getRequestTypeText(request.type)} ha sido enviada y está pendiente de aprobación.`,
      tag: "vacation-request-sent",
    })

    console.log("Nueva solicitud creada:", request)
  }

  // Función para abrir el modal de aprobación/rechazo
  const handleOpenApprovalModal = (requestId, action) => {
    const request = requests.find((req) => req.id === requestId)
    if (request) {
      setSelectedRequest(request)
      setApprovalAction(action)
      setApprovalComment("")
      setShowApprovalModal(true)
    }
  }

  // Función para procesar la aprobación/rechazo
  const handleProcessRequest = () => {
    if (!selectedRequest) return

    const now = new Date().toISOString()
    let success = false

    if (approvalAction === "approve") {
      // Usar el servicio para aprobar la solicitud
      success = absenceRequestService.approve(
        selectedRequest.id,
        user?.name || "Empleador",
        approvalComment.trim() || "Solicitud aprobada",
      )

      if (success) {
        // Mostrar notificación de éxito
        toast.showSuccess(`Solicitud de ${getRequestTypeText(selectedRequest.type)} aprobada`)

        // Enviar notificación al trabajador
        notificationService.addNotificationForUser(selectedRequest.employeeId, {
          id: `approval-${Date.now()}`,
          title: "Solicitud aprobada",
          body: `Tu solicitud de ${getRequestTypeText(selectedRequest.type)} ha sido aprobada.${approvalComment ? ` Comentario: ${approvalComment}` : ""}`,
          timestamp: Date.now(),
          read: false,
          type: "vacation-request-approved",
          data: {
            requestId: selectedRequest.id,
            startDate: selectedRequest.startDate,
            endDate: selectedRequest.endDate,
          },
        })
      }
    } else if (approvalAction === "reject") {
      // Validar que haya un motivo de rechazo
      if (!approvalComment.trim()) {
        toast.showError("Debes proporcionar un motivo para el rechazo")
        return
      }

      // Usar el servicio para rechazar la solicitud
      success = absenceRequestService.reject(selectedRequest.id, user?.name || "Empleador", approvalComment)

      if (success) {
        // Mostrar notificación de rechazo
        toast.showInfo(`Solicitud de ${getRequestTypeText(selectedRequest.type)} rechazada`)

        // Enviar notificación al trabajador
        notificationService.addNotificationForUser(selectedRequest.employeeId, {
          id: `rejection-${Date.now()}`,
          title: "Solicitud rechazada",
          body: `Tu solicitud de ${getRequestTypeText(selectedRequest.type)} ha sido rechazada. Motivo: ${approvalComment}`,
          timestamp: Date.now(),
          read: false,
          type: "vacation-request-rejected",
          data: {
            requestId: selectedRequest.id,
            startDate: selectedRequest.startDate,
            endDate: selectedRequest.endDate,
            reason: approvalComment,
          },
        })
      }
    }

    if (success) {
      // Recargar las solicitudes para reflejar los cambios
      loadRequests()
    } else {
      toast.showError("Error al procesar la solicitud")
    }

    // Cerrar el modal
    setShowApprovalModal(false)
    setSelectedRequest(null)
    setApprovalComment("")
  }

  // Función para abrir el modal de detalles
  const handleOpenDetailsModal = (requestId) => {
    const request = requests.find((req) => req.id === requestId)
    if (request) {
      setDetailsRequest(request)
      setShowDetailsModal(true)
    }
  }

  // Función para formatear fechas
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  // Función para obtener el texto del tipo de solicitud
  const getRequestTypeText = (type) => {
    switch (type) {
      case "vacation":
        return "Vacaciones"
      case "medical":
        return "Permiso médico"
      case "personal":
        return "Asuntos personales"
      case "family":
        return "Asuntos familiares"
      default:
        return type
    }
  }

  // Función para obtener el color de estado
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Función para obtener el texto de estado
  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pendiente"
      case "approved":
        return "Aprobada"
      case "rejected":
        return "Rechazada"
      default:
        return status
    }
  }

  return (
    <div className="section">
      <h2>Solicitudes de Ausencia</h2>

      {!isEmployer && (
        <div className="mb-6">
          {showForm ? (
            <div className="request-form bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">Nueva Solicitud</h3>

              <form onSubmit={handleSubmitRequest}>
                <div className="form-group">
                  <label htmlFor="request-type">Tipo de ausencia:</label>
                  <select
                    id="request-type"
                    value={newRequest.type}
                    onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                    required
                  >
                    <option value="vacation">Vacaciones</option>
                    <option value="medical">Permiso médico</option>
                    <option value="personal">Asuntos personales</option>
                    <option value="family">Asuntos familiares</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="start-date">Fecha inicio:</label>
                  <input
                    type="date"
                    id="start-date"
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end-date">Fecha fin:</label>
                  <input
                    type="date"
                    id="end-date"
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reason">Motivo (opcional):</label>
                  <textarea
                    id="reason"
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded"
                  ></textarea>
                </div>

                <div className="form-actions">
                  <button type="submit" className="action-btn">
                    Enviar Solicitud
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="action-btn secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)} className="action-btn">
              Nueva Solicitud
            </button>
          )}
        </div>
      )}

      <div className="requests-list">
        <h3 className="text-lg font-semibold mb-4">{isEmployer ? "Todas las solicitudes" : "Mis solicitudes"}</h3>

        {requests.length === 0 ? (
          <div className="no-data-message">
            <p>No hay solicitudes para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="request-card bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                  <div>
                    <h4 className="font-semibold">{getRequestTypeText(request.type)}</h4>
                    {isEmployer && <p className="text-sm text-gray-600">Solicitado por: {request.employeeName}</p>}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {getStatusText(request.status)}
                  </span>
                </div>

                <div className="mb-2">
                  <p className="text-sm">
                    <strong>Periodo:</strong> {formatDate(request.startDate)} - {formatDate(request.endDate)}
                  </p>
                  {request.reason && (
                    <p className="text-sm mt-1">
                      <strong>Motivo:</strong> {request.reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Solicitado el {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {request.status === "rejected" && request.rejectionReason && (
                  <div className="mb-2 p-2 bg-red-50 rounded text-sm">
                    <strong>Motivo de rechazo:</strong> {request.rejectionReason}
                  </div>
                )}

                {request.status === "approved" && request.approvalComment && (
                  <div className="mb-2 p-2 bg-green-50 rounded text-sm">
                    <strong>Comentario:</strong> {request.approvalComment}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleOpenDetailsModal(request.id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                  >
                    Ver detalles
                  </button>

                  {isEmployer && request.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleOpenApprovalModal(request.id, "approve")}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleOpenApprovalModal(request.id, "reject")}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de aprobación/rechazo */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={approvalAction === "approve" ? "Aprobar solicitud" : "Rechazar solicitud"}
      >
        {selectedRequest && (
          <div className="approval-modal">
            <div className="approval-request-info mb-4 p-3 bg-gray-50 rounded-lg">
              <p>
                <strong>Tipo:</strong> {getRequestTypeText(selectedRequest.type)}
              </p>
              <p>
                <strong>Empleado:</strong> {selectedRequest.employeeName}
              </p>
              <p>
                <strong>Periodo:</strong> {formatDate(selectedRequest.startDate)} -{" "}
                {formatDate(selectedRequest.endDate)}
              </p>
              {selectedRequest.reason && (
                <p>
                  <strong>Motivo:</strong> {selectedRequest.reason}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="approval-comment">
                {approvalAction === "approve" ? "Comentario (opcional):" : "Motivo del rechazo:"}
              </label>
              <textarea
                id="approval-comment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder={
                  approvalAction === "approve" ? "Añade un comentario opcional..." : "Indica el motivo del rechazo..."
                }
                required={approvalAction === "reject"}
              ></textarea>
              {approvalAction === "reject" && (
                <p className="text-xs text-red-500 mt-1">* El motivo del rechazo es obligatorio</p>
              )}
            </div>

            <div className="approval-actions mt-4 flex gap-2 justify-end">
              <button
                onClick={handleProcessRequest}
                className={`px-4 py-2 rounded text-white ${approvalAction === "approve" ? "bg-green-500" : "bg-red-500"}`}
              >
                {approvalAction === "approve" ? "Confirmar aprobación" : "Confirmar rechazo"}
              </button>
              <button onClick={() => setShowApprovalModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de detalles */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Detalles de la solicitud">
        {detailsRequest && (
          <div className="request-details-modal">
            <div className="request-status mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(detailsRequest.status)}`}>
                {getStatusText(detailsRequest.status)}
              </span>
            </div>

            <div className="request-info grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <h4 className="font-semibold text-lg">{getRequestTypeText(detailsRequest.type)}</h4>
              </div>

              <div>
                <p className="text-sm text-gray-500">Solicitante</p>
                <p className="font-medium">{detailsRequest.employeeName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Fecha de solicitud</p>
                <p className="font-medium">{new Date(detailsRequest.createdAt).toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Fecha de inicio</p>
                <p className="font-medium">{formatDate(detailsRequest.startDate)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Fecha de fin</p>
                <p className="font-medium">{formatDate(detailsRequest.endDate)}</p>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-gray-500">Motivo</p>
                <p className="font-medium">{detailsRequest.reason || "No especificado"}</p>
              </div>
            </div>

            {detailsRequest.status === "approved" && (
              <div className="approval-info p-3 bg-green-50 rounded-lg mb-4">
                <h5 className="font-semibold mb-2">Información de aprobación</h5>
                <p>
                  <strong>Aprobado por:</strong> {detailsRequest.approvedBy}
                </p>
                <p>
                  <strong>Fecha de aprobación:</strong> {new Date(detailsRequest.approvedAt).toLocaleDateString()}
                </p>
                {detailsRequest.approvalComment && (
                  <p>
                    <strong>Comentario:</strong> {detailsRequest.approvalComment}
                  </p>
                )}
              </div>
            )}

            {detailsRequest.status === "rejected" && (
              <div className="rejection-info p-3 bg-red-50 rounded-lg mb-4">
                <h5 className="font-semibold mb-2">Información de rechazo</h5>
                <p>
                  <strong>Rechazado por:</strong> {detailsRequest.rejectedBy}
                </p>
                <p>
                  <strong>Fecha de rechazo:</strong> {new Date(detailsRequest.rejectedAt).toLocaleDateString()}
                </p>
                <p>
                  <strong>Motivo del rechazo:</strong> {detailsRequest.rejectionReason}
                </p>
              </div>
            )}

            <div className="modal-actions flex justify-end">
              <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-blue-500 text-white rounded">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default VacationRequestsSection
