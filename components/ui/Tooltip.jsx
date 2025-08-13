"use client"

import { useState, useRef, useEffect } from "react"

function Tooltip({ children, content, position = "top", delay = 300, className = "", maxWidth = 250 }) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const timerRef = useRef(null)

  // Calcular la posición del tooltip
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft

    let top = 0
    let left = 0

    switch (position) {
      case "top":
        top = triggerRect.top + scrollTop - tooltipRect.height - 10
        left = triggerRect.left + scrollLeft + triggerRect.width / 2 - tooltipRect.width / 2
        break
      case "bottom":
        top = triggerRect.bottom + scrollTop + 10
        left = triggerRect.left + scrollLeft + triggerRect.width / 2 - tooltipRect.width / 2
        break
      case "left":
        top = triggerRect.top + scrollTop + triggerRect.height / 2 - tooltipRect.height / 2
        left = triggerRect.left + scrollLeft - tooltipRect.width - 10
        break
      case "right":
        top = triggerRect.top + scrollTop + triggerRect.height / 2 - tooltipRect.height / 2
        left = triggerRect.right + scrollLeft + 10
        break
      default:
        top = triggerRect.top + scrollTop - tooltipRect.height - 10
        left = triggerRect.left + scrollLeft + triggerRect.width / 2 - tooltipRect.width / 2
    }

    // Asegurarse de que el tooltip no se salga de la ventana
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Ajustar horizontalmente
    if (left < 10) {
      left = 10
    } else if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10
    }

    // Ajustar verticalmente
    if (top < 10) {
      // Si no hay espacio arriba, mostrar abajo
      if (position === "top") {
        top = triggerRect.bottom + scrollTop + 10
      } else {
        top = 10
      }
    } else if (top + tooltipRect.height > viewportHeight + scrollTop - 10) {
      // Si no hay espacio abajo, mostrar arriba
      if (position === "bottom") {
        top = triggerRect.top + scrollTop - tooltipRect.height - 10
      } else {
        top = viewportHeight + scrollTop - tooltipRect.height - 10
      }
    }

    setTooltipPosition({ top, left })
  }

  // Mostrar el tooltip
  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true)
      // Calcular la posición después de que el tooltip sea visible
      setTimeout(calculatePosition, 0)
    }, delay)
  }

  // Ocultar el tooltip
  const handleMouseLeave = () => {
    clearTimeout(timerRef.current)
    setIsVisible(false)
  }

  // Manejar clic para dispositivos táctiles
  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (isVisible) {
      setIsVisible(false)
    } else {
      setIsVisible(true)
      // Calcular la posición después de que el tooltip sea visible
      setTimeout(calculatePosition, 0)
    }
  }

  // Efecto para manejar clics fuera del tooltip
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isVisible &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target)
      ) {
        setIsVisible(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isVisible])

  // Efecto para recalcular la posición al cambiar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        calculatePosition()
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [isVisible])

  // Limpiar el temporizador al desmontar
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className={`tooltip-container ${className}`}>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip-${position}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            maxWidth: `${maxWidth}px`,
          }}
        >
          <div className="tooltip-content">{content}</div>
        </div>
      )}
    </div>
  )
}

export default Tooltip
