"use client"

import Tooltip from "./Tooltip"

/**
 * Componente que muestra un indicador visual de que un registro está bloqueado
 * @param {boolean} isLocked - Indica si el registro está bloqueado
 */
function LockedBadge({ isLocked }) {
  if (!isLocked) return null

  return (
    <Tooltip content="Este registro está bloqueado y no puede ser modificado para garantizar la integridad de los datos">
      <span className="locked-badge">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </span>
    </Tooltip>
  )
}

export default LockedBadge
