"use client"

import { useState, useEffect } from "react"
import AdminMenu from "./AdminMenu"
import UserSection from "../sections/UserSection"
import ConfigSection from "../sections/ConfigSection"
import PositionsSection from "../sections/PositionsSection"
import WorkersSection from "../sections/WorkersSection"
import VacationRequestsSection from "../sections/VacationRequestsSection"
import CalendarSection from "../sections/CalendarSection"
import ReportsPositionsSection from "../reports/ReportsPositionsSection"
import ReportsWorkersSection from "../reports/ReportsWorkersSection"
import NotificationCenter from "../NotificationCenter"
import MobileNavigation from "../MobileNavigation"
import { notificationService } from "../../services"
import RoleProtectedSection from "../RoleProtectedSection"
import { useAuth } from "../../contexts/AuthContext"
import ConfirmationModal from "../ui/ConfirmationModal"

function AdminPanel() {
  // Usar el contexto de autenticación
  const { user, logout } = useAuth()

  // Estado para controlar qué sección está activa
  const [activeSection, setActiveSection] = useState("user")

  // Estado para el modal de confirmación de cierre de sesión
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false)

  // Efecto para solicitar permiso de notificaciones al cargar
  useEffect(() => {
    // Verificar si el navegador soporta notificaciones
    if (notificationService.isSupported()) {
      // Si ya tenemos permiso, no hacemos nada
      if (notificationService.hasPermission()) {
        console.log("Ya tenemos permiso para mostrar notificaciones")
      } else if (Notification.permission !== "denied") {
        // Si no tenemos permiso pero tampoco ha sido denegado, lo solicitamos automáticamente
        notificationService.requestPermission().then((granted) => {
          if (granted) {
            console.log("Permiso de notificaciones concedido")
          } else {
            console.log("Permiso de notificaciones denegado")
          }
        })
      }
    }
  }, [])

  // Función para cambiar de sección
  const handleSectionChange = (section) => {
    setActiveSection(section)

    // Hacer scroll al inicio cuando se cambia de sección
    window.scrollTo(0, 0)
  }

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    setShowLogoutConfirmation(true)
  }

  // Función para confirmar el cierre de sesión
  const confirmLogout = () => {
    logout()
    setShowLogoutConfirmation(false)
  }

  // Renderizado condicional de la sección activa con protección de roles
  const renderActiveSection = () => {
    switch (activeSection) {
      case "user":
        return (
          <RoleProtectedSection requiredSection="USER">
            <UserSection user={user} />
          </RoleProtectedSection>
        )
      case "config":
        return (
          <RoleProtectedSection requiredSection="CONFIG">
            <ConfigSection />
          </RoleProtectedSection>
        )
      case "positions":
        return (
          <RoleProtectedSection requiredSection="POSITIONS">
            <PositionsSection />
          </RoleProtectedSection>
        )
      case "workers":
        return (
          <RoleProtectedSection requiredSection="WORKERS">
            <WorkersSection />
          </RoleProtectedSection>
        )
      case "vacations":
        return (
          <RoleProtectedSection requiredSection="VACATIONS">
            <VacationRequestsSection user={user} isEmployer={user.role === "employer" || user.role === "admin"} />
          </RoleProtectedSection>
        )
      case "calendar":
        return (
          <RoleProtectedSection requiredSection="CALENDAR">
            <CalendarSection user={user} />
          </RoleProtectedSection>
        )
      case "reportsPositions":
        return (
          <RoleProtectedSection requiredSection="REPORTS_POSITIONS">
            <ReportsPositionsSection />
          </RoleProtectedSection>
        )
      case "reportsWorkers":
        return (
          <RoleProtectedSection requiredSection="REPORTS_WORKERS">
            <ReportsWorkersSection />
          </RoleProtectedSection>
        )
      default:
        return (
          <RoleProtectedSection requiredSection="USER">
            <UserSection user={user} />
          </RoleProtectedSection>
        )
    }
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Panel de {user.role === "employer" ? "Administración" : "Usuario"}</h1>
        <div className="user-info">
          <NotificationCenter user={user} />
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role === "employer" ? "Empleador" : "Trabajador"}</span>
          <button onClick={handleLogout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="admin-content">
        <AdminMenu activeSection={activeSection} onSectionChange={handleSectionChange} userRole={user.role} />

        <main className="section-content">{renderActiveSection()}</main>
      </div>

      {/* Navegación móvil */}
      <MobileNavigation activeSection={activeSection} onSectionChange={handleSectionChange} />

      {/* Modal de confirmación de cierre de sesión */}
      <ConfirmationModal
        isOpen={showLogoutConfirmation}
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={confirmLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión? Tendrás que volver a iniciar sesión para acceder a tu cuenta."
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        type="warning"
      />
    </div>
  )
}

export default AdminPanel
