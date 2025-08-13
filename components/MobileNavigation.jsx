"use client"

import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"

function MobileNavigation({ onSectionChange, currentSection }) {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleSectionClick = (section) => {
    onSectionChange(section)
    setIsOpen(false)
  }

  return (
    <div className="mobile-navigation">
      <button className="menu-toggle" onClick={toggleMenu}>
        <span className="menu-icon">{isOpen ? "✕" : "☰"}</span>
        <span className="current-section">{currentSection}</span>
      </button>

      {isOpen && (
        <div className="mobile-menu">
          <div className="menu-header">
            <span className="user-name">{user?.name || "Usuario"}</span>
            <button className="close-menu" onClick={toggleMenu}>
              ✕
            </button>
          </div>

          <div className="menu-items">
            <button
              className={`menu-item ${currentSection === "Trabajadores" ? "active" : ""}`}
              onClick={() => handleSectionClick("Trabajadores")}
            >
              👥 Trabajadores
            </button>
            <button
              className={`menu-item ${currentSection === "Puestos" ? "active" : ""}`}
              onClick={() => handleSectionClick("Puestos")}
            >
              🏢 Puestos
            </button>
            <button
              className={`menu-item ${currentSection === "Calendario" ? "active" : ""}`}
              onClick={() => handleSectionClick("Calendario")}
            >
              📅 Calendario
            </button>
            <button
              className={`menu-item ${currentSection === "Informes" ? "active" : ""}`}
              onClick={() => handleSectionClick("Informes")}
            >
              📊 Informes
            </button>
            <button
              className={`menu-item ${currentSection === "Vacaciones" ? "active" : ""}`}
              onClick={() => handleSectionClick("Vacaciones")}
            >
              🏖️ Vacaciones
            </button>
            <button
              className={`menu-item ${currentSection === "Códigos QR" ? "active" : ""}`}
              onClick={() => handleSectionClick("Códigos QR")}
            >
              📱 Códigos QR
            </button>
            <button
              className={`menu-item ${currentSection === "Configuración" ? "active" : ""}`}
              onClick={() => handleSectionClick("Configuración")}
            >
              ⚙️ Configuración
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MobileNavigation
