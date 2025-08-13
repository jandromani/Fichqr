"use client"

import AuthForm from "./AuthForm"

function RegisterForm({ onLogin }) {
  // Definir campos del formulario
  const fields = [
    {
      name: "name",
      label: "Nombre completo",
      type: "text",
      required: true,
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      required: true,
    },
    {
      name: "password",
      label: "Contraseña",
      type: "password",
      required: true,
    },
    {
      name: "confirmPassword",
      label: "Confirmar contraseña",
      type: "password",
      required: true,
    },
  ]

  // Función para manejar el envío del formulario
  const handleSubmit = (formData) => {
    // Verificar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden")
      return
    }

    // Crear usuario con rol "worker" por defecto
    const newUser = {
      id: `user_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      role: "worker",
      companyId: "company1", // Valor por defecto
    }

    // Llamar a la función de login con el nuevo usuario
    onLogin(newUser)
  }

  return <AuthForm title="Registro" onSubmit={handleSubmit} fields={fields} submitText="Registrarse" />
}

export default RegisterForm
