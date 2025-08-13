"use client"

import { useState, useRef } from "react"
import { useToast } from "../contexts/ToastContext"
import { exportBackup, importBackup } from "../services/backupService"
import Modal from "./ui/Modal"

function BackupManager({ user }) {
  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Estado para controlar la carga
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Estado para el modal de confirmación de importación
  const [showImportConfirmation, setShowImportConfirmation] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  // Estado para el modal de resultado de importación
  const [showImportResult, setShowImportResult] = useState(false)
  const [importResult, setImportResult] = useState(null)

  // Referencia al input de archivo
  const fileInputRef = useRef(null)

  // Función para manejar la exportación de backup
  const handleExportBackup = async () => {
    try {
      setIsExporting(true)

      // Generar y exportar el backup
      const { url, filename } = exportBackup(user)

      // Crear un enlace para descargar el archivo
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()

      // Limpiar
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.showSuccess("Backup generado correctamente. Guárdalo en un lugar seguro.")
    } catch (error) {
      console.error("Error al exportar backup:", error)
      toast.showError("Error al generar el backup: " + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  // Función para abrir el selector de archivos
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Función para manejar la selección de archivo
  const handleFileSelected = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setShowImportConfirmation(true)
    }
  }

  // Función para manejar la importación de backup
  const handleImportBackup = async () => {
    if (!selectedFile) return

    try {
      setIsImporting(true)
      setShowImportConfirmation(false)

      // Importar el backup
      const result = await importBackup(selectedFile)

      // Mostrar resultado
      setImportResult(result)
      setShowImportResult(true)

      toast.showSuccess("Backup importado correctamente")
    } catch (error) {
      console.error("Error al importar backup:", error)
      toast.showError("Error al importar el backup: " + error.message)
    } finally {
      setIsImporting(false)
      // Limpiar el input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Función para cancelar la importación
  const handleCancelImport = () => {
    setShowImportConfirmation(false)
    setSelectedFile(null)
    // Limpiar el input de archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="backup-manager">
      <div className="backup-actions">
        <button onClick={handleExportBackup} className="action-btn export-backup-btn" disabled={isExporting}>
          {isExporting ? (
            <>
              <span className="loading-spinner"></span>
              <span>Generando backup...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Descargar backup legal</span>
            </>
          )}
        </button>

        <button onClick={handleSelectFile} className="action-btn import-backup-btn" disabled={isImporting}>
          {isImporting ? (
            <>
              <span className="loading-spinner"></span>
              <span>Importando backup...</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Importar backup</span>
            </>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept=".json"
          style={{ display: "none" }}
        />
      </div>

      <div className="backup-info mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Información sobre backups</h3>
        <p className="mb-2">
          La legislación española exige conservar los registros de jornada durante 4 años. Es importante realizar
          backups periódicos y guardarlos en un lugar seguro.
        </p>
        <ul className="list-disc pl-5 mb-2">
          <li>Realiza backups al menos una vez al mes</li>
          <li>Guarda los archivos en múltiples ubicaciones (disco duro, nube, etc.)</li>
          <li>Etiqueta los archivos con fechas para facilitar su identificación</li>
          <li>Verifica periódicamente que los backups se pueden restaurar correctamente</li>
        </ul>
        <p className="text-sm text-gray-600">
          Nota: Los backups están firmados digitalmente para garantizar su integridad y evitar manipulaciones.
        </p>
      </div>

      {/* Modal de confirmación de importación */}
      <Modal isOpen={showImportConfirmation} onClose={handleCancelImport} title="Confirmar importación">
        <div className="import-confirmation">
          <div className="import-warning-icon mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-yellow-500 mx-auto"
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

          <p className="mb-4 text-center">
            ¿Estás seguro de que deseas importar el backup? Esta acción reemplazará todos los datos actuales.
          </p>

          <div className="file-info p-3 bg-gray-50 rounded-lg mb-4">
            <p>
              <strong>Archivo:</strong> {selectedFile?.name}
            </p>
            <p>
              <strong>Tamaño:</strong> {(selectedFile?.size / 1024).toFixed(2)} KB
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={handleImportBackup} className="action-btn">
              Importar
            </button>
            <button onClick={handleCancelImport} className="action-btn secondary">
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de resultado de importación */}
      <Modal isOpen={showImportResult} onClose={() => setShowImportResult(false)} title="Importación completada">
        <div className="import-result">
          <div className="import-success-icon mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-green-500 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <p className="mb-4 text-center">{importResult?.message || "Backup importado correctamente"}</p>

          {importResult?.metadata && (
            <div className="import-metadata p-3 bg-gray-50 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">Información del backup:</h4>
              <p>
                <strong>Versión:</strong> {importResult.metadata.version}
              </p>
              <p>
                <strong>Fecha de generación:</strong> {new Date(importResult.metadata.timestamp).toLocaleString()}
              </p>
              {importResult.metadata.generatedBy && typeof importResult.metadata.generatedBy === "object" && (
                <p>
                  <strong>Generado por:</strong> {importResult.metadata.generatedBy.name} (
                  {importResult.metadata.generatedBy.role})
                </p>
              )}
            </div>
          )}

          <div className="flex justify-center">
            <button onClick={() => setShowImportResult(false)} className="action-btn">
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default BackupManager
