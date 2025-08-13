"use client"

import { useState, useEffect } from "react"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../contexts/AuthContext"
import { verifyAllClockRecords, repairTamperedRecord } from "../services/integrityService"
import Modal from "./ui/Modal"

/**
 * Componente unificado para verificar la integridad de los datos y mostrar advertencias
 */
function IntegrityChecker() {
  const { user } = useAuth()
  const toast = useToast()

  const [isChecking, setIsChecking] = useState(false)
  const [lastCheckResult, setLastCheckResult] = useState(null)
  const [showWarning, setShowWarning] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isReporting, setIsReporting] = useState(false)

  // Verificar integridad al cargar el componente
  useEffect(() => {
    // Verificación automática al iniciar
    handleCheckIntegrity(true)
  }, [])

  // Función para verificar la integridad de los datos
  const handleCheckIntegrity = (silent = false) => {
    setIsChecking(true)

    try {
      const result = verifyAllClockRecords(user)
      setLastCheckResult(result)

      if (!silent) {
        if (result.isValid) {
          toast.showSuccess(`Verificación completada: ${result.validRecords} registros válidos`)
        } else {
          toast.showError(`Se encontraron ${result.tamperedRecords.length} registros manipulados`)
        }
      } else if (!result.isValid) {
        // Incluso en modo silencioso, mostrar una advertencia si hay problemas
        toast.showWarning(
          `Alerta: Se detectaron ${result.tamperedRecords.length} registros con problemas de integridad`,
        )
      }
    } catch (error) {
      console.error("Error al verificar integridad:", error)
      if (!silent) {
        toast.showError("Error al verificar la integridad de los datos")
      }
    } finally {
      setIsChecking(false)
    }
  }

  // Función para reparar un registro manipulado
  const handleRepairRecord = (recordId) => {
    if (!user || user.role !== "admin") {
      toast.showError("Solo los administradores pueden reparar registros")
      return
    }

    try {
      const success = repairTamperedRecord(recordId, user)

      if (success) {
        toast.showSuccess("Registro reparado correctamente")
        // Actualizar los resultados
        handleCheckIntegrity(true)
      } else {
        toast.showError("No se pudo reparar el registro")
      }
    } catch (error) {
      console.error("Error al reparar registro:", error)
      toast.showError("Error al reparar el registro")
    }
  }

  // Función para mostrar detalles de un registro manipulado
  const handleShowDetails = (record) => {
    setSelectedRecord(record)
    setShowWarning(true)
  }

  // Función para reportar un problema de integridad
  const handleReportIssue = (record) => {
    setIsReporting(true)

    // En una implementación real, esto enviaría el reporte a un servidor
    setTimeout(() => {
      toast.showSuccess("Problema reportado correctamente")
      setIsReporting(false)
      setShowWarning(false)

      // Registrar en consola para depuración
      console.log("Problema de integridad reportado:", record)
    }, 1500)
  }

  // Componente de advertencia de integridad (anteriormente en IntegrityWarning.jsx)
  const IntegrityWarningModal = () => {
    if (!showWarning || !selectedRecord) return null

    return (
      <Modal isOpen={showWarning} onClose={() => setShowWarning(false)} title="⚠️ Advertencia de Integridad">
        <div className="integrity-warning">
          <div className="warning-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-red-500 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="warning-message">
            <p className="text-lg font-semibold mb-2 text-red-700">Se ha detectado una posible manipulación de datos</p>
            <p className="mb-4">
              El registro de fichaje que intenta visualizar presenta inconsistencias en su firma digital, lo que indica
              que puede haber sido alterado fuera del sistema.
            </p>

            <div className="record-details bg-gray-50 p-3 rounded-lg mb-4">
              <p>
                <strong>ID del registro:</strong> {selectedRecord?.id || "Desconocido"}
              </p>
              <p>
                <strong>Fecha:</strong>{" "}
                {selectedRecord?.date ? new Date(selectedRecord.date).toLocaleDateString() : "Desconocida"}
              </p>
              <p>
                <strong>Usuario:</strong> {selectedRecord?.userName || "Desconocido"}
              </p>
            </div>

            <div className="legal-warning bg-yellow-50 p-3 rounded-lg mb-4 text-sm">
              <p className="font-semibold text-yellow-800 mb-1">Advertencia Legal:</p>
              <p>
                La manipulación de registros de jornada laboral puede constituir una infracción grave según la
                legislación laboral española. Los registros de jornada son documentos legales que deben mantenerse
                íntegros durante al menos 4 años.
              </p>
            </div>
          </div>

          <div className="warning-actions flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={() => handleReportIssue(selectedRecord)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              disabled={isReporting}
            >
              {isReporting ? "Enviando reporte..." : "Reportar problema"}
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="integrity-checker">
      <div className="checker-header flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Verificación de Integridad</h3>
        <button
          onClick={() => handleCheckIntegrity(false)}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          disabled={isChecking}
        >
          {isChecking ? "Verificando..." : "Verificar ahora"}
        </button>
      </div>

      {lastCheckResult && (
        <div className="checker-results">
          <div
            className={`result-summary p-3 rounded-lg mb-4 ${lastCheckResult.isValid ? "bg-green-50" : "bg-red-50"}`}
          >
            <p className="font-medium">
              {lastCheckResult.isValid
                ? `✅ Todos los registros son válidos (${lastCheckResult.validRecords} verificados)`
                : `⚠️ Se encontraron ${lastCheckResult.tamperedRecords.length} registros con problemas de integridad`}
            </p>
            <p className="text-sm text-gray-600 mt-1">Última verificación: {new Date().toLocaleString()}</p>
          </div>

          {!lastCheckResult.isValid && lastCheckResult.tamperedRecords.length > 0 && (
            <div className="tampered-records">
              <h4 className="font-medium mb-2">Registros con problemas:</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Usuario</th>
                      <th className="p-2 text-left">Puesto</th>
                      <th className="p-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastCheckResult.tamperedRecords.map((record) => (
                      <tr key={record.id} className="border-b">
                        <td className="p-2">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="p-2">{record.userName}</td>
                        <td className="p-2">{record.positionName}</td>
                        <td className="p-2">
                          <button
                            onClick={() => handleShowDetails(record)}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs mr-2"
                          >
                            Detalles
                          </button>
                          {user && user.role === "admin" && (
                            <button
                              onClick={() => handleRepairRecord(record.id)}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                            >
                              Reparar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de advertencia de integridad (integrado) */}
      <IntegrityWarningModal />
    </div>
  )
}

export default IntegrityChecker
