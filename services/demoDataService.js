// demoDataService.js
import { v4 as uuidv4 } from "uuid"

// Nombres y apellidos para generar datos aleatorios
const firstNames = [
  "Juan",
  "María",
  "Pedro",
  "Ana",
  "Carlos",
  "Laura",
  "Miguel",
  "Sofía",
  "Javier",
  "Carmen",
  "Antonio",
  "Isabel",
  "Francisco",
  "Lucía",
  "David",
]

const lastNames = [
  "García",
  "Rodríguez",
  "López",
  "Martínez",
  "González",
  "Fernández",
  "Sánchez",
  "Pérez",
  "Gómez",
  "Martín",
  "Jiménez",
  "Ruiz",
  "Hernández",
  "Díaz",
  "Moreno",
  "Álvarez",
  "Romero",
  "Alonso",
  "Gutiérrez",
  "Navarro",
]

// Nombres de posiciones para generar datos aleatorios
const positionNames = [
  "Administrativo",
  "Técnico",
  "Comercial",
  "Atención al Cliente",
  "Recursos Humanos",
  "Contabilidad",
  "Marketing",
  "Desarrollo",
  "Diseño",
  "Operaciones",
  "Logística",
  "Mantenimiento",
  "Seguridad",
  "Limpieza",
  "Recepción",
]

// Generar un trabajador aleatorio
const generateRandomWorker = () => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
  const lastName1 = lastNames[Math.floor(Math.random() * lastNames.length)]
  const lastName2 = lastNames[Math.floor(Math.random() * lastNames.length)]

  return {
    id: uuidv4(),
    firstName,
    lastName: `${lastName1} ${lastName2}`,
    email: `${firstName.toLowerCase()}.${lastName1.toLowerCase()}@ejemplo.com`,
    phone: `6${Math.floor(10000000 + Math.random() * 90000000)}`,
    active: Math.random() > 0.2, // 80% de probabilidad de estar activo
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Generar una posición aleatoria
const generateRandomPosition = () => {
  const name = positionNames[Math.floor(Math.random() * positionNames.length)]

  return {
    id: uuidv4(),
    name,
    description: `Posición de ${name}`,
    active: Math.random() > 0.1, // 90% de probabilidad de estar activa
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Generar trabajadores de ejemplo
export const generateDemoWorkers = (count = 10) => {
  const workers = []

  for (let i = 0; i < count; i++) {
    workers.push(generateRandomWorker())
  }

  // Guardar en localStorage
  localStorage.setItem("workers", JSON.stringify(workers))

  return workers
}

// Generar posiciones de ejemplo
export const generateDemoPositions = (count = 5) => {
  const positions = []

  for (let i = 0; i < count; i++) {
    positions.push(generateRandomPosition())
  }

  // Guardar en localStorage
  localStorage.setItem("positions", JSON.stringify(positions))

  return positions
}

// Generar un registro de fichaje aleatorio
export const generateRandomClockRecord = (workerId, positionId, date) => {
  // Hora de entrada entre 7:00 y 10:00
  const entryHour = 7 + Math.floor(Math.random() * 3)
  const entryMinute = Math.floor(Math.random() * 60)

  // Hora de salida entre 4 y 9 horas después
  const workHours = 4 + Math.floor(Math.random() * 5)
  let exitHour = entryHour + workHours
  const exitMinute = entryMinute + Math.floor(Math.random() * 30)

  // Ajustar si la hora de salida excede las 24 horas
  if (exitHour >= 24) {
    exitHour -= 24
  }

  // Crear fechas de entrada y salida
  const entryDate = new Date(date)
  entryDate.setHours(entryHour, entryMinute, 0, 0)

  const exitDate = new Date(date)
  exitDate.setHours(exitHour, exitMinute, 0, 0)

  return {
    id: uuidv4(),
    workerId,
    positionId,
    entryTime: entryDate.toISOString(),
    exitTime: exitDate.toISOString(),
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Generar registros de fichaje para los últimos días
export const generateDemoClockRecords = (workers, positions, days = 7) => {
  const clockRecords = []
  const today = new Date()

  // Para cada día en el rango
  for (let day = 0; day < days; day++) {
    const date = new Date(today)
    date.setDate(date.getDate() - day)

    // Para cada trabajador activo
    workers
      .filter((worker) => worker.active)
      .forEach((worker) => {
        // 80% de probabilidad de tener un registro ese día
        if (Math.random() > 0.2) {
          // Seleccionar una posición aleatoria
          const position = positions[Math.floor(Math.random() * positions.length)]

          // Generar el registro
          const record = generateRandomClockRecord(worker.id, position.id, date)
          clockRecords.push(record)
        }
      })
  }

  // Guardar en localStorage
  const existingRecords = JSON.parse(localStorage.getItem("clockRecords") || "[]")
  localStorage.setItem("clockRecords", JSON.stringify([...existingRecords, ...clockRecords]))

  return clockRecords
}

// Exportar todas las funciones
export default {
  generateDemoWorkers,
  generateDemoPositions,
  generateDemoClockRecords,
  generateRandomWorker,
  generateRandomPosition,
  generateRandomClockRecord,
}
