"use client"

/**
 * Componente para generar códigos QR mejorados con opciones avanzadas
 * Permite personalizar el QR, añadir información embebida y optimizar para diferentes entornos
 */

import { useState, useEffect, useRef } from "react"
import { qrGenerationService } from "../../services/qrGenerationService"
import { qrTemplateService } from "../../services/qrTemplateService"
import Tooltip from "../ui/Tooltip"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

const EnhancedQRGenerator = ({ position, onQRGenerated }) => {
  // Estado para el QR generado
  const [qrDataUrl, setQrDataUrl] = useState("")

  // Estado para las opciones de configuración
  const [qrOptions, setQrOptions] = useState(qrGenerationService.QR_TEMPLATES.STANDARD)

  // Estado para las plantillas disponibles
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState("default")

  // Estado para personalización
  const [customization, setCustomization] = useState({
    colorFilter: "#000000",
    overlay: null,
    instructions: {
      title: "Escanee para fichar",
      text: "Utilice la cámara de su smartphone",
    },
  })

  // Estado para mostrar opciones avanzadas
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Estado para la generación de PDF
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  // Referencia al elemento QR para exportación
  const qrRef = useRef(null)

  // Cargar plantillas al montar el componente
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const availableTemplates = qrTemplateService.getAllTemplates()
        setTemplates(availableTemplates)
      } catch (error) {
        console.error("Error al cargar plantillas:", error)
      }
    }

    loadTemplates()
  }, [])

  // Generar QR cuando cambian las opciones o la posición
  useEffect(() => {
    const generateQR = async () => {
      if (!position) return

      try {
        // Generar QR base
        const qrUrl = await qrGenerationService.generatePositionQR(position, qrOptions)

        // Aplicar plantilla si está seleccionada
        if (selectedTemplate) {
          const template = templates.find((t) => t.id === selectedTemplate)
          if (template) {
            const customizedQR = await qrTemplateService.applyTemplate(qrUrl, template)
            setQrDataUrl(customizedQR)

            // Notificar al componente padre si es necesario
            if (onQRGenerated) {
              onQRGenerated(customizedQR)
            }
            return
          }
        }

        // Si no hay plantilla, usar el QR base
        setQrDataUrl(qrUrl)

        // Notificar al componente padre si es necesario
        if (onQRGenerated) {
          onQRGenerated(qrUrl)
        }
      } catch (error) {
        console.error("Error al generar QR:", error)
      }
    }

    generateQR()
  }, [position, qrOptions, selectedTemplate, templates, onQRGenerated])

  // Función para cambiar la plantilla
  const handleTemplateChange = (e) => {
    setSelectedTemplate(e.target.value)
  }

  // Función para cambiar las opciones de QR
  const handleOptionChange = (optionType) => {
    setQrOptions(qrGenerationService.QR_TEMPLATES[optionType])
  }

  // Función para cambiar el color del QR
  const handleColorChange = (e) => {
    setCustomization({
      ...customization,
      colorFilter: e.target.value,
    })
  }

  // Función para actualizar las instrucciones
  const handleInstructionChange = (field, value) => {
    setCustomization({
      ...customization,
      instructions: {
        ...customization.instructions,
        [field]: value,
      },
    })
  }

  // Función para generar y descargar el QR como PDF
  const handleDownloadQR = async () => {
    if (!qrRef.current) return

    try {
      setIsGeneratingPDF(true)

      // Convertir el elemento QR a un canvas usando html2canvas
      const canvas = await html2canvas(qrRef.current, {
        scale: 3, // Mayor escala para mejor calidad
        backgroundColor: "#ffffff",
      })

      // Convertir el canvas a una imagen en formato base64
      const imgData = canvas.toDataURL("image/png")

      // Crear un nuevo documento PDF (A4 por defecto)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
      })

      // Configurar el tamaño de página y márgenes
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20 // margen en mm

      // Añadir el título (nombre del puesto)
      pdf.setFontSize(24)
      pdf.setTextColor(0, 102, 204) // Color azul similar al de la aplicación
      const title = `Puesto: ${position.name}`
      pdf.text(title, pageWidth / 2, margin + 10, { align: "center" })

      // Añadir la ubicación si existe
      if (position.location) {
        pdf.setFontSize(16)
        pdf.setTextColor(51, 51, 51) // Color gris oscuro
        pdf.text(`Ubicación: ${position.location}`, pageWidth / 2, margin + 20, { align: "center" })
      }

      // Añadir el modo de trabajo
      pdf.setFontSize(16)
      pdf.setTextColor(51, 51, 51)
      const modeText =
        position.mode === "remote" ? "Teletrabajo" : position.mode === "hybrid" ? "Híbrido" : "Presencial"
      pdf.text(`Modo: ${modeText}`, pageWidth / 2, margin + (position.location ? 30 : 20), { align: "center" })

      // Calcular el tamaño del QR (queremos que sea grande pero que quepa en la página)
      const qrSize = Math.min(pageWidth - 2 * margin, 150) // máximo 150mm o el ancho disponible

      // Calcular la posición para centrar el QR
      const qrX = (pageWidth - qrSize) / 2
      const qrY = margin + (position.location ? 40 : 30) // Dejamos espacio para el título, ubicación y modo

      // Añadir la imagen del QR al PDF
      pdf.addImage(imgData, "PNG", qrX, qrY, qrSize, qrSize)

      // Añadir las instrucciones personalizadas
      pdf.setFontSize(14)
      pdf.setTextColor(0, 0, 0)
      pdf.text(customization.instructions.title || "Instrucciones de Uso", pageWidth / 2, qrY + qrSize + 15, {
        align: "center",
      })

      pdf.setFontSize(12)
      pdf.text(
        customization.instructions.text || "Escanee este código con la cámara de su smartphone",
        pageWidth / 2,
        qrY + qrSize + 25,
        { align: "center" },
      )

      // Añadir un pie de página con la fecha de generación
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      const today = new Date().toLocaleDateString()
      pdf.text(`Generado el ${today}`, pageWidth / 2, pageHeight - 10, { align: "center" })

      // Guardar el PDF con un nombre que incluye el nombre del puesto
      const fileName = `QR_${position.name.replace(/\s+/g, "_")}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      alert("Hubo un error al generar el PDF. Por favor, inténtelo de nuevo.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Renderizar componente
  return (
    <div className="enhanced-qr-generator">
      <div className="qr-preview-container">
        <div className="qr-preview" ref={qrRef}>
          {qrDataUrl ? (
            <img src={qrDataUrl || "/placeholder.svg"} alt="Código QR" className="qr-image" />
          ) : (
            <div className="qr-loading">Generando QR...</div>
          )}
        </div>

        <div className="qr-actions">
          <button onClick={handleDownloadQR} className="action-btn primary" disabled={!qrDataUrl || isGeneratingPDF}>
            {isGeneratingPDF ? "Generando PDF..." : "Descargar PDF"}
          </button>
        </div>
      </div>

      <div className="qr-options">
        <div className="option-group">
          <label htmlFor="template-select">
            Plantilla:
            <Tooltip content="Seleccione una plantilla predefinida para el QR">
              <span className="help-icon ml-1">?</span>
            </Tooltip>
          </label>
          <select
            id="template-select"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            className="select-input"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div className="toggle-advanced">
          <button onClick={() => setShowAdvancedOptions(!showAdvancedOptions)} className="text-btn">
            {showAdvancedOptions ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
          </button>
        </div>

        {showAdvancedOptions && (
          <div className="advanced-options">
            <div className="option-group">
              <label>
                Tipo de QR:
                <Tooltip content="Seleccione el tipo de QR según el entorno donde se utilizará">
                  <span className="help-icon ml-1">?</span>
                </Tooltip>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="qr-type"
                    checked={qrOptions.type === "standard"}
                    onChange={() => handleOptionChange("STANDARD")}
                  />
                  Estándar
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="qr-type"
                    checked={qrOptions.type === "high_density"}
                    onChange={() => handleOptionChange("HIGH_DENSITY")}
                  />
                  Alta Densidad
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="qr-type"
                    checked={qrOptions.type === "print_optimized"}
                    onChange={() => handleOptionChange("PRINT_OPTIMIZED")}
                  />
                  Optimizado para Impresión
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="qr-type"
                    checked={qrOptions.type === "outdoor"}
                    onChange={() => handleOptionChange("OUTDOOR")}
                  />
                  Exteriores
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="qr-type"
                    checked={qrOptions.type === "factory"}
                    onChange={() => handleOptionChange("FACTORY")}
                  />
                  Entorno Industrial
                </label>
              </div>
            </div>

            <div className="option-group">
              <label htmlFor="qr-color">
                Color del QR:
                <Tooltip content="Personalice el color del código QR">
                  <span className="help-icon ml-1">?</span>
                </Tooltip>
              </label>
              <input
                type="color"
                id="qr-color"
                value={customization.colorFilter}
                onChange={handleColorChange}
                className="color-input"
              />
            </div>

            <div className="option-group">
              <label htmlFor="instruction-title">Título de instrucciones:</label>
              <input
                type="text"
                id="instruction-title"
                value={customization.instructions.title}
                onChange={(e) => handleInstructionChange("title", e.target.value)}
                className="text-input"
                placeholder="Escanee para fichar"
              />
            </div>

            <div className="option-group">
              <label htmlFor="instruction-text">Texto de instrucciones:</label>
              <input
                type="text"
                id="instruction-text"
                value={customization.instructions.text}
                onChange={(e) => handleInstructionChange("text", e.target.value)}
                className="text-input"
                placeholder="Utilice la cámara de su smartphone"
              />
            </div>
          </div>
        )}
      </div>

      <div className="qr-info">
        <h4>Información del QR</h4>
        <p>
          <strong>Tipo:</strong> {qrOptions.name}
        </p>
        <p>
          <strong>Corrección de errores:</strong>{" "}
          {qrOptions.errorCorrectionLevel === "L"
            ? "Baja (7%)"
            : qrOptions.errorCorrectionLevel === "M"
              ? "Media (15%)"
              : qrOptions.errorCorrectionLevel === "Q"
                ? "Alta (25%)"
                : "Máxima (30%)"}
        </p>
        <p>
          <strong>Optimizado para:</strong>{" "}
          {qrOptions.type === "high_density"
            ? "Máxima información"
            : qrOptions.type === "print_optimized"
              ? "Impresión en papel"
              : qrOptions.type === "outdoor"
                ? "Uso en exteriores"
                : qrOptions.type === "factory"
                  ? "Entornos industriales"
                  : "Uso general"}
        </p>
      </div>
    </div>
  )
}

export default EnhancedQRGenerator
