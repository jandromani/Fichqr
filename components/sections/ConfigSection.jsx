"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useToast } from "../../contexts/ToastContext"
import { useLightMode } from "../../contexts/LightModeContext"
import BackupManager from "../BackupManager"
import DeviceCapabilityInfo from "../DeviceCapabilityInfo"
import StorageOptimizer from "../StorageOptimizer"
import LightModeToggle from "../LightModeToggle"
import IntegrityChecker from "../IntegrityChecker"
import RecoveryManager from "../RecoveryManager"
import LanguageSelector from "../LanguageSelector"

function ConfigSection() {
  const toast = useToast()
  const { isLightMode } = useLightMode()
  const [activeTab, setActiveTab] = useState("general")
  const { t } = useTranslation()

  // Función para manejar el cambio de pestaña
  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  return (
    <div className="section">
      <h2>{t("config.title", "Configuración")}</h2>

      {/* Pestañas de configuración */}
      <div className="config-tabs flex border-b mb-4 flex-wrap">
        <button
          className={`py-2 px-4 ${activeTab === "general" ? "border-b-2 border-blue-500 font-medium" : ""}`}
          onClick={() => handleTabChange("general")}
        >
          {t("config.general", "General")}
        </button>
        <button
          className={`py-2 px-4 ${activeTab === "rendimiento" ? "border-b-2 border-blue-500 font-medium" : ""}`}
          onClick={() => handleTabChange("rendimiento")}
        >
          {t("config.performance", "Rendimiento")}
        </button>
        <button
          className={`py-2 px-4 ${activeTab === "datos" ? "border-b-2 border-blue-500 font-medium" : ""}`}
          onClick={() => handleTabChange("datos")}
        >
          {t("config.data", "Datos")}
        </button>
        <button
          className={`py-2 px-4 ${activeTab === "avanzado" ? "border-b-2 border-blue-500 font-medium" : ""}`}
          onClick={() => handleTabChange("avanzado")}
        >
          {t("config.advanced", "Avanzado")}
        </button>
      </div>

      {/* Contenido de la pestaña General */}
      {activeTab === "general" && (
        <div>
          <LightModeToggle />

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">{t("config.language", "Idioma")}</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <LanguageSelector />
              <p className="text-sm text-gray-500 mt-2">
                {t("config.languageDescription", "Selecciona el idioma de la aplicación")}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">{t("config.userPreferences", "Preferencias de Usuario")}</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="mb-4">
                <label className="block mb-2 font-medium">{t("config.theme", "Tema de la aplicación")}</label>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option value="system">{t("config.useSystemTheme", "Usar tema del sistema")}</option>
                  <option value="light">{t("config.lightTheme", "Claro")}</option>
                  <option value="dark">{t("config.darkTheme", "Oscuro")}</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>{t("config.showNotifications", "Mostrar notificaciones de escritorio")}</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>{t("config.clockReminders", "Recordatorios de fichaje")}</span>
                </label>
              </div>
            </div>
          </div>

          <DeviceCapabilityInfo />
        </div>
      )}

      {/* Contenido de la pestaña Rendimiento */}
      {activeTab === "rendimiento" && (
        <div>
          <StorageOptimizer />

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">{t("config.performance", "Opciones de Rendimiento")}</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" checked={isLightMode} disabled />
                  <span>
                    {t("config.lightMode", "Modo ligero")}{" "}
                    {isLightMode ? t("config.enabled", "(Activado)") : t("config.disabled", "(Desactivado)")}
                  </span>
                </label>
                <p className="text-sm text-gray-500 ml-6 mt-1">
                  {t(
                    "config.lightModeDescription",
                    "Reduce animaciones y efectos visuales para mejorar el rendimiento",
                  )}
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>{t("config.lazyLoading", "Carga diferida de componentes")}</span>
                </label>
                <p className="text-sm text-gray-500 ml-6 mt-1">
                  {t("config.lazyLoadingDescription", "Carga componentes solo cuando son necesarios")}
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>{t("config.dataCompression", "Compresión automática de datos")}</span>
                </label>
                <p className="text-sm text-gray-500 ml-6 mt-1">
                  {t("config.dataCompressionDescription", "Comprime datos históricos para ahorrar espacio")}
                </p>
              </div>

              <div>
                <label className="block mb-2 font-medium">
                  {t("config.recordLimit", "Límite de registros a mostrar")}
                </label>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option value="50">50 {t("config.records", "registros")}</option>
                  <option value="100">100 {t("config.records", "registros")}</option>
                  <option value="200">200 {t("config.records", "registros")}</option>
                  <option value="500">500 {t("config.records", "registros")}</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {t(
                    "config.recordLimitDescription",
                    "Un número menor mejora el rendimiento en dispositivos de gama baja",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de la pestaña Datos */}
      {activeTab === "datos" && (
        <div>
          <BackupManager />

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">{t("config.dataManagement", "Gestión de Datos")}</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="mb-4">
                <label className="block mb-2 font-medium">
                  {t("config.dataRetention", "Período de retención de datos")}
                </label>
                <select className="w-full p-2 border border-gray-300 rounded">
                  <option value="180">6 {t("time.months", "meses")}</option>
                  <option value="365">1 {t("time.year", "año")}</option>
                  <option value="730">2 {t("time.years", "años")}</option>
                  <option value="0">{t("config.unlimited", "Sin límite")}</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {t(
                    "config.dataRetentionDescription",
                    "Los datos más antiguos que este período se eliminarán automáticamente",
                  )}
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>{t("config.autoCleanup", "Limpieza automática de datos")}</span>
                </label>
                <p className="text-sm text-gray-500 ml-6 mt-1">
                  {t(
                    "config.autoCleanupDescription",
                    "Elimina automáticamente datos antiguos según el período de retención",
                  )}
                </p>
              </div>

              <div className="mt-6">
                <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                  {t("config.deleteAllData", "Eliminar Todos los Datos")}
                </button>
                <p className="text-sm text-gray-500 mt-1">
                  {t(
                    "config.deleteAllDataWarning",
                    "Esta acción no se puede deshacer. Se eliminarán todos los datos almacenados.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de la pestaña Avanzado */}
      {activeTab === "avanzado" && (
        <div>
          <IntegrityChecker />
          <RecoveryManager />

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">{t("config.advancedOptions", "Opciones Avanzadas")}</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>{t("config.developerMode", "Modo desarrollador")}</span>
                </label>
                <p className="text-sm text-gray-500 ml-6 mt-1">
                  {t("config.developerModeDescription", "Muestra información adicional para depuración")}
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span>{t("config.detailedLogging", "Registro detallado")}</span>
                </label>
                <p className="text-sm text-gray-500 ml-6 mt-1">
                  {t("config.detailedLoggingDescription", "Guarda registros detallados de todas las operaciones")}
                </p>
              </div>

              <div className="mt-6">
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  onClick={() => {
                    localStorage.clear()
                    toast.showSuccess(
                      t("config.localStorageCleared", "Almacenamiento local limpiado. La aplicación se reiniciará."),
                    )
                    setTimeout(() => window.location.reload(), 2000)
                  }}
                >
                  {t("config.resetApp", "Restablecer Aplicación")}
                </button>
                <p className="text-sm text-gray-500 mt-1">
                  {t(
                    "config.resetAppDescription",
                    "Elimina todos los datos y restablece la aplicación a su estado inicial",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfigSection
