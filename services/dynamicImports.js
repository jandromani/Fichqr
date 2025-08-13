/**
 * Servicio para gestionar importaciones dinámicas
 * Permite cargar componentes y servicios bajo demanda para mejorar el rendimiento
 */

import { lazy } from "react"

// Componentes que se cargarán dinámicamente
export const DynamicComponents = {
  // Componentes de administración
  AuditLogViewer: lazy(() => import("../components/admin/AuditLogViewer")),
  BackupManager: lazy(() => import("../components/BackupManager")),
  RecoveryManager: lazy(() => import("../components/RecoveryManager")),

  // Componentes de reportes
  ReportExporter: lazy(() => import("../components/ReportExporter")),
  UserExportTool: lazy(() => import("../components/UserExportTool")),

  // Componentes de UI avanzados
  RemoteWorkDashboard: lazy(() => import("../components/RemoteWorkDashboard")),
  IntegrityChecker: lazy(() => import("../components/IntegrityChecker")),
}

// Servicios que se cargarán dinámicamente
export const loadService = async (serviceName) => {
  switch (serviceName) {
    case "remoteWork":
      return import("./remoteWorkService").then((module) => module.default || module)
    case "backup":
      return import("./backupService").then((module) => module.default || module)
    case "auditLog":
      return import("./auditLogService").then((module) => module.default || module)
    case "integrity":
      return import("./integrityService").then((module) => module.default || module)
    default:
      throw new Error(`Servicio no encontrado: ${serviceName}`)
  }
}

// Función para precargar servicios en segundo plano
export const preloadServices = () => {
  // Usar requestIdleCallback si está disponible, o setTimeout como fallback
  const schedulePreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000))

  schedulePreload(() => {
    console.log("Precargando servicios en segundo plano...")

    // Precargar servicios comunes
    import("./remoteWorkService")
    import("./backupService")
  })
}

// Función para precargar componentes en segundo plano
export const preloadComponents = (componentNames = []) => {
  const schedulePreload = window.requestIdleCallback || ((cb) => setTimeout(cb, 1000))

  schedulePreload(() => {
    console.log("Precargando componentes en segundo plano...")

    componentNames.forEach((name) => {
      if (DynamicComponents[name]) {
        // Iniciar la carga del componente
        DynamicComponents[name].preload?.()
      }
    })
  })
}
