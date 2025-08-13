"use client"

import Modal from "./Modal"

function PrivacyPolicyModal({ isOpen, onClose, onAccept, onDecline }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onDecline} // Si se cierra sin aceptar, se considera rechazo
      title="Política de Privacidad - Geolocalización"
      size="lg"
    >
      <div className="privacy-policy-modal">
        <div className="privacy-policy-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-blue-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>

        <div className="privacy-policy-content">
          <h3 className="text-lg font-semibold mb-4">Uso de Datos de Geolocalización</h3>

          <div className="privacy-section mb-4">
            <h4 className="font-medium mb-2">¿Qué datos recopilamos?</h4>
            <p className="mb-2">Nuestra aplicación recopila los siguientes datos de geolocalización:</p>
            <ul className="list-disc pl-5 mb-2">
              <li>Coordenadas de latitud y longitud en el momento de fichar entrada y salida</li>
              <li>Precisión de la ubicación proporcionada por su dispositivo</li>
              <li>Fecha y hora de cada registro de ubicación</li>
            </ul>
            <p>No realizamos seguimiento continuo de su ubicación en ningún momento.</p>
          </div>

          <div className="privacy-section mb-4">
            <h4 className="font-medium mb-2">¿Cómo utilizamos estos datos?</h4>
            <p className="mb-2">Los datos de geolocalización se utilizan exclusivamente para:</p>
            <ul className="list-disc pl-5 mb-2">
              <li>Verificar que el fichaje se realiza desde la ubicación de trabajo autorizada</li>
              <li>Cumplir con requisitos legales de control horario</li>
              <li>Generar informes de asistencia para fines administrativos</li>
            </ul>
            <p>Estos datos no se utilizan para evaluación de desempeño ni se comparten con terceros.</p>
          </div>

          <div className="privacy-section mb-4">
            <h4 className="font-medium mb-2">¿Cómo protegemos sus datos?</h4>
            <ul className="list-disc pl-5 mb-2">
              <li>Todos los datos de geolocalización se almacenan cifrados</li>
              <li>Solo personal autorizado tiene acceso a estos datos</li>
              <li>Los datos se conservan por un período máximo de 4 años (según normativa laboral)</li>
              <li>Puede solicitar acceso o eliminación de sus datos en cualquier momento</li>
            </ul>
          </div>

          <div className="privacy-section mb-4">
            <h4 className="font-medium mb-2">Sus derechos</h4>
            <p className="mb-2">Usted tiene derecho a:</p>
            <ul className="list-disc pl-5">
              <li>Acceder a sus datos de geolocalización almacenados</li>
              <li>Rectificar información incorrecta</li>
              <li>Solicitar la eliminación de sus datos (sujeto a obligaciones legales)</li>
              <li>Retirar su consentimiento en cualquier momento</li>
            </ul>
          </div>

          <div className="privacy-section bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Nota importante:</strong> El uso de la geolocalización es necesario para el funcionamiento
              correcto de la aplicación de fichaje. Si no desea compartir su ubicación, consulte con su departamento de
              Recursos Humanos sobre métodos alternativos de registro horario.
            </p>
          </div>
        </div>

        <div className="privacy-policy-actions mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onAccept}
            className="btn-primary px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Aceptar y continuar
          </button>
          <button
            onClick={onDecline}
            className="btn-secondary px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
          >
            Rechazar
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          Al hacer clic en "Aceptar y continuar", confirma que ha leído y acepta nuestra política de privacidad con
          respecto al uso de datos de geolocalización.
        </p>
      </div>
    </Modal>
  )
}

export default PrivacyPolicyModal
