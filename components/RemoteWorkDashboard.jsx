"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { getRemoteWorkActivityHistory } from "../services/remoteWorkService"
import { clockRecordService } from "../services/storageService"

/**
 * Componente para mostrar un dashboard de teletrabajo
 * Muestra estadísticas y registros de fichajes remotos
 */
function RemoteWorkDashboard() {
  const { user } = useAuth()
  const [remoteClockRecords, setRemoteClockRecords] = useState([])
  const [activityHistory, setActivityHistory] = useState([])
  const [stats, setStats] = useState({
    totalRemoteHours: 0,
    remoteWorkDays: 0,
    averageHoursPerDay: 0,
    remoteWorkPercentage: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user && user.id) {
      loadRemoteWorkData()
    }
  }, [user])

  // Función para cargar datos de teletrabajo
  const loadRemoteWorkData = async () => {
    setIsLoading(true)

    try {
      // Obtener todos los registros de fichaje del usuario
      const allClockRecords = clockRecordService.getByUserId(user.id)

      // Filtrar solo los registros remotos
      const remoteRecords = allClockRecords.filter((record) => record.isRemote)
      setRemoteClockRecords(remoteRecords)

      // Obtener historial de actividad
      const activity = getRemoteWorkActivityHistory(user.id)
      setActivityHistory(activity)

      // Calcular estadísticas
      calculateStats(remoteRecords, allClockRecords)
    } catch (error) {
      console.error("Error al cargar datos de teletrabajo:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Función para calcular estadísticas
  const calculateStats = (remoteRecords, allRecords) => {
    // Total de horas en remoto
    const totalRemoteMinutes = remoteRecords.reduce((total, record) => {
      return total + (record.duration || 0)
    }, 0)

    // Total de horas trabajadas
    const totalMinutes = allRecords.reduce((total, record) => {
      return total + (record.duration || 0)
    }, 0)

    // Calcular días únicos de teletrabajo
    const uniqueDays = new Set()
    remoteRecords.forEach((record) => {
      const date = new Date(record.date).toDateString()
      uniqueDays.add(date)
    })

    // Calcular estadísticas
    const remoteHours = Math.round((totalRemoteMinutes / 60) * 10) / 10
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10
    const remoteWorkDays = uniqueDays.size
    const averageHoursPerDay = remoteWorkDays > 0 ? Math.round((remoteHours / remoteWorkDays) * 10) / 10 : 0
    const remoteWorkPercentage = totalHours > 0 ? Math.round((remoteHours / totalHours) * 100) : 0

    setStats({
      totalRemoteHours: remoteHours,
      remoteWorkDays,
      averageHoursPerDay,
      remoteWorkPercentage,
    })
  }

  // Formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Formatear hora
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Formatear duración
  const formatDuration = (minutes) => {
    if (!minutes) return "N/A"

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    return `${hours}h ${mins}m`
  }

  if (isLoading) {
    return <div className="loading-indicator">Cargando datos de teletrabajo...</div>
  }

  return (
    <div className="remote-work-dashboard">
      <h2 className="text-xl font-semibold mb-6">Dashboard de Teletrabajo</h2>

      {/* Tarjetas de estadísticas */}
      <div className="stats-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card bg-purple-50 p-4 rounded-lg shadow-sm border border-purple-100">
          <h3 className="text-sm font-medium text-purple-700 mb-1">Horas en Teletrabajo</h3>
          <p className="text-2xl font-bold text-purple-900">{stats.totalRemoteHours}</p>
        </div>

        <div className="stat-card bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
          <h3 className="text-sm font-medium text-blue-700 mb-1">Días de Teletrabajo</h3>
          <p className="text-2xl font-bold text-blue-900">{stats.remoteWorkDays}</p>
        </div>

        <div className="stat-card bg-green-50 p-4 rounded-lg shadow-sm border border-green-100">
          <h3 className="text-sm font-medium text-green-700 mb-1">Media Diaria</h3>
          <p className="text-2xl font-bold text-green-900">{stats.averageHoursPerDay}h</p>
        </div>

        <div className="stat-card bg-amber-50 p-4 rounded-lg shadow-sm border border-amber-100">
          <h3 className="text-sm font-medium text-amber-700 mb-1">% Teletrabajo</h3>
          <p className="text-2xl font-bold text-amber-900">{stats.remoteWorkPercentage}%</p>
        </div>
      </div>

      {/* Historial de fichajes remotos */}
      <div className="remote-records mb-8">
        <h3 className="text-lg font-medium mb-4">Historial de Fichajes Remotos</h3>

        {remoteClockRecords.length === 0 ? (
          <div className="no-data-message">
            <p>No hay registros de fichajes remotos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Puesto</th>
                  <th className="px-4 py-2 text-left">Hora Inicio</th>
                  <th className="px-4 py-2 text-left">Hora Fin</th>
                  <th className="px-4 py-2 text-left">Duración</th>
                  <th className="px-4 py-2 text-left">IP</th>
                </tr>
              </thead>
              <tbody>
                {remoteClockRecords.map((record) => (
                  <tr key={record.id} className="border-b">
                    <td className="px-4 py-2">{formatDate(record.date)}</td>
                    <td className="px-4 py-2">{record.positionName}</td>
                    <td className="px-4 py-2">{formatTime(record.startTime)}</td>
                    <td className="px-4 py-2">{record.endTime ? formatTime(record.endTime) : "En curso"}</td>
                    <td className="px-4 py-2">{formatDuration(record.duration)}</td>
                    <td className="px-4 py-2">{record.remoteInfo?.ip || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Información de teletrabajo */}
      <div className="remote-work-info p-4 bg-purple-50 rounded-lg border border-purple-100">
        <h3 className="text-lg font-medium mb-2 text-purple-800">Información sobre Teletrabajo</h3>
        <p className="mb-2">
          El teletrabajo está regulado por la Ley 10/2021, de 9 de julio, de trabajo a distancia, que establece:
        </p>
        <ul className="list-disc pl-5 mb-2 text-sm">
          <li>El registro horario es obligatorio también en teletrabajo.</li>
          <li>La empresa debe proporcionar los medios adecuados para el teletrabajo.</li>
          <li>El trabajador tiene derecho a la desconexión digital fuera del horario laboral.</li>
          <li>Se debe garantizar la protección de datos y la seguridad de la información.</li>
        </ul>
        <p className="text-sm text-purple-700">
          <strong>Nota:</strong> Esta aplicación cumple con los requisitos legales de registro horario en teletrabajo,
          recopilando datos adicionales para garantizar la trazabilidad de los fichajes remotos.
        </p>
      </div>
    </div>
  )
}

export default RemoteWorkDashboard
