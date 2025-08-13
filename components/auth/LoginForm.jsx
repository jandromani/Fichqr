"use client"

import { useRef } from "react"
import { useTranslation } from "react-i18next"
import AuthForm from "./AuthForm"
import EnvironmentSelector from "../setup/EnvironmentSelector"
import { useEnvironment } from "../../contexts/EnvironmentContext"
import { UserCircle, Building2, Briefcase, Lock } from "lucide-react"
import LanguageSelector from "../LanguageSelector"

function LoginForm({ onLogin }) {
  // Referencia para acceder a los métodos del formulario
  const formRef = useRef(null)
  const { currentMode, changeMode } = useEnvironment()
  const { t } = useTranslation()

  // Usuarios predeterminados si no se proporcionan
  const defaultUsers = [
    {
      role: "admin",
      email: "admin@example.com",
      password: "admin123",
    },
    {
      role: "employer",
      email: "employer@example.com",
      password: "employer123",
    },
    {
      role: "worker",
      email: "worker@example.com",
      password: "worker123",
    },
  ]

  // Función para manejar el envío del formulario
  const handleSubmit = (formData) => {
    if (typeof onLogin === "function") {
      onLogin(formData)
    } else {
      console.error("onLogin no es una función")
    }
  }

  // Definir campos del formulario
  const fields = [
    {
      name: "email",
      label: t("auth.email", "Email"),
      type: "email",
      required: true,
      placeholder: t("auth.email", "Ingrese su email"),
      icon: <UserCircle size={18} className="text-gray-500" />,
    },
    {
      name: "password",
      label: t("auth.password", "Contraseña"),
      type: "password",
      required: true,
      placeholder: t("auth.password", "Ingrese su contraseña"),
      icon: <Lock size={18} className="text-gray-500" />,
    },
  ]

  // Función para autocompletar credenciales
  const fillCredentials = (userType) => {
    if (!defaultUsers || !Array.isArray(defaultUsers)) return

    const user = defaultUsers.find((u) => u.role === userType)
    if (user && formRef.current) {
      // Actualizar los valores del formulario usando la función expuesta
      formRef.current({
        email: user.email,
        password: user.password,
      })

      // Enviar el formulario automáticamente después de rellenar las credenciales
      if (typeof onLogin === "function") {
        onLogin({
          email: user.email,
          password: user.password,
        })
      }
    }
  }

  // Contenido extra para el formulario (botones de acceso rápido)
  const extraContent = (updateFormValues) => {
    // Guardar la referencia a la función de actualización
    formRef.current = updateFormValues

    return (
      <div className="quick-login">
        <div className="flex justify-between items-center mb-3">
          <p className="text-center font-medium text-gray-700">{t("auth.quickAccess", "Acceso rápido")}</p>
          <LanguageSelector variant="icons" size="sm" />
        </div>

        <div className="quick-login-buttons grid grid-cols-3 gap-3 mb-4">
          <button
            type="button"
            onClick={() => fillCredentials("admin")}
            className="quick-login-btn flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <UserCircle size={24} className="text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-700">{t("auth.admin", "Admin")}</span>
          </button>
          <button
            type="button"
            onClick={() => fillCredentials("employer")}
            className="quick-login-btn flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <Building2 size={24} className="text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-700">{t("auth.employer", "Empleador")}</span>
          </button>
          <button
            type="button"
            onClick={() => fillCredentials("worker")}
            className="quick-login-btn flex flex-col items-center justify-center p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
          >
            <Briefcase size={24} className="text-amber-600 mb-2" />
            <span className="text-sm font-medium text-amber-700">{t("auth.worker", "Trabajador")}</span>
          </button>
        </div>
        <div className="mt-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2 font-medium">{t("auth.selectMode", "Seleccionar modo")}:</p>
          <EnvironmentSelector selectedMode={currentMode} onChange={changeMode} />
        </div>
      </div>
    )
  }

  return (
    <AuthForm
      title={t("auth.login", "Iniciar Sesión")}
      onSubmit={handleSubmit}
      fields={fields}
      submitText={t("auth.loginButton", "Iniciar Sesión")}
      extraContent={extraContent}
    />
  )
}

export default LoginForm
