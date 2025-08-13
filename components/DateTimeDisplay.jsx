"use client"
import { useLanguage } from "../contexts/LanguageContext"

const DateTimeDisplay = ({ date, format = "medium", showTime = true, showDate = true, className = "" }) => {
  const { formatDate } = useLanguage()

  if (!date) return null

  const dateObj = typeof date === "string" ? new Date(date) : date

  // Opciones para diferentes formatos de fecha
  const getDateOptions = () => {
    switch (format) {
      case "short":
        return {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        }
      case "long":
        return {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        }
      case "medium":
      default:
        return {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
    }
  }

  // Opciones para diferentes formatos de hora
  const getTimeOptions = () => {
    switch (format) {
      case "short":
        return {
          hour: "numeric",
          minute: "numeric",
        }
      case "long":
        return {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
          hour12: true,
        }
      case "medium":
      default:
        return {
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }
    }
  }

  // Formatear solo fecha
  const formattedDate = showDate ? formatDate(dateObj, getDateOptions()) : ""

  // Formatear solo hora
  const formattedTime = showTime ? formatDate(dateObj, getTimeOptions()) : ""

  // Combinar fecha y hora
  const formattedDateTime = [showDate ? formattedDate : "", showTime ? formattedTime : ""].filter(Boolean).join(" ")

  return (
    <time dateTime={dateObj.toISOString()} className={className}>
      {formattedDateTime}
    </time>
  )
}

export default DateTimeDisplay
