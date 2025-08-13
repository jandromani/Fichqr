"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "../../contexts/ToastContext"
import notificationService from "../../services/notificationService"
import Modal from "../../components/ui/Modal"
import ConfirmationModal from "../../components/ui/ConfirmationModal"
import PrivacyPolicyModal from "../../components/ui/PrivacyPolicyModal"
import { sanitizeInput } from "../../utils/securityUtils"
import { clockRecordService, positionService, STORAGE_KEYS } from "../../services/storage"
import {
  hasActiveClockRecord,
  registerActiveClockRecord,
  removeActiveClockRecord,
} from "../../services/clockValidationService"
import { getRemoteWorkInfo } from "../../services/remoteWorkService"

function WorkerClockView({ positionId, positionInfo, user, onLogin }) {
  // Usar el contexto de toast
  const toast = useToast()

  // Estado para controlar si el trabajador ha iniciado sesión
  const [isLoggedIn, setIsLoggedIn] = useState(!!user)

  // Estado para simular si el trabajador ha iniciado o no su jornada
  const [isWorking, setIsWorking] = useState(false)

  // Estado para almacenar el ID del registro de fichaje actual
  const [currentClockRecordId, setCurrentClockRecordId] = useState(null)

  // Estado para almacenar la hora de inicio (para mostrarla)
  const [startTime, setStartTime] = useState(null)

  // Estado para almacenar la ubicación
  const [location, setLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  // Estado para gestionar pausas
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState(null)
  const [pauses, setPauses] = useState([])
  const [totalPauseDuration, setTotalPauseDuration] = useState(0) // En minutos
  const [lastPauseEndTime, setLastPauseEndTime] = useState(0)

  // Estado para validación de empresa
  const [companyValidationError, setCompanyValidationError] = useState(null)

  // Estado para información de teletrabajo
  const [remoteWorkInfo, setRemoteWorkInfo] = useState(null)
  const [isRemotePosition, setIsRemotePosition] = useState(false)

  // Configuración de pausas
  const pauseConfig = useRef({
    maxDailyPauseDuration: 120, // Máximo 2 horas (120 minutos) de pausa al día
    minTimeBetweenPauses: 30, // Mínimo 30 minutos entre pausas
    maxPausesPerDay: 5, // Máximo 5 pausas por día
    maxSinglePauseDuration: 60, // Máximo 60 minutos por pausa individual
  })

  // Estado para validación de pausas
  const [showPauseValidationModal, setShowPauseValidationModal] = useState(false)
  const [pauseValidationMessage, setPauseValidationMessage] = useState("")
  const [pauseValidationType, setPauseValidationType] = useState("warning") // warning, error, info
  const [canOverridePauseValidation, setCanOverridePauseValidation] = useState(false)

  // Estado para el temporizador de recordatorio
  const [reminderTimer, setReminderTimer] = useState(null)

  // Estado para modales
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showInvalidQRModal, setShowInvalidQRModal] = useState(!positionInfo && !!positionId)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false)
  const [showEndWorkConfirmation, setShowEndWorkConfirmation] = useState(false)
  const [showActiveClockModal, setShowActiveClockModal] = useState(false)
  const [activeClockInfo, setActiveClockInfo] = useState(null)

  // Estado para almacenar la función pendiente que requiere geolocalización
  const [pendingGeoFunction, setPendingGeoFunction] = useState(null)

  // Estado para controlar si el usuario ha aceptado la política de privacidad
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false)

  // Efecto para verificar si el QR es válido y cargar información del puesto
  useEffect(() => {
    if (positionId) {
      // Intentar obtener la información del puesto desde localStorage
      const position = positionService.getById(positionId)

      if (position) {
        // Verificar si el puesto pertenece a la misma empresa que el usuario
        if (user && user.companyId && position.companyId && position.companyId !== user.companyId) {
          setCompanyValidationError("Este puesto no pertenece a tu empresa. No puedes fichar aquí.")
        } else {
          positionInfo = position
          setShowInvalidQRModal(false)

          // Verificar si es un puesto de teletrabajo
          setIsRemotePosition(position.mode === "remote" || position.mode === "hybrid")
        }
      } else {
        positionInfo = null
        setShowInvalidQRModal(true)
      }
    }
  }, [positionId, user])

  // Efecto para verificar si el usuario ya tiene un fichaje activo
  useEffect(() => {
    if (user && user.id) {
      // Verificar si hay un fichaje activo usando el servicio de validación
      const activeClockRecord = hasActiveClockRecord(user.id)

      if (activeClockRecord) {
        // Si el fichaje activo es en el mismo puesto, simplemente cargar los datos
        if (activeClockRecord.positionId === positionId) {
          setIsWorking(true)
          setCurrentClockRecordId(activeClockRecord.recordId)
          setStartTime(new Date(activeClockRecord.record.startTime))
          setPauses(activeClockRecord.record.pauses || [])

          // Verificar si hay una pausa activa
          const lastPause =
            activeClockRecord.record.pauses && activeClockRecord.record.pauses.length > 0
              ? activeClockRecord.record.pauses[activeClockRecord.record.pauses.length - 1]
              : null

          if (lastPause && !lastPause.end) {
            setIsPaused(true)
            setPauseStartTime(new Date(lastPause.start))
          }

          // Configurar recordatorio
          setupReminderTimer(new Date(activeClockRecord.record.startTime))
        } else {
          // Si el fichaje activo es en otro puesto, mostrar modal informativo
          setActiveClockInfo(activeClockRecord)
          setShowActiveClockModal(true)
        }
      }
    }
  }, [user, positionId])

  // Efecto para solicitar permiso de notificaciones al cargar
  useEffect(() => {
    // Verificar si el navegador soporta notificaciones
    if (notificationService.isSupported()) {
      // Si ya tenemos permiso, no hacemos nada
      if (notificationService.hasPermission()) {
        console.log("Ya tenemos permiso para mostrar notificaciones")
      } else if (Notification.permission !== "denied") {
        // Si no tenemos permiso pero tampoco ha sido denegado, lo solicitamos automáticamente
        notificationService.requestPermission().then((granted) => {
          if (granted) {
            console.log("Permiso de notificaciones concedido")
          } else {
            console.log("Permiso de notificaciones denegado")
          }
        })
      }
    }

    // Verificar si el usuario ya ha aceptado la política de privacidad
    const policyAccepted = localStorage.getItem(STORAGE_KEYS.PRIVACY_POLICY_ACCEPTED) === "true"
    setPrivacyPolicyAccepted(policyAccepted)
  }, [])

  // Efecto para limpiar el temporizador al desmontar el componente
  useEffect(() => {
    return () => {
      if (reminderTimer) {
        clearInterval(reminderTimer)
      }
    }
  }, [reminderTimer])

  // Efecto para actualizar el total de duración de pausas cuando cambia el array de pausas
  useEffect(() => {
    const totalDuration = pauses.reduce((total, pause) => {
      // Si la pausa tiene end, calculamos su duración
      if (pause.end) {
        return total + (pause.duration || 0)
      }
      // Si la pausa está activa, calculamos la duración hasta ahora
      const now = new Date()
      const pauseStart = new Date(pause.start)
      const currentDuration = Math.round((now - pauseStart) / 60000)
      return total + currentDuration
    }, 0)

    setTotalPauseDuration(totalDuration)

    // Actualizar la hora de finalización de la última pausa si hay pausas finalizadas
    const finishedPauses = pauses.filter((p) => p.end)
    if (finishedPauses.length > 0) {
      setLastPauseEndTime(new Date(finishedPauses[finishedPauses.length - 1].end))
    }
  }, [pauses])

  // Función para manejar la aceptación de la política de privacidad
  const handlePrivacyPolicyAccept = () => {
    setPrivacyPolicyAccepted(true)
    localStorage.setItem(STORAGE_KEYS.PRIVACY_POLICY_ACCEPTED, "true")
    setShowPrivacyPolicyModal(false)

    // Si hay una función pendiente que requiere geolocalización, la ejecutamos
    if (pendingGeoFunction) {
      pendingGeoFunction()
      setPendingGeoFunction(null)
    }
  }

  // Función para manejar el rechazo de la política de privacidad
  const handlePrivacyPolicyDecline = () => {
    setShowPrivacyPolicyModal(false)
    setPendingGeoFunction(null)

    // Mostrar mensaje informativo
    toast.showInfo("No se puede continuar sin aceptar la política de privacidad para la geolocalización")

    // Desactivar el estado de carga si estaba activo
    setIsLoadingLocation(false)
  }

  // Función para obtener la ubicación actual
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      // Si es un puesto remoto, no necesitamos la ubicación exacta
      if (isRemotePosition) {
        resolve(null)
        return
      }

      // Verificar si el usuario ha aceptado la política de privacidad
      if (!privacyPolicyAccepted) {
        // Guardar la función actual para ejecutarla después de aceptar la política
        setPendingGeoFunction(() => () => {
          getCurrentLocation().then(resolve).catch(reject)
        })

        // Mostrar el modal de política de privacidad
        setShowPrivacyPolicyModal(true)
        return
      }

      // Mostrar modal explicativo antes de solicitar la ubicación
      if (!location && !locationError) {
        setShowLocationModal(true)
      }

      setIsLoadingLocation(true)
      setLocationError(null)

      if (!navigator.geolocation) {
        setLocationError("La geolocalización no está soportada por este navegador.")
        setIsLoadingLocation(false)
        setShowLocationModal(false)
        reject("Geolocalización no soportada")
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          }
          setLocation(locationData)
          setIsLoadingLocation(false)
          setShowLocationModal(false)
          resolve(locationData)
        },
        (error) => {
          let errorMessage = "Error desconocido al obtener la ubicación."

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permiso de ubicación denegado. Para fichar, debes permitir el acceso a tu ubicación."
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = "La información de ubicación no está disponible en este momento."
              break
            case error.TIMEOUT:
              errorMessage = "La solicitud de ubicación ha expirado."
              break
          }

          setLocationError(errorMessage)
          setIsLoadingLocation(false)
          setShowLocationModal(false)
          toast.showWarning(errorMessage)
          reject(errorMessage)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    })
  }

  // Función para configurar el temporizador de recordatorio
  const setupReminderTimer = (startTime) => {
    // Limpiar cualquier temporizador existente
    if (reminderTimer) {
      clearInterval(reminderTimer)
    }

    // Configurar un temporizador que verifica cada 5 minutos si el trabajador lleva más de 8 horas trabajando
    const timer = setInterval(
      () => {
        const now = new Date()
        const hoursWorked = (now - startTime) / (1000 * 60 * 60)

        // Si han pasado más de 8 horas y el trabajador sigue fichado
        if (hoursWorked >= 8 && isWorking) {
          // Enviar notificación de recordatorio
          notificationService.showNotification("¡Recordatorio de fichaje!", {
            body: `Hola ${user?.name || "Trabajador"}, llevas más de 8 horas trabajando. ¿Has olvidado fichar tu salida?`,
            tag: "clock-out-reminder",
            requireInteraction: true,
          })

          // Mostrar toast de recordatorio
          toast.showWarning(`Llevas más de 8 horas trabajando. ¿Has olvidado fichar tu salida?`)

          // Registrar la notificación
          const notifications = JSON.parse(localStorage.getItem("notifications") || "[]")
          notifications.push({
            id: `reminder-${Date.now()}`,
            title: "¡Recordatorio de fichaje!",
            body: `Hola ${user?.name || "Trabajador"}, llevas más de 8 horas trabajando. ¿Has olvidado fichar tu salida?`,
            timestamp: now.getTime(),
            read: false,
            type: "clock-out-reminder",
          })
          localStorage.setItem("notifications", JSON.stringify(notifications))
        }
      },
      5 * 60 * 1000,
    ) // Verificar cada 5 minutos

    setReminderTimer(timer)
  }

  // Función para manejar el inicio de jornada
  const handleStartWork = async () => {
    // Verificar si hay un fichaje activo
    if (user && user.id) {
      const activeClockRecord = hasActiveClockRecord(user.id)
      if (activeClockRecord) {
        setActiveClockInfo(activeClockRecord)
        setShowActiveClockModal(true)
        return
      }
    }

    // Verificar si el puesto pertenece a la empresa del usuario
    if (companyValidationError) {
      toast.showError(companyValidationError)
      return
    }

    try {
      // Obtener información adicional para teletrabajo
      let remoteInfo = null
      if (isRemotePosition) {
        remoteInfo = await getRemoteWorkInfo()
        setRemoteWorkInfo(remoteInfo)
      }

      // Obtener la ubicación (solo para puestos presenciales)
      const locationData = isRemotePosition ? null : await getCurrentLocation()

      const now = new Date()
      setStartTime(now)
      setIsWorking(true)

      // Reiniciar las pausas para la nueva jornada
      setPauses([])
      setTotalPauseDuration(0)
      setLastPauseEndTime(null)

      // Crear el registro de fichaje
      const clockRecord = {
        id: `clock${Date.now()}`,
        userId: user?.id || "unknown",
        userName: user?.name || "Usuario",
        positionId: positionId,
        positionName: positionInfo?.name || "Desconocido",
        date: now.toISOString(),
        startTime: now.toISOString(),
        startLocation: locationData,
        pauses: [],
        status: "in-progress",
        companyId: user?.companyId || "unknown",
        isRemote: isRemotePosition,
        remoteInfo: remoteInfo,
        userAgent: navigator.userAgent,
        deviceInfo: {
          platform: navigator.platform,
          language: navigator.language,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
        },
      }

      // Guardar en localStorage
      clockRecordService.add(clockRecord)

      // Registrar el fichaje activo
      registerActiveClockRecord(user?.id, clockRecord.id, positionId)

      // Guardar el ID del registro actual
      setCurrentClockRecordId(clockRecord.id)

      console.log(`Jornada iniciada en puesto ${positionId} a las ${now.toLocaleTimeString()}`)
      if (locationData) {
        console.log(`Ubicación: Lat ${locationData.latitude}, Lng ${locationData.longitude}`)
      } else if (isRemotePosition) {
        console.log(`Fichaje remoto desde ${remoteInfo?.ipLocation || "ubicación desconocida"}`)
      }

      // Configurar el temporizador de recordatorio
      setupReminderTimer(now)

      // Mostrar notificación de inicio de jornada
      notificationService.showNotification("Jornada iniciada", {
        body: `Has iniciado tu jornada en ${positionInfo?.name || positionId} a las ${now.toLocaleTimeString()}.`,
        tag: "clock-in",
      })

      // Mostrar toast de éxito
      const modeText = isRemotePosition ? "en remoto" : ""
      toast.showSuccess(`Jornada iniciada correctamente ${modeText} a las ${now.toLocaleTimeString()}`)

      // Mostrar modal de éxito
      setSuccessMessage(
        `Has iniciado tu jornada en ${positionInfo?.name || positionId} ${isRemotePosition ? "(Teletrabajo)" : ""} a las ${now.toLocaleTimeString()}.`,
      )
      setShowSuccessModal(true)
    } catch (error) {
      console.error("Error al iniciar jornada:", error)

      // Si hay un error con la ubicación, mostramos el error pero no impedimos el fichaje
      const now = new Date()
      setStartTime(now)
      setIsWorking(true)

      // Reiniciar las pausas para la nueva jornada
      setPauses([])
      setTotalPauseDuration(0)
      setLastPauseEndTime(null)

      // Obtener información adicional para teletrabajo
      let remoteInfo = null
      if (isRemotePosition) {
        remoteInfo = await getRemoteWorkInfo().catch(() => null)
        setRemoteWorkInfo(remoteInfo)
      }

      // Crear el registro de fichaje incluso sin ubicación
      const clockRecord = {
        id: `clock${Date.now()}`,
        userId: user?.id || "unknown",
        userName: user?.name || "Usuario",
        positionId: positionId,
        positionName: positionInfo?.name || "Desconocido",
        date: now.toISOString(),
        startTime: now.toISOString(),
        startLocation: null, // Sin ubicación
        pauses: [],
        status: "in-progress",
        companyId: user?.companyId || "unknown",
        isRemote: isRemotePosition,
        remoteInfo: remoteInfo,
        userAgent: navigator.userAgent,
        deviceInfo: {
          platform: navigator.platform,
          language: navigator.language,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
        },
      }

      // Guardar en localStorage
      clockRecordService.add(clockRecord)

      // Registrar el fichaje activo
      registerActiveClockRecord(user?.id, clockRecord.id, positionId)

      // Guardar el ID del registro actual
      setCurrentClockRecordId(clockRecord.id)

      // Configurar el temporizador de recordatorio incluso si hay error de ubicación
      setupReminderTimer(now)

      console.log(`Jornada iniciada en puesto ${positionId} a las ${now.toLocaleTimeString()} (sin ubicación)`)

      // Mostrar notificación de inicio de jornada
      notificationService.showNotification("Jornada iniciada", {
        body: `Has iniciado tu jornada en ${positionInfo?.name || positionId} a las ${now.toLocaleTimeString()}.`,
        tag: "clock-in",
      })

      // Mostrar toast de éxito con advertencia
      const modeText = isRemotePosition ? "en remoto" : "sin ubicación"
      toast.showWarning(`Jornada iniciada ${modeText} a las ${now.toLocaleTimeString()}`)

      // Mostrar modal de éxito con advertencia
      setSuccessMessage(
        `Has iniciado tu jornada en ${positionInfo?.name || positionId} ${isRemotePosition ? "(Teletrabajo)" : ""} a las ${now.toLocaleTimeString()}. ${!isRemotePosition ? "No se ha podido registrar tu ubicación." : ""}`,
      )
      setShowSuccessModal(true)
    }
  }

  // Función para confirmar el fin de jornada
  const confirmEndWork = () => {
    setShowEndWorkConfirmation(true)
  }

  // Función para manejar el fin de jornada
  const handleEndWork = async () => {
    setShowEndWorkConfirmation(false)

    try {
      // Obtener información adicional para teletrabajo
      let remoteInfo = null
      if (isRemotePosition) {
        remoteInfo = await getRemoteWorkInfo()
      }

      // Obtener la ubicación (solo para puestos presenciales)
      const locationData = isRemotePosition ? null : await getCurrentLocation()

      const now = new Date()
      const duration = startTime ? Math.round((now - startTime) / 60000) : 0 // Duración en minutos

      setIsWorking(false)

      // Limpiar el temporizador de recordatorio
      if (reminderTimer) {
        clearInterval(reminderTimer)
        setReminderTimer(null)
      }

      // Si hay una pausa activa, la finalizamos automáticamente
      if (isPaused) {
        handleTogglePause(true) // Forzar finalización de pausa
      }

      // Actualizar el registro de fichaje en localStorage
      if (currentClockRecordId) {
        clockRecordService.update(currentClockRecordId, {
          endTime: now.toISOString(),
          endLocation: locationData,
          endRemoteInfo: remoteInfo,
          pauses: pauses,
          duration: duration,
          status: "completed",
          locked: true, // Asegurar que el registro queda bloqueado
        })

        // Eliminar el registro de fichaje activo
        removeActiveClockRecord(user?.id)
      }

      console.log(`Jornada finalizada en puesto ${positionId} a las ${now.toLocaleTimeString()}`)
      if (locationData) {
        console.log(`Ubicación: Lat ${locationData.latitude}, Lng ${locationData.longitude}`)
      } else if (isRemotePosition) {
        console.log(`Fichaje remoto finalizado desde ${remoteInfo?.ipLocation || "ubicación desconocida"}`)
      }
      console.log(`Duración aproximada: ${duration} minutos`)

      // Mostrar notificación de fin de jornada
      notificationService.showNotification("Jornada finalizada", {
        body: `Has finalizado tu jornada en ${positionInfo?.name || positionId} a las ${now.toLocaleTimeString()}. Duración: ${duration} minutos.`,
        tag: "clock-out",
      })

      // Mostrar toast de éxito
      const modeText = isRemotePosition ? "en remoto" : ""
      toast.showSuccess(`Jornada finalizada correctamente ${modeText}. Duración: ${duration} minutos.`)

      // Mostrar modal de éxito
      setSuccessMessage(
        `Has finalizado tu jornada en ${positionInfo?.name || positionId} ${isRemotePosition ? "(Teletrabajo)" : ""} a las ${now.toLocaleTimeString()}. Duración: ${duration} minutos.`,
      )
      setShowSuccessModal(true)

      setStartTime(null)
      setPauses([])
      setTotalPauseDuration(0)
      setLastPauseEndTime(null)
      setCurrentClockRecordId(null)
    } catch (error) {
      console.error("Error al finalizar jornada:", error)
      // Si hay un error con la ubicación, mostramos el error pero no impedimos finalizar el fichaje
      const now = new Date()
      const duration = startTime ? Math.round((now - startTime) / 60000) : 0

      setIsWorking(false)

      // Limpiar el temporizador de recordatorio
      if (reminderTimer) {
        clearInterval(reminderTimer)
        setReminderTimer(null)
      }

      // Si hay una pausa activa, la finalizamos automáticamente
      if (isPaused) {
        handleTogglePause(true) // Forzar finalización de pausa
      }

      // Obtener información adicional para teletrabajo
      let remoteInfo = null
      if (isRemotePosition) {
        remoteInfo = await getRemoteWorkInfo().catch(() => null)
      }

      // Actualizar el registro de fichaje en localStorage sin ubicación
      if (currentClockRecordId) {
        clockRecordService.update(currentClockRecordId, {
          endTime: now.toISOString(),
          endLocation: null, // Sin ubicación
          endRemoteInfo: remoteInfo,
          pauses: pauses,
          duration: duration,
          status: "completed",
        })

        // Eliminar el registro de fichaje activo
        removeActiveClockRecord(user?.id)
      }

      console.log(`Jornada finalizada en puesto ${positionId} a las ${now.toLocaleTimeString()} (sin ubicación)`)
      console.log(`Duración aproximada: ${duration} minutos`)

      // Mostrar notificación de fin de jornada
      notificationService.showNotification("Jornada finalizada", {
        body: `Has finalizado tu jornada en ${positionInfo?.name || positionId} a las ${now.toLocaleTimeString()}. Duración: ${duration} minutos.`,
        tag: "clock-out",
      })

      // Mostrar toast de éxito con advertencia
      const modeText = isRemotePosition ? "en remoto" : "sin ubicación"
      toast.showWarning(`Jornada finalizada ${modeText}. Duración: ${duration} minutos.`)

      // Mostrar modal de éxito con advertencia
      setSuccessMessage(
        `Has finalizado tu jornada en ${positionInfo?.name || positionId} ${isRemotePosition ? "(Teletrabajo)" : ""} a las ${now.toLocaleTimeString()}. Duración: ${duration} minutos. ${!isRemotePosition ? "No se ha podido registrar tu ubicación." : ""}`,
      )
      setShowSuccessModal(true)

      setStartTime(null)
      setPauses([])
      setTotalPauseDuration(0)
      setLastPauseEndTime(null)
      setCurrentClockRecordId(null)
    }
  }

  // Función para validar si se puede iniciar una pausa
  const validatePauseStart = () => {
    const now = new Date()

    // Verificar si ya se ha alcanzado el límite diario de pausas
    if (pauses.length >= pauseConfig.current.maxPausesPerDay) {
      setPauseValidationMessage(`Has alcanzado el límite diario de ${pauseConfig.current.maxPausesPerDay} pausas.`)
      setPauseValidationType("error")
      setCanOverridePauseValidation(false)
      setShowPauseValidationModal(true)
      return false
    }

    // Verificar si ya se ha alcanzado el tiempo máximo de pausas diarias
    if (totalPauseDuration >= pauseConfig.current.maxDailyPauseDuration) {
      setPauseValidationMessage(
        `Has alcanzado el tiempo máximo diario de pausas (${pauseConfig.current.maxDailyPauseDuration} minutos).`,
      )
      setPauseValidationType("error")
      setCanOverridePauseValidation(false)
      setShowPauseValidationModal(true)
      return false
    }

    // Verificar si ha pasado suficiente tiempo desde la última pausa
    if (lastPauseEndTime) {
      const minutesSinceLastPause = Math.floor((now - lastPauseEndTime) / (1000 * 60))
      if (minutesSinceLastPause < pauseConfig.current.minTimeBetweenPauses) {
        setPauseValidationMessage(
          `Debes esperar al menos ${pauseConfig.current.minTimeBetweenPauses} minutos entre pausas. Han pasado ${minutesSinceLastPause} minutos desde tu última pausa.`,
        )
        setPauseValidationType("warning")
        setCanOverridePauseValidation(true)
        setShowPauseValidationModal(true)
        return false
      }
    }

    return true
  }

  // Función para validar si una pausa puede continuar
  const validatePauseDuration = (startTime) => {
    const now = new Date()
    const pauseDuration = Math.floor((now - startTime) / (1000 * 60))

    // Verificar si la pausa actual excede la duración máxima individual
    if (pauseDuration > pauseConfig.current.maxSinglePauseDuration) {
      setPauseValidationMessage(
        `Esta pausa ha excedido la duración máxima permitida de ${pauseConfig.current.maxSinglePauseDuration} minutos.`,
      )
      setPauseValidationType("warning")
      setCanOverridePauseValidation(true)
      setShowPauseValidationModal(true)
      return false
    }

    // Verificar si con esta pausa se excedería el tiempo máximo diario
    if (totalPauseDuration + pauseDuration > pauseConfig.current.maxDailyPauseDuration) {
      const remainingTime = pauseConfig.current.maxDailyPauseDuration - totalPauseDuration
      setPauseValidationMessage(
        `Con esta pausa excederás el tiempo máximo diario de pausas. Te quedan ${remainingTime} minutos disponibles.`,
      )
      setPauseValidationType("warning")
      setCanOverridePauseValidation(true)
      setShowPauseValidationModal(true)
      return false
    }

    return true
  }

  // Función para manejar las pausas
  const handleTogglePause = (forceEnd = false) => {
    const now = new Date()

    if (!isPaused) {
      // Iniciar pausa - primero validamos
      if (!validatePauseStart()) {
        return // No iniciar la pausa si no pasa la validación
      }

      // Iniciar pausa
      setPauseStartTime(now)
      setIsPaused(true)

      // Crear objeto de pausa
      const newPause = {
        start: now.toISOString(),
        type: "break", // Tipo por defecto, se actualizará al finalizar
      }

      // Añadir la pausa al array local
      const updatedPauses = [...pauses, newPause]
      setPauses(updatedPauses)

      // Actualizar el registro de fichaje en localStorage
      if (currentClockRecordId) {
        clockRecordService.update(currentClockRecordId, {
          pauses: updatedPauses,
        })
      }

      console.log(`Pausa iniciada a las ${now.toLocaleTimeString()}`)

      // Mostrar notificación de inicio de pausa
      notificationService.showNotification("Pausa iniciada", {
        body: `Has iniciado una pausa a las ${now.toLocaleTimeString()}.`,
        tag: "pause-start",
      })

      // Mostrar toast de información
      toast.showInfo(`Pausa iniciada a las ${now.toLocaleTimeString()}`)

      // Configurar un temporizador para verificar la duración de la pausa
      const pauseCheckTimer = setInterval(() => {
        if (pauseStartTime) {
          validatePauseDuration(pauseStartTime)
        }
      }, 60000) // Verificar cada minuto

      // Guardar el temporizador para limpiarlo después
      window.pauseCheckTimer = pauseCheckTimer
    } else {
      // Finalizar pausa
      clearInterval(window.pauseCheckTimer) // Limpiar el temporizador de verificación

      const pauseDuration = Math.round((now - pauseStartTime) / 60000) // Duración en minutos

      // Si la pausa es muy corta (menos de 1 minuto) y no es forzada, mostrar advertencia
      if (pauseDuration < 1 && !forceEnd) {
        setPauseValidationMessage("La pausa es demasiado corta (menos de 1 minuto). ¿Seguro que deseas finalizarla?")
        setPauseValidationType("info")
        setCanOverridePauseValidation(true)
        setShowPauseValidationModal(true)

        // Configurar una función de callback para cuando el usuario confirme
        window.confirmShortPause = () => {
          finalizePause(now, pauseDuration)
        }

        return
      }

      finalizePause(now, pauseDuration)
    }
  }

  // Función para finalizar una pausa
  const finalizePause = (now, pauseDuration) => {
    // Determinar el tipo de pausa según la duración
    let pauseType = "break"
    if (pauseDuration >= 30) {
      pauseType = "lunch"
    }

    // Actualizar la última pausa en el array
    const updatedPauses = [...pauses]
    const lastPauseIndex = updatedPauses.length - 1

    if (lastPauseIndex >= 0) {
      updatedPauses[lastPauseIndex] = {
        ...updatedPauses[lastPauseIndex],
        end: now.toISOString(),
        duration: pauseDuration,
        type: pauseType,
      }
    }

    setPauses(updatedPauses)
    setIsPaused(false)
    setPauseStartTime(null)
    setLastPauseEndTime(now)

    // Actualizar el registro de fichaje en localStorage
    if (currentClockRecordId) {
      clockRecordService.update(currentClockRecordId, {
        pauses: updatedPauses,
      })
    }

    console.log(`Pausa finalizada a las ${now.toLocaleTimeString()}`)
    console.log(`Duración de la pausa: ${pauseDuration} minutos`)

    // Mostrar notificación de fin de pausa
    notificationService.showNotification("Pausa finalizada", {
      body: `Has finalizado tu pausa a las ${now.toLocaleTimeString()}. Duración: ${pauseDuration} minutos.`,
      tag: "pause-end",
    })

    // Mostrar toast de información
    toast.showInfo(`Pausa finalizada. Duración: ${pauseDuration} minutos.`)

    // Limpiar la función de callback si existe
    if (window.confirmShortPause) {
      delete window.confirmShortPause
    }
  }

  // Función para manejar la respuesta del modal de validación de pausa
  const handlePauseValidationResponse = (confirmed) => {
    setShowPauseValidationModal(false)

    if (confirmed) {
      // Si es para confirmar una pausa corta
      if (window.confirmShortPause) {
        window.confirmShortPause()
        return
      }

      // Si es para iniciar una pausa a pesar de la advertencia
      if (!isPaused) {
        // Iniciar pausa ignorando la validación
        const now = new Date()
        setPauseStartTime(now)
        setIsPaused(true)

        // Crear objeto de pausa
        const newPause = {
          start: now.toISOString(),
          type: "break", // Tipo por defecto, se actualizará al finalizar
        }

        // Añadir la pausa al array local
        const updatedPauses = [...pauses, newPause]
        setPauses(updatedPauses)

        // Actualizar el registro de fichaje en localStorage
        if (currentClockRecordId) {
          clockRecordService.update(currentClockRecordId, {
            pauses: updatedPauses,
          })
        }

        console.log(`Pausa iniciada a las ${now.toLocaleTimeString()} (ignorando validación)`)

        // Mostrar notificación
        notificationService.showNotification("Pausa iniciada", {
          body: `Has iniciado una pausa a las ${now.toLocaleTimeString()}.`,
          tag: "pause-start",
        })

        // Mostrar toast
        toast.showInfo(`Pausa iniciada a las ${now.toLocaleTimeString()}`)
      }
    }
  }

  // Función para ir al fichaje activo
  const handleGoToActiveClock = () => {
    if (activeClockInfo && activeClockInfo.positionId) {
      // Redirigir al puesto donde está el fichaje activo
      window.location.href = `${window.location.origin}/?positionId=${activeClockInfo.positionId}`
    }
    setShowActiveClockModal(false)
  }

  // Formatear tiempo para mostrar
  const formatTime = (date) => {
    return date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  }

  // Si el usuario no ha iniciado sesión, mostrar formulario simple
  if (!isLoggedIn) {
    return (
      <div className="worker-login-view">
        <h1 className="text-xl md:text-2xl font-bold mb-4">Fichaje de Jornada</h1>
        <div className="position-info">
          <h2 className="text-lg md:text-xl font-semibold mb-2">
            Puesto: {positionInfo ? sanitizeInput(positionInfo.name) : sanitizeInput(positionId)}
          </h2>
          {positionInfo && <p className="mb-4">Ubicación: {sanitizeInput(positionInfo.location)}</p>}
          {positionInfo && positionInfo.mode === "remote" && (
            <p className="mb-4 px-3 py-1 bg-purple-100 text-purple-800 rounded-full inline-block">Teletrabajo</p>
          )}
        </div>
        <p className="mb-6">Inicia sesión para fichar</p>

        <button
          onClick={() => {
            const success = onLogin()
            if (success) {
              setIsLoggedIn(true)
              toast.showSuccess("Sesión iniciada correctamente")
            } else {
              toast.showError("Error al iniciar sesión")
            }
          }}
          className="login-btn w-full md:w-auto py-3"
        >
          Iniciar Sesión
        </button>

        {/* Modal para QR inválido */}
        <Modal isOpen={showInvalidQRModal} onClose={() => setShowInvalidQRModal(false)} title="Código QR no válido">
          <div className="invalid-qr-modal">
            <div className="invalid-qr-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 text-red-500"
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
            <p className="invalid-qr-message">
              El código QR escaneado no es válido o ha expirado. Por favor, escanea un código QR válido para fichar.
            </p>
            <div className="invalid-qr-details">
              <p>ID de puesto: {sanitizeInput(positionId)}</p>
              <p>Este puesto no existe o ha sido eliminado.</p>
            </div>
            <div className="invalid-qr-actions">
              <button onClick={() => (window.location.href = "/")} className="action-btn">
                Volver al inicio
              </button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // Vista de fichaje para trabajador autenticado
  return (
    <div className="worker-clock-view">
      <h1 className="text-xl md:text-2xl font-bold mb-4">Fichaje de Jornada</h1>
      <div className="position-info">
        <h2 className="text-lg md:text-xl font-semibold mb-2">
          Puesto: {positionInfo ? sanitizeInput(positionInfo.name) : sanitizeInput(positionId)}
        </h2>
        {positionInfo && <p className="mb-2">Ubicación: {sanitizeInput(positionInfo.location)}</p>}
        {positionInfo && positionInfo.mode && (
          <p className="mb-2">
            <span
              className={`px-2 py-1 rounded-full text-xs ${positionInfo.mode === "remote" ? "bg-purple-100 text-purple-800" : positionInfo.mode === "hybrid" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}
            >
              {positionInfo.mode === "remote"
                ? "Teletrabajo"
                : positionInfo.mode === "hybrid"
                  ? "Híbrido"
                  : "Presencial"}
            </span>
          </p>
        )}
        <p className="mb-4">Trabajador: {user?.name ? sanitizeInput(user.name) : "Usuario"}</p>

        {locationError && !isRemotePosition && (
          <div className="location-error mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{locationError}</div>
        )}

        {companyValidationError && (
          <div className="location-error mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{companyValidationError}</div>
        )}

        {isRemotePosition && (
          <div className="remote-info mb-4 p-3 bg-purple-50 text-purple-800 rounded-lg">
            <p className="font-medium">Estás fichando en modo teletrabajo</p>
            <p className="text-sm">No es necesario verificar tu ubicación física.</p>
          </div>
        )}
      </div>

      <div className="clock-actions">
        {!isWorking ? (
          <button
            onClick={handleStartWork}
            className="start-btn w-full py-4 text-lg"
            disabled={isLoadingLocation || !!companyValidationError}
          >
            {isLoadingLocation
              ? "Obteniendo ubicación..."
              : isRemotePosition
                ? "Iniciar Jornada (Teletrabajo)"
                : "Iniciar Jornada"}
          </button>
        ) : (
          <div className="working-status w-full">
            <p className="text-lg font-medium mb-4 p-3 bg-green-50 rounded-lg">
              Jornada iniciada a las: {formatTime(startTime)}
              {isRemotePosition && <span className="text-sm block mt-1">(Teletrabajo)</span>}
            </p>

            {/* Información de pausas */}
            <div className="pause-info mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="font-medium">
                Pausas disponibles: {pauseConfig.current.maxPausesPerDay - pauses.length} de{" "}
                {pauseConfig.current.maxPausesPerDay}
              </p>
              <p>
                Tiempo de pausa utilizado: {totalPauseDuration} de {pauseConfig.current.maxDailyPauseDuration} minutos
              </p>
            </div>

            {/* Botón de pausa */}
            <button
              onClick={() => handleTogglePause()}
              className={`pause-btn w-full py-3 text-lg mb-4 ${isPaused ? "bg-yellow-600" : "bg-yellow-500"}`}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? "Obteniendo ubicación..." : isPaused ? "Finalizar Pausa" : "Registrar Pausa"}
            </button>

            {/* Historial de pausas */}
            {pauses.length > 0 && (
              <div className="pauses-history mb-4 p-3 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Pausas registradas hoy:</h3>
                <ul className="text-sm">
                  {pauses.map((pause, index) => (
                    <li key={index} className="mb-1 pause-item">
                      <span className="pause-time">
                        {pause.start && formatTime(new Date(pause.start))}
                        {pause.end ? ` - ${formatTime(new Date(pause.end))}` : " - En curso"}
                      </span>
                      <span className="pause-duration">{pause.duration || "..."} min</span>
                      <span className={`pause-type ${pause.type}`}>
                        {pause.type === "lunch" ? "Comida" : "Descanso"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botón para finalizar jornada */}
            <button onClick={confirmEndWork} className="end-btn w-full py-4 text-lg" disabled={isLoadingLocation}>
              {isLoadingLocation ? "Obteniendo ubicación..." : "Terminar Jornada"}
            </button>
          </div>
        )}
      </div>

      {/* Información de ubicación (solo para desarrollo/debug) */}
      {location && !isRemotePosition && (
        <div className="location-info mt-4 text-xs text-gray-500">
          <p>
            Última ubicación: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </p>
          <p>Precisión: ±{Math.round(location.accuracy)}m</p>
        </div>
      )}

      {/* Información de teletrabajo (solo para desarrollo/debug) */}
      {remoteWorkInfo && isRemotePosition && (
        <div className="remote-info mt-4 text-xs text-gray-500">
          <p>IP: {remoteWorkInfo.ip || "No disponible"}</p>
          <p>Ubicación aproximada: {remoteWorkInfo.ipLocation || "No disponible"}</p>
        </div>
      )}

      {/* Modal para explicar la solicitud de ubicación */}
      <Modal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} title="Permiso de ubicación">
        <div className="location-modal">
          <div className="location-modal-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="location-modal-message">
            Para registrar tu fichaje, necesitamos acceder a tu ubicación actual. Esto nos permite verificar que estás
            en el lugar de trabajo correcto.
          </p>
          <div className="location-modal-details">
            <p>Tu ubicación solo se utilizará para:</p>
            <ul>
              <li>Verificar tu presencia en el lugar de trabajo</li>
              <li>Registrar la ubicación de inicio y fin de jornada</li>
              <li>Cumplir con los requisitos legales de control horario</li>
            </ul>
            <p>No se realizará un seguimiento continuo de tu ubicación.</p>
          </div>
          <div className="location-modal-actions">
            <button onClick={() => setShowLocationModal(false)} className="action-btn">
              Entendido
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para mostrar éxito en el fichaje */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Fichaje Registrado">
        <div className="success-modal">
          <div className="success-modal-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="success-modal-message">{successMessage}</p>
          <div className="success-modal-actions">
            <button onClick={() => setShowSuccessModal(false)} className="action-btn">
              Aceptar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para QR inválido */}
      <Modal isOpen={showInvalidQRModal} onClose={() => setShowInvalidQRModal(false)} title="Código QR no válido">
        <div className="invalid-qr-modal">
          <div className="invalid-qr-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-red-500"
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
          <p className="invalid-qr-message">
            El código QR escaneado no es válido o ha expirado. Por favor, escanea un código QR válido para fichar.
          </p>
          <div className="invalid-qr-details">
            <p>ID de puesto: {sanitizeInput(positionId)}</p>
            <p>Este puesto no existe o ha sido eliminado.</p>
          </div>
          <div className="invalid-qr-actions">
            <button onClick={() => (window.location.href = "/")} className="action-btn">
              Volver al inicio
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para fichaje activo en otro puesto */}
      <Modal
        isOpen={showActiveClockModal}
        onClose={() => setShowActiveClockModal(false)}
        title="Fichaje activo detectado"
      >
        <div className="success-modal">
          <div className="success-modal-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-yellow-500"
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
          <p className="success-modal-message">
            Ya tienes una jornada activa en otro puesto de trabajo. No puedes iniciar una nueva jornada hasta finalizar
            la actual.
          </p>
          <div className="invalid-qr-details">
            <p>
              <strong>Puesto activo:</strong> {activeClockInfo?.record?.positionName || "Desconocido"}
            </p>
            <p>
              <strong>Iniciado:</strong>{" "}
              {activeClockInfo?.record?.startTime
                ? new Date(activeClockInfo.record.startTime).toLocaleString()
                : "Desconocido"}
            </p>
          </div>
          <div className="success-modal-actions">
            <button onClick={handleGoToActiveClock} className="action-btn">
              Ir al puesto activo
            </button>
            <button onClick={() => setShowActiveClockModal(false)} className="action-btn secondary">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal para validación de pausas */}
      <ConfirmationModal
        isOpen={showPauseValidationModal}
        onClose={() => setShowPauseValidationModal(false)}
        message={pauseValidationMessage}
        type={pauseValidationType === "info" ? "info" : pauseValidationType === "warning" ? "warning" : "validation"}
        canOverride={canOverridePauseValidation}
        confirmText="Continuar de todos modos"
        cancelText="Cancelar"
        onConfirm={() => handlePauseValidationResponse(true)}
        onCancel={() => handlePauseValidationResponse(false)}
        title="Validación de pausa"
      />

      {/* Modal de política de privacidad */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicyModal}
        onClose={handlePrivacyPolicyDecline}
        onAccept={handlePrivacyPolicyAccept}
        onDecline={handlePrivacyPolicyDecline}
      />

      {/* Modal de confirmación para finalizar jornada */}
      <ConfirmationModal
        isOpen={showEndWorkConfirmation}
        onClose={() => setShowEndWorkConfirmation(false)}
        onConfirm={handleEndWork}
        title="Confirmar fin de jornada"
        message="¿Estás seguro de que deseas finalizar tu jornada laboral? Esta acción no se puede deshacer."
        confirmText="Finalizar jornada"
        cancelText="Cancelar"
        type="warning"
      />
    </div>
  )
}

export default WorkerClockView
