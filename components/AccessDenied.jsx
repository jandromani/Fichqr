"use client"

import { useAuth } from "../contexts/AuthContext"

function AccessDenied({ requiredSection, message }) {
  const { PERMISSIONS, user } = useAuth()

  // Obtener información sobre el permiso requerido
  const permissionInfo = PERMISSIONS[requiredSection] || {
    description: "Acceso a esta sección",
    minLevel: 999,
  }

  return (
    <div className="access-denied">
      <div className="access-denied-content">
        <h2 className="access-denied-title">Acceso Denegado</h2>

        <div className="access-denied-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <p className="access-denied-message">{message || `No tienes permiso para acceder a esta sección.`}</p>

        <div className="access-denied-details">
          <p>
            <strong>Sección:</strong> {permissionInfo.description}
          </p>
          <p>
            <strong>Tu rol actual:</strong> {user?.role || "No autenticado"}
          </p>
        </div>

        <div className="access-denied-actions">
          <button onClick={() => window.history.back()} className="access-denied-back-btn">
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied
