"use client"

import { useState } from "react"

function AuthForm({ title, onSubmit, fields, submitText, extraContent }) {
  const [formValues, setFormValues] = useState({})
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
    // Limpiar error cuando el usuario comienza a escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    let isValid = true

    fields.forEach((field) => {
      if (field.required && !formValues[field.name]) {
        newErrors[field.name] = `${field.label} es requerido`
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formValues)
    }
  }

  // Función para actualizar valores del formulario (expuesta para componentes externos)
  const updateFormValues = (newValues) => {
    setFormValues((prev) => ({ ...prev, ...newValues }))
  }

  return (
    <div className="auth-form-container max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="auth-header bg-primary-gradient p-4 text-center">
        <h1 className="text-xl font-bold text-white">Sistema de Fichaje QR</h1>
        <p className="text-sm text-white/80">Gestión de presencia laboral</p>
      </div>

      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="form-group">
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <div className="relative">
                {field.icon && (
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {field.icon}
                  </div>
                )}
                <input
                  type={field.type}
                  id={field.name}
                  name={field.name}
                  value={formValues[field.name] || ""}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 ${field.icon ? "pl-10" : ""} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors[field.name] ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={field.placeholder}
                />
              </div>
              {errors[field.name] && <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>}
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {submitText}
          </button>
        </form>

        {extraContent && <div className="mt-6 border-t pt-6">{extraContent(updateFormValues)}</div>}
      </div>
    </div>
  )
}

export default AuthForm
