/** Example payloads for forms and mock AI flows (documentation for demos). */

export const MOCK_CONSULTANT_PROFILE = {
  full_name: 'María López García',
  identity_document: '12345678-9',
  phone: '+52 55 1234 5678',
  city: 'Ciudad de México',
  country: 'MX',
  professional_title: 'Estratega electoral',
  academic_titles: [
    { degree: 'Maestría en Comunicación Política', institution: 'Universidad Nacional' },
  ],
  payout_account_number: 'CLABE-012345678901234567',
  interest_countries: ['MX', 'AR'],
  interest_cities: ['CDMX', 'Buenos Aires'],
  election_levels_interest: ['national', 'local'],
}

export const MOCK_CV_TEXT = `María López García
Estratega electoral con 12 años de experiencia
Experiencia en campañas presidenciales y locales
Coordinación territorial y encuestas
Universidad Nacional — Maestría Comunicación Política`

export const MOCK_SERVICE = {
  name: 'Diseño de estrategia de campaña',
  description:
    'Incluye diagnóstico inicial, mapa de actores, narrativa central y plan de 8 semanas. Precio en USD.',
  price_usd: '2500.00',
  accepts_counteroffer: true,
}

export const MOCK_MARKETPLACE_REQUIREMENT = {
  title: 'Asesoría en encuestas para campaña local',
  description:
    'Necesitamos diseño de encuesta cuantitativa, 800 casos, 3 sectores urbanos, entrega en 3 semanas.',
  max_deadline_days: 21,
  max_budget_usd: '4000.00',
}

export const MOCK_MERCADOPAGO = {
  preference_id: 'MP-MOCK-EXAMPLE',
  init_point: '/pago/mercadopago-mock?preference_id=MP-MOCK-EXAMPLE&booking_id=1',
}
