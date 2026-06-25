/**
 * MVP project schedule: 8 weeks from "Cronograma MVP 8 semanas" (client xlsx).
 * Client-facing capabilities (Características tab) align with presupuesto "Alcance funcional",
 * phrased without implementation/stack jargon. Comments in English.
 */

export type MvpCronogramaWeek = {
  week: number
  phase: string
  tasks: string[]
  deliverables: string[]
  status?: string
}

export const MVP_CRONOGRAMA_8_WEEKS: MvpCronogramaWeek[] = [
  {
    week: 1,
    phase: 'Inicio técnico y estructura base',
    status: 'Iniciado',
    tasks: [
      'Configuración inicial del proyecto y repositorio',
      'Entorno de desarrollo operativo',
      'Arquitectura backend / frontend acordada',
      'Base de datos PostgreSQL y estructura general del sistema',
    ],
    deliverables: [
      'Proyecto inicial configurado, arquitectura técnica base y entorno de desarrollo operativo.',
    ],
  },
  {
    week: 2,
    phase: 'Backend base',
    status: 'Por iniciar',
    tasks: [
      'Backend en Django + Django REST Framework',
      'Modelo de datos inicial',
      'Autenticación, registro de usuarios y recuperación de contraseña',
      'Validación por correo electrónico',
    ],
    deliverables: ['API base funcional, autenticación operativa y modelo de datos inicial implementado.'],
  },
  {
    week: 3,
    phase: 'Panel administrador y perfiles',
    status: 'Por iniciar',
    tasks: [
      'Panel administrador y gestión de usuarios',
      'Perfiles de consultores y de candidatos',
      'Flujo de revisión y aprobación de consultores',
    ],
    deliverables: ['Panel administrador base, perfiles funcionales y flujo de aprobación inicial.'],
  },
  {
    week: 4,
    phase: 'Frontend funcional inicial',
    status: 'Por iniciar',
    tasks: [
      'Estructura React, rutas principales y conexión con la API',
      'Login, registro y vistas funcionales básicas',
      'Navegación preliminar del sitio',
    ],
    deliverables: [
      'Frontend funcional conectado al backend, con flujos principales operativos (sin diseño UI final).',
    ],
  },
  {
    week: 5,
    phase: 'UX/UI y experiencia de usuario',
    status: 'Por iniciar',
    tasks: [
      'Diseño e implementación de la interfaz principal',
      'Componentes Material UI y adaptación responsive / mobile',
      'Mejora visual del sitio público, dashboards y vistas principales',
    ],
    deliverables: ['Interfaz visual consolidada, componentes UI aplicados y experiencia de usuario mejorada.'],
  },
  {
    week: 6,
    phase: 'Funcionalidades críticas',
    status: 'Por iniciar',
    tasks: [
      'Búsqueda y filtros de consultores',
      'Diagnóstico inicial y recomendación básica por reglas / scoring',
      'Reservas, agenda y notificaciones por correo',
    ],
    deliverables: [
      'Búsqueda funcional, diagnóstico inicial, recomendación básica, reservas y notificaciones operativas.',
    ],
  },
  {
    week: 7,
    phase: 'Pagos y atención remota',
    status: 'Por iniciar',
    tasks: [
      'Integración de pasarela de pago, checkout y confirmación de transacciones',
      'Registro de pagos y comisión',
      'Integración con Zoom, Google Meet o alternativa equivalente',
    ],
    deliverables: ['Flujo reserva–pago–atención completo, pagos integrados y videollamada externa conectada.'],
  },
  {
    week: 8,
    phase: 'QA, despliegue y entrega',
    status: 'Por iniciar',
    tasks: [
      'Testing funcional integral y ajustes cross-device',
      'Correcciones finales y hardening básico',
      'Configuración de servidor, SSL, correo y despliegue productivo',
      'Capacitación y entrega técnica',
    ],
    deliverables: ['MVP desplegado, probado, documentado y entregado para uso inicial.'],
  },
]

export type MvpClientFeatureBlock = {
  title: string
  description: string
}

/**
 * Value-focused capabilities for end clients and program operators,
 * derived from presupuesto "Alcance funcional" plus roadmap (e.g. specialized AI chat),
 * phrased without stack / integration jargon.
 */
export const MVP_CLIENT_FEATURE_BLOCKS: MvpClientFeatureBlock[] = [
  {
    title: 'Alta y acceso a la plataforma',
    description:
      'Las personas pueden crear una cuenta, iniciar sesión de forma segura y recuperar el acceso por correo cuando lo necesiten, sin trámites manuales.',
  },
  {
    title: 'Perfiles de consultores y de quienes buscan asesoría',
    description:
      'Los consultores muestran su trayectoria y especialidad; quien encarga una asesoría dispone de un espacio con datos útiles para coordinar el contacto.',
  },
  {
    title: 'Publicación bajo revisión del programa',
    description:
      'Solo las personas autorizadas por el equipo del programa aparecen en el listado público, de modo que el catálogo refleja un estándar de calidad.',
  },
  {
    title: 'Exploración del catálogo',
    description:
      'Búsqueda y filtros por temas o áreas para acotar opciones y comparar perfiles antes de decidir con quién trabajar.',
  },
  {
    title: 'Chat con IA especializada',
    description:
      'Asistente conversacional orientado a campañas y consultoría política: permite plantear dudas, contrastar ideas y recibir orientación general en lenguaje accesible. Complementa la experiencia de la plataforma y no reemplaza el criterio profesional de un consultor ni asesoría jurídica o electoral formal.',
  },
  {
    title: 'Acompañamiento para decidir con quién hablar',
    description:
      'Un flujo guiado ayuda a ordenar prioridades y prioriza sugerencias de perfiles alineados con lo indicado, sin sustituir el criterio final de la persona usuaria.',
  },
  {
    title: 'Reservas y coordinación de encuentros',
    description:
      'Solicitud de turnos, seguimiento del estado de cada solicitud y enlace para reunirse a distancia cuando la consulta lo requiera.',
  },
  {
    title: 'Pago de la consulta desde la plataforma',
    description:
      'Flujo de cobro asociado a la reserva, con confirmación y registro de la operación para dejar constancia ante el consultor y quien contrata.',
  },
  {
    title: 'Mensajes automáticos por correo',
    description:
      'Avisos de alta, cambios en reservas y otras acciones relevantes, para que nadie pierda el hilo sin estar pendiente del sitio en todo momento.',
  },
  {
    title: 'Sitio público y paneles privados',
    description:
      'Páginas claras para visitantes y espacios privados según el rol: quien ofrece asesoría, quien la contrata y quien administra el programa.',
  },
  {
    title: 'Visibilidad básica para quien dirige el programa',
    description:
      'Indicadores resumidos de actividad (por ejemplo reservas y pagos) para apoyar decisiones operativas del equipo que gobierna el servicio.',
  },
  {
    title: 'Verificación por la comunidad',
    description:
      'Otros usuarios de la plataforma pueden valorar si el trabajo del consultor fue correcto, complementando la revisión de la IA y del equipo del programa.',
  },
]
