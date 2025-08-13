"use client"

import { useAuth } from "../contexts/AuthContext"
import { useState } from "react"
import Tooltip from "./ui/Tooltip"
import EnvironmentBadge from "./ui/EnvironmentBadge"

function AdminMenu({ onSectionChange, activeSection }) {
  const { user, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleSectionClick = (section) => {
    onSectionChange(section)
  }

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    logout()
    setShowLogoutConfirm(false)
  }

  const cancelLogout = () => {
    setShowLogoutConfirm(false)
  }

  return (
    <div className="admin-menu">
      <div className="menu-header flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Panel de Administración</h3>
        <EnvironmentBadge />
      </div>
      <div className="user-info">
        <div className="user-avatar">{user?.name?.charAt(0) || "U"}</div>
        <div className="user-details">
          <div className="user-name">{user?.name || "Usuario"}</div>
          <div className="user-role">{user?.role || "Rol no definido"}</div>
        </div>
      </div>

      <nav className="menu-items">
        <button
          className={`menu-item ${activeSection === "Trabajadores" ? "active" : ""}`}
          onClick={() => handleSectionClick("Trabajadores")}
        >
          <span className="menu-icon">👥</span>
          <span className="menu-text">Trabajadores</span>
        </button>

        <button
          className={`menu-item ${activeSection === "Puestos" ? "active" : ""}`}
          onClick={() => handleSectionClick("Puestos")}
        >
          <span className="menu-icon">🏢</span>
          <span className="menu-text">Puestos</span>
        </button>

        <button
          className={`menu-item ${activeSection === "Calendario" ? "active" : ""}`}
          onClick={() => handleSectionClick("Calendario")}
        >
          <span className="menu-icon">📅</span>
          <span className="menu-text">Calendario</span>
        </button>

        <button
          className={`menu-item ${activeSection === "Informes" ? "active" : ""}`}
          onClick={() => handleSectionClick("Informes")}
        >
          <span className="menu-icon">📊</span>
          <span className="menu-text">Informes</span>
        </button>

        <button
          className={`menu-item ${activeSection === "Vacaciones" ? "active" : ""}`}
          onClick={() => handleSectionClick("Vacaciones")}
        >
          <span className="menu-icon">🏖️</span>
          <span className="menu-text">Vacaciones</span>
        </button>

        <button
          className={`menu-item ${activeSection === "Códigos QR" ? "active" : ""}`}
          onClick={() => handleSectionClick("Códigos QR")}
        >
          <span className="menu-icon">📱</span>
          <span className="menu-text">Códigos QR</span>
          <Tooltip content="Gestión avanzada de códigos QR para puestos" position="right">
            <span className="new-feature-badge">Nuevo</span>
          </Tooltip>
        </button>

        <button
          className={`menu-item ${activeSection === "Configuración" ? "active" : ""}`}
          onClick={() => handleSectionClick("Configuración")}
        >
          <span className="menu-icon">⚙️</span>
          <span className="menu-text">Configuración</span>
        </button>
      </nav>

      <div className="menu-footer">
        <button className="logout-button" onClick={handleLogoutClick}>
          <span className="menu-icon">🚪</span>
          <span className="menu-text">Cerrar sesión</span>
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="logout-confirm">
          <p>¿Estás seguro de que deseas cerrar sesión?</p>
          <div className="logout-actions">
            <button className="confirm-btn" onClick={confirmLogout}>
              Sí, cerrar sesión
            </button>
            <button className="cancel-btn" onClick={cancelLogout}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminMenu
