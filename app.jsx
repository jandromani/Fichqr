"use client"

import { useState, useEffect } from "react"
import { AuthProvider } from "./contexts/AuthContext"
import { ToastProvider } from "./contexts/ToastContext"
import { LightModeProvider } from "./contexts/LightModeContext"
import { EnvironmentProvider, useEnvironment } from "./contexts/EnvironmentContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import SetupWizard from "./components/setup/SetupWizard"
import AuthPages from "./components/AuthPages"
import AdminMenu from "./components/AdminMenu"
import MobileNavigation from "./components/MobileNavigation"
import WorkersSection from "./components/sections/WorkersSection"
import PositionsSection from "./components/sections/PositionsSection"
import CalendarSection from "./components/sections/CalendarSection"
import ReportsWorkersSection from "./components/reports/ReportsWorkersSection"
import ReportsPositionsSection from "./components/reports/ReportsPositionsSection"
import VacationRequestsSection from "./components/sections/VacationRequestsSection"
import ConfigSection from "./components/sections/ConfigSection"
import QRManagementSection from "./components/sections/QRManagementSection"
import WorkerClockView from "./components/clock/WorkerClockView"
import ConnectionStatusIndicator from "./components/ConnectionStatusIndicator"
import SyncQueueManager from "./components/SyncQueueManager"
import NotificationCenter from "./components/NotificationCenter"
import LightModeToggle from "./components/LightModeToggle"
import LanguageSelector from "./components/LanguageSelector"
import { useAuth } from "./contexts/AuthContext"
import { useTranslation } from "react-i18next"
import "./services/i18n/i18n" // Importar configuración de i18n
import "./styles.css"
import "./styles/qr-components.css"
import "./styles/auth.css"
import "./styles/rtl-support.css"

function App() {
  return (
    <EnvironmentProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <LightModeProvider>
              <AppContent />
            </LightModeProvider>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </EnvironmentProvider>
  )
}

function AppContent() {
  const { isFirstTime, isLoading } = useEnvironment()
  const [setupComplete, setSetupComplete] = useState(false)
  const { user, loading } = useAuth()
  const [activeSection, setActiveSection] = useState("Trabajadores")
  const [positionId, setPositionId] = useState(null)
  const { t } = useTranslation()

  // Verificar si hay un positionId en la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlPositionId = params.get("positionId")
    if (urlPositionId) {
      setPositionId(urlPositionId)
    }
  }, [])

  // Mostrar pantalla de carga mientras se inicializa
  if (isLoading) {
    return <div className="loading-screen">{t("app.loading", "Cargando...")}</div>
  }

  // Mostrar el asistente de configuración si es la primera vez
  if (isFirstTime && !setupComplete) {
    return <SetupWizard onComplete={() => setSetupComplete(true)} />
  }

  // Si hay un positionId, mostrar la vista de fichaje
  if (positionId) {
    return <WorkerClockView positionId={positionId} />
  }

  // Si está cargando o no hay usuario, mostrar la página de autenticación
  if (loading) {
    return <div className="loading">{t("app.loading", "Cargando...")}</div>
  }

  if (!user) {
    return <AuthPages />
  }

  // Renderizar la sección activa
  const renderActiveSection = () => {
    switch (activeSection) {
      case "Trabajadores":
        return <WorkersSection />
      case "Puestos":
        return <PositionsSection />
      case "Calendario":
        return <CalendarSection />
      case "Informes":
        return (
          <div className="reports-container">
            <ReportsWorkersSection />
            <ReportsPositionsSection />
          </div>
        )
      case "Vacaciones":
        return <VacationRequestsSection />
      case "Códigos QR":
        return <QRManagementSection user={user} />
      case "Configuración":
        return <ConfigSection />
      default:
        return <WorkersSection />
    }
  }

  // Contenido normal de la aplicación
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{t("app.title", "Sistema de Fichaje")}</h1>
        <div className="header-controls">
          <LanguageSelector variant="icons" size="sm" />
          <LightModeToggle />
          <NotificationCenter />
        </div>
      </header>

      <div className="app-content">
        <AdminMenu onSectionChange={setActiveSection} activeSection={activeSection} />
        <MobileNavigation onSectionChange={setActiveSection} currentSection={activeSection} />

        <main className="main-content">
          <h2>{t(`navigation.${activeSection.toLowerCase()}`, activeSection)}</h2>
          {renderActiveSection()}
        </main>
      </div>

      <ConnectionStatusIndicator />
      <SyncQueueManager />
    </div>
  )
}

export default App
