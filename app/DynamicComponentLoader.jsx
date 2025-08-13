"use client"

import { Suspense, useState, useEffect } from "react"
import { DynamicComponents, preloadComponents } from "../services/dynamicImports"

// Componente de carga para mostrar mientras se carga el componente dinámico
const LoadingFallback = ({ componentName }) => (
  <div className="dynamic-loading">
    <div className="loading-spinner"></div>
    <p>Cargando {componentName}...</p>
  </div>
)

// Componente de error para mostrar si falla la carga
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (error) => {
      console.error("Error al cargar componente dinámico:", error)
      setHasError(true)
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  if (hasError) {
    return (
      <div className="dynamic-error">
        <p>Error al cargar el componente. Por favor, recarga la página.</p>
        <button onClick={() => window.location.reload()}>Recargar</button>
      </div>
    )
  }

  return children
}

/**
 * Componente para cargar dinámicamente otros componentes
 * @param {string} name - Nombre del componente a cargar
 * @param {object} props - Props para pasar al componente
 * @param {array} preload - Lista de componentes adicionales a precargar
 */
const DynamicComponentLoader = ({ name, props = {}, preload = [] }) => {
  const Component = DynamicComponents[name]

  useEffect(() => {
    // Precargar componentes adicionales
    if (preload.length > 0) {
      preloadComponents(preload)
    }
  }, [preload])

  if (!Component) {
    return <div>Componente "{name}" no encontrado</div>
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback componentName={name} />}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

export default DynamicComponentLoader
