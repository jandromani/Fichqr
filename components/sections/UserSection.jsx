"use client"

import { useState } from "react"
import { useToast } from "../../contexts/ToastContext"
import Modal from "../ui/Modal"
import { useAuth } from "../../contexts/AuthContext"
import { sanitizeInput, validateEmail, validatePhone } from "../../utils/securityUtils"
// Añadir la importación del nuevo componente al principio del archivo
import UserExportTool from "../UserExportTool"

function UserSection({ user }) {
  // Usar el contexto de toast para notificaciones
  const toast = useToast()

  // Usar el contexto de autenticación para actualizar el usuario
  const { login } = useAuth()

  // Estado para los modales
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)

  // Estado para el formulario de edición de perfil
  const [profileForm, setProfileForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    position: user.position || "",
    department: user.department || "",
  })

  // Estado para el formulario de cambio de contraseña
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Estado para los errores de validación
  const [profileErrors, setProfileErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState({})

  // Estado para controlar si se está enviando el formulario
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Función para validar el formulario de perfil
  const validateProfileForm = () => {
    const errors = {}

    // Validar nombre
    if (!profileForm.name.trim()) {
      errors.name = "El nombre es obligatorio"
    }

    // Validar email
    if (!profileForm.email.trim()) {
      errors.email = "El email es obligatorio"
    } else if (!validateEmail(profileForm.email)) {
      errors.email = "El email no es válido"
    }

    // Validar teléfono (opcional)
    if (profileForm.phone && !validatePhone(profileForm.phone)) {
      errors.phone = "El teléfono debe tener 9 dígitos"
    }

    setProfileErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Función para validar el formulario de cambio de contraseña
  const validatePasswordForm = () => {
    const errors = {}

    // Validar contraseña actual
    if (!passwordForm.currentPassword) {
      errors.currentPassword = "La contraseña actual es obligatoria"
    }

    // Validar nueva contraseña
    if (!passwordForm.newPassword) {
      errors.newPassword = "La nueva contraseña es obligatoria"
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = "La contraseña debe tener al menos 8 caracteres"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      errors.newPassword = "La contraseña debe contener al menos una letra minúscula, una mayúscula y un número"
    }

    // Validar confirmación de contraseña
    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Debes confirmar la nueva contraseña"
    } else if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden"
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Función para manejar el envío del formulario de perfil
  const handleSubmitProfile = (e) => {
    e.preventDefault()

    // Validar el formulario
    if (!validateProfileForm()) {
      return
    }

    // Simular envío
    setIsSubmitting(true)

    try {
      // Sanitizar los datos del formulario
      const sanitizedName = sanitizeInput(profileForm.name)
      const sanitizedEmail = sanitizeInput(profileForm.email)
      const sanitizedPhone = sanitizeInput(profileForm.phone)
      const sanitizedPosition = sanitizeInput(profileForm.position)
      const sanitizedDepartment = sanitizeInput(profileForm.department)

      // Obtener el usuario actual de localStorage
      const savedUserJSON = localStorage.getItem("ficharQR_user")
      if (!savedUserJSON) {
        throw new Error("No se encontró información del usuario")
      }

      const savedUser = JSON.parse(savedUserJSON)

      // Actualizar los datos del usuario
      const updatedUser = {
        ...savedUser,
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        position: sanitizedPosition,
        department: sanitizedDepartment,
      }

      // Guardar en localStorage
      localStorage.setItem("ficharQR_user", JSON.stringify(updatedUser))

      // Actualizar el estado global del usuario usando el contexto de autenticación
      login(updatedUser)

      // Mostrar notificación de éxito
      toast.showSuccess("Perfil actualizado correctamente")

      // Cerrar el modal
      setShowEditProfileModal(false)
    } catch (error) {
      console.error("Error al actualizar el perfil:", error)
      toast.showError("Error al actualizar el perfil: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para manejar el envío del formulario de cambio de contraseña
  const handleSubmitPassword = (e) => {
    e.preventDefault()

    // Validar el formulario
    if (!validatePasswordForm()) {
      return
    }

    // Simular envío
    setIsSubmitting(true)

    try {
      // En una implementación real, aquí verificaríamos la contraseña actual
      // y actualizaríamos la contraseña en la base de datos

      // Para esta simulación, simplemente verificamos que la contraseña actual coincida
      // con la almacenada (si existe)
      const savedUserJSON = localStorage.getItem("ficharQR_user")
      if (savedUserJSON) {
        const savedUser = JSON.parse(savedUserJSON)

        // Si el usuario tiene una contraseña almacenada y no coincide con la actual
        if (savedUser.password && savedUser.password !== passwordForm.currentPassword) {
          setPasswordErrors({
            currentPassword: "La contraseña actual es incorrecta",
          })
          setIsSubmitting(false)
          return
        }

        // Actualizar la contraseña
        const updatedUser = {
          ...savedUser,
          password: passwordForm.newPassword,
        }

        // Guardar en localStorage
        localStorage.setItem("ficharQR_user", JSON.stringify(updatedUser))
      }

      // Mostrar notificación de éxito
      toast.showSuccess("Contraseña actualizada correctamente")

      // Cerrar el modal
      setShowChangePasswordModal(false)

      // Limpiar el formulario
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Error al cambiar la contraseña:", error)
      toast.showError("Error al cambiar la contraseña: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para mostrar la fortaleza de la contraseña
  const getPasswordStrength = (password) => {
    if (!password) return { text: "Sin contraseña", color: "bg-gray-200", percentage: 0 }

    let strength = 0
    let feedback = ""

    // Criterios de fortaleza
    if (password.length >= 8) strength += 25
    if (/[a-z]/.test(password)) strength += 15
    if (/[A-Z]/.test(password)) strength += 15
    if (/\d/.test(password)) strength += 15
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15
    if (password.length >= 12) strength += 15

    // Limitar a 100%
    strength = Math.min(strength, 100)

    // Determinar el color y el texto según la fortaleza
    let color
    if (strength < 30) {
      color = "bg-red-500"
      feedback = "Muy débil"
    } else if (strength < 60) {
      color = "bg-yellow-500"
      feedback = "Débil"
    } else if (strength < 80) {
      color = "bg-blue-500"
      feedback = "Buena"
    } else {
      color = "bg-green-500"
      feedback = "Fuerte"
    }

    return { text: feedback, color, percentage: strength }
  }

  // Calcular la fortaleza de la contraseña
  const passwordStrength = getPasswordStrength(passwordForm.newPassword)

  return (
    <div className="section">
      <h2>Perfil de Usuario</h2>

      <div className="user-profile">
        <div className="profile-header mb-6">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar || "/placeholder.svg"} alt={user.name} className="avatar-image" />
            ) : (
              <div className="avatar-placeholder">{user.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
            )}
          </div>
          <div className="profile-info">
            <h3 className="profile-name">{user.name}</h3>
            <p className="profile-role">{user.role === "employer" ? "Empleador" : "Trabajador"}</p>
          </div>
        </div>

        <div className="profile-fields">
          <div className="profile-field">
            <strong>Nombre:</strong> {user.name}
          </div>
          <div className="profile-field">
            <strong>Email:</strong> {user.email}
          </div>
          <div className="profile-field">
            <strong>Rol:</strong> {user.role === "employer" ? "Empleador" : "Trabajador"}
          </div>
          <div className="profile-field">
            <strong>ID de Empresa:</strong> {user.companyId}
          </div>
          {user.phone && (
            <div className="profile-field">
              <strong>Teléfono:</strong> {user.phone}
            </div>
          )}
          {user.position && (
            <div className="profile-field">
              <strong>Puesto:</strong> {user.position}
            </div>
          )}
          {user.department && (
            <div className="profile-field">
              <strong>Departamento:</strong> {user.department}
            </div>
          )}
        </div>
      </div>

      <div className="section-actions">
        <button className="action-btn" onClick={() => setShowEditProfileModal(true)}>
          Editar Perfil
        </button>
        <button className="action-btn" onClick={() => setShowChangePasswordModal(true)}>
          Cambiar Contraseña
        </button>
      </div>

      {/* Herramienta de exportación de fichajes personales */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <UserExportTool user={user} />
      </div>

      {/* Modal de edición de perfil */}
      <Modal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} title="Editar Perfil">
        <form onSubmit={handleSubmitProfile} className="profile-form">
          <div className="form-group">
            <label htmlFor="profile-name">
              Nombre: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="profile-name"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className={`form-input ${profileErrors.name ? "border-red-500" : ""}`}
            />
            {profileErrors.name && <p className="form-error">{profileErrors.name}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="profile-email">
              Email: <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="profile-email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className={`form-input ${profileErrors.email ? "border-red-500" : ""}`}
            />
            {profileErrors.email && <p className="form-error">{profileErrors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="profile-phone">Teléfono:</label>
            <input
              type="tel"
              id="profile-phone"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              className={`form-input ${profileErrors.phone ? "border-red-500" : ""}`}
              placeholder="Ej: 612345678"
            />
            {profileErrors.phone && <p className="form-error">{profileErrors.phone}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="profile-position">Puesto:</label>
            <input
              type="text"
              id="profile-position"
              value={profileForm.position}
              onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
              className="form-input"
              placeholder="Ej: Desarrollador"
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-department">Departamento:</label>
            <input
              type="text"
              id="profile-department"
              value={profileForm.department}
              onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
              className="form-input"
              placeholder="Ej: Tecnología"
            />
          </div>

          <div className="form-note">
            <p>
              <span className="text-red-500">*</span> Campos obligatorios
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="action-btn" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button
              type="button"
              className="action-btn secondary"
              onClick={() => setShowEditProfileModal(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de cambio de contraseña */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title="Cambiar Contraseña"
      >
        <form onSubmit={handleSubmitPassword} className="password-form">
          <div className="form-group">
            <label htmlFor="current-password">
              Contraseña actual: <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="current-password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className={`form-input ${passwordErrors.currentPassword ? "border-red-500" : ""}`}
            />
            {passwordErrors.currentPassword && <p className="form-error">{passwordErrors.currentPassword}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="new-password">
              Nueva contraseña: <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="new-password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className={`form-input ${passwordErrors.newPassword ? "border-red-500" : ""}`}
            />
            {passwordErrors.newPassword && <p className="form-error">{passwordErrors.newPassword}</p>}

            {/* Indicador de fortaleza de contraseña */}
            {passwordForm.newPassword && (
              <div className="password-strength mt-2">
                <div className="password-strength-bar">
                  <div
                    className={`password-strength-progress ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  ></div>
                </div>
                <p className="password-strength-text text-xs mt-1">
                  Fortaleza: <span className="font-medium">{passwordStrength.text}</span>
                </p>
              </div>
            )}

            <div className="password-requirements text-xs text-gray-500 mt-2">
              <p>La contraseña debe:</p>
              <ul className="list-disc ml-5">
                <li
                  className={passwordForm.newPassword && passwordForm.newPassword.length >= 8 ? "text-green-500" : ""}
                >
                  Tener al menos 8 caracteres
                </li>
                <li
                  className={passwordForm.newPassword && /[a-z]/.test(passwordForm.newPassword) ? "text-green-500" : ""}
                >
                  Incluir al menos una letra minúscula
                </li>
                <li
                  className={passwordForm.newPassword && /[A-Z]/.test(passwordForm.newPassword) ? "text-green-500" : ""}
                >
                  Incluir al menos una letra mayúscula
                </li>
                <li className={passwordForm.newPassword && /\d/.test(passwordForm.newPassword) ? "text-green-500" : ""}>
                  Incluir al menos un número
                </li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">
              Confirmar contraseña: <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="confirm-password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className={`form-input ${passwordErrors.confirmPassword ? "border-red-500" : ""}`}
            />
            {passwordErrors.confirmPassword && <p className="form-error">{passwordErrors.confirmPassword}</p>}
          </div>

          <div className="form-note">
            <p>
              <span className="text-red-500">*</span> Campos obligatorios
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="action-btn" disabled={isSubmitting}>
              {isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
            <button
              type="button"
              className="action-btn secondary"
              onClick={() => setShowChangePasswordModal(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default UserSection
