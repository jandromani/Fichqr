"use client"

import { useRoleProtection } from "../hooks/useRoleProtection"
import AccessDenied from "./AccessDenied"

/**
 * Componente para proteger secciones según el rol del usuario
 * @param {string} requiredSection - La sección que se intenta acceder (debe estar definida en PERMISSIONS)
 * @param {ReactNode} children - Los componentes hijos que se mostrarán si el usuario está autorizado
 * @param {string} fallbackMessage - Mensaje personalizado para mostrar si se deniega el acceso
 */
function RoleProtectedSection({ requiredSection, children, fallbackMessage }) {
  // Usar el hook de protección de roles
  const { isAuthorized, isLoading, error } = useRoleProtection(requiredSection, false)

  // Si está cargando, mostrar un indicador de carga
  if (isLoading) {
    return <div className="loading-indicator">Verificando permisos...</div>
  }

  // Si no está autorizado, mostrar el componente de acceso denegado
  if (!isAuthorized) {
    return <AccessDenied requiredSection={requiredSection} message={fallbackMessage || error} />
  }

  // Si está autorizado, mostrar los hijos
  return <>{children}</>
}

export default RoleProtectedSection
