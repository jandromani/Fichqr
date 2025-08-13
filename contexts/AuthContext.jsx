"use client"

import { createContext, useContext, useState, useEffect } from "react"

// Definición de roles y sus niveles de acceso
export const ROLES = {
  ADMIN: {
    name: "admin",
    level: 3,
    label: "Administrador",
    description: "Acceso completo a todas las funcionalidades del sistema",
  },
  EMPLOYER: {
    name: "employer",
    level: 2,
    label: "Empleador",
    description: "Gestión de trabajadores, puestos e informes",
  },
  WORKER: {
    name: "worker",
    level: 1,
    label: "Trabajador",
    description: "Fichaje y gestión de solicitudes personales",
  },
  GUEST: {
    name: "guest",
    level: 0,
    label: "Invitado",
    description: "Acceso limitado, solo puede iniciar sesión",
  },
}

// Definición de permisos por sección
export const PERMISSIONS = {
  USER: { minLevel: ROLES.WORKER.level, description: "Ver y editar perfil de usuario" },
  CALENDAR: { minLevel: ROLES.WORKER.level, description: "Ver calendario personal" },
  VACATIONS: { minLevel: ROLES.WORKER.level, description: "Gestionar solicitudes de ausencia" },
  CONFIG: { minLevel: ROLES.EMPLOYER.level, description: "Configuración del sistema" },
  POSITIONS: { minLevel: ROLES.EMPLOYER.level, description: "Gestionar puestos de trabajo" },
  WORKERS: { minLevel: ROLES.EMPLOYER.level, description: "Gestionar trabajadores" },
  REPORTS_POSITIONS: { minLevel: ROLES.EMPLOYER.level, description: "Ver informes por puesto" },
  REPORTS_WORKERS: { minLevel: ROLES.EMPLOYER.level, description: "Ver informes por trabajador" },
  SYSTEM_SETTINGS: { minLevel: ROLES.ADMIN.level, description: "Configuración avanzada del sistema" },
}

// Creación del contexto
const AuthContext = createContext(null)

// Proveedor del contexto
export function AuthProvider({ children }) {
  // Estado para el usuario autenticado
  const [user, setUser] = useState(null)
  // Estado para controlar si se está cargando la autenticación
  const [loading, setLoading] = useState(true)
  // Estado para almacenar errores de autenticación
  const [authError, setAuthError] = useState(null)

  // Efecto para verificar si hay un usuario en localStorage al cargar
  useEffect(() => {
    try {
      // Intentar recuperar el usuario del localStorage
      const savedUser = localStorage.getItem("ficharQR_user")
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
    } catch (error) {
      console.error("Error al recuperar la sesión:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Función para iniciar sesión
  const login = (userData) => {
    try {
      // En una implementación real, aquí se verificarían las credenciales con Firebase
      // y se obtendría el token de autenticación

      // Guardar el usuario en el estado y en localStorage
      setUser(userData)
      localStorage.setItem("ficharQR_user", JSON.stringify(userData))
      setAuthError(null)
      return true
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
      setAuthError("Error al iniciar sesión. Por favor, inténtalo de nuevo.")
      return false
    }
  }

  // Función para cerrar sesión
  const logout = () => {
    try {
      // En una implementación real, aquí se cerraría la sesión en Firebase

      // Eliminar el usuario del estado y de localStorage
      setUser(null)
      localStorage.removeItem("ficharQR_user")
      return true
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      return false
    }
  }

  // Función para verificar si el usuario tiene un rol específico
  const hasRole = (role) => {
    if (!user) return false
    return user.role === role
  }

  // Función para verificar si el usuario tiene un nivel de acceso suficiente
  const hasAccessLevel = (requiredLevel) => {
    if (!user) return false

    // Obtener el nivel del rol del usuario
    const userRoleLevel = ROLES[user.role.toUpperCase()]?.level || 0

    return userRoleLevel >= requiredLevel
  }

  // Función para verificar si el usuario tiene permiso para acceder a una sección
  const hasPermission = (section) => {
    if (!user) return false

    // Obtener el nivel requerido para la sección
    const requiredLevel = PERMISSIONS[section]?.minLevel || 999

    // Obtener el nivel del rol del usuario
    const userRoleLevel = ROLES[user.role.toUpperCase()]?.level || 0

    return userRoleLevel >= requiredLevel
  }

  // Valor del contexto
  const value = {
    user,
    loading,
    authError,
    login,
    logout,
    hasRole,
    hasAccessLevel,
    hasPermission,
    ROLES,
    PERMISSIONS,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider")
  }
  return context
}
