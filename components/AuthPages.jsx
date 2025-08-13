"use client"

import { useState } from "react"
import LoginForm from "./auth/LoginForm"
import RegisterForm from "./auth/RegisterForm"
import { useAuth } from "../contexts/AuthContext"
import { useEnvironment } from "../contexts/EnvironmentContext"
import EnvironmentBadge from "./ui/EnvironmentBadge"

function AuthPages() {
  const [activeTab, setActiveTab] = useState("login")
  const { login } = useAuth()
  const { isDemoMode } = useEnvironment()

  // Función para manejar el inicio de sesión
  const handleLogin = (formData) => {
    // En un caso real, aquí se verificarían las credenciales
    // Para este ejemplo, simplemente simulamos un inicio de sesión exitoso
    login({
      id: "user1",
      name: "Usuario Demo",
      email: formData.email,
      role: formData.email.includes("admin") ? "admin" : formData.email.includes("employer") ? "employer" : "worker",
    })
  }

  // Función para manejar el registro
  const handleRegister = (userData) => {
    // En un caso real, aquí se registraría al usuario en la base de datos
    // Para este ejemplo, simplemente iniciamos sesión con el nuevo usuario
    login(userData)
  }

  return (
    <div className="auth-pages">
      <div className="absolute top-2 right-2">
        <EnvironmentBadge />
      </div>

      {isDemoMode && (
        <div className="demo-mode-banner bg-blue-100 text-blue-800 p-2 text-center text-sm mb-4">
          Modo DEMO: Usa los botones de acceso rápido para probar diferentes roles
        </div>
      )}

      <div className="auth-tabs">
        <button className={`auth-tab ${activeTab === "login" ? "active" : ""}`} onClick={() => setActiveTab("login")}>
          Iniciar Sesión
        </button>
        <button
          className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
          onClick={() => setActiveTab("register")}
        >
          Registrarse
        </button>
      </div>

      <div className="auth-content">
        {activeTab === "login" ? <LoginForm onLogin={handleLogin} /> : <RegisterForm onLogin={handleRegister} />}
      </div>
    </div>
  )
}

export default AuthPages
