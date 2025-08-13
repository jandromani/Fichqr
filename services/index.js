/**
 * Punto de entrada principal para todos los servicios
 * Exporta los servicios más utilizados directamente y proporciona
 * funciones para cargar dinámicamente los servicios menos utilizados
 */

// Importar servicios principales (carga inmediata)
import { storageService } from "./storage"
import { connectionService } from "./connectionService"
import notificationService from "./notificationService"
import connectionMonitorService from "./connectionMonitorService"
import syncQueueService from "./syncQueueService"
import offlineBackupService from "./offlineBackupService"
import diagnosticService from "./diagnosticService"

// Importar función para cargar servicios dinámicamente
import { loadService, preloadServices } from "./dynamicImports"

// Inicializar servicios
const initializeServices = () => {
  // Inicializar almacenamiento
  storageService.initializeDefaultData()

  // Inicializar servicio de conexión avanzado
  connectionMonitorService.initConnectionMonitorService()

  // Inicializar servicio de cola de sincronización
  syncQueueService.initSyncQueueService()

  // Inicializar servicio de respaldo
  offlineBackupService.initBackupService()

  // Inicializar servicio de diagnóstico
  diagnosticService.initDiagnosticService()

  // Precargar servicios en segundo plano
  preloadServices()

  console.log("Servicios inicializados correctamente")
}

// Exportar servicios principales
export {
  storageService,
  connectionService,
  notificationService,
  connectionMonitorService,
  syncQueueService,
  offlineBackupService,
  diagnosticService,
  loadService,
  initializeServices,
}

// Exportar servicios específicos del almacenamiento para compatibilidad
export const { positionService, workerService, clockRecordService, absenceRequestService, userSettingsService } =
  storageService
