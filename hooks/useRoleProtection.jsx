"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"

/**
 * Hook personalizado para proteger componentes según el rol del usuario
 * @param {string} requiredSection - La sección que se intenta acceder (debe estar definida en PERMISSIONS)
 * @param {boolean} redirectOnFailure - Si es true, redirige a la página de acceso denegado
 * @returns {Object} - Objeto con propiedades isAuthorized, isLoading y error
 */
export function useRoleProtection(requiredSection, redirectOnFailure = true) {
  const { user, loading, hasPermission } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Si aún está cargando la autenticación, no hacemos nada
    if (loading) return

    // Si no hay usuario, no está autorizado
    if (!user) {
      setIsAuthorized(false)
      setError("Debes iniciar sesión para acceder a esta sección")
      return
    }

    // Verificar si el usuario tiene permiso para acceder a la sección
    const authorized = hasPermission(requiredSection)
    setIsAuthorized(authorized)

    if (!authorized) {
      setError(`No tienes permiso para acceder a la sección ${requiredSection}`)

      // Si se debe redirigir en caso de fallo y estamos en el navegador
      if (redirectOnFailure && typeof window !== "undefined") {
        // En una implementación real, aquí redirigirías a una página de acceso denegado
        // Por ahora, solo mostramos un mensaje en la consola
        console.error(`Acceso denegado a la sección ${requiredSection}`)
      }
    }
  }, [user, loading, requiredSection, redirectOnFailure, hasPermission])

  return { isAuthorized, isLoading: loading, error }
}
