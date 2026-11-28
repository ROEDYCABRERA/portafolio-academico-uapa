// Pénsum 2024 — Habilitación Docente en Informática · UAPA
// Datos de referencia para validación y navegación.

export const PENSUM_INFO = {
  institution: 'Universidad Abierta Para Adultos (UAPA)',
  decree: '230 del 12 de octubre de 1995',
  specialty: 'Especialidad en Habilitación Docente en Informática',
  pensumYear: '2024',
  duration: '1 año',
  modalities: ['Presencial', 'Virtual'],
} as const

export const DECLARED_TOTALS = {
  credits: 34,
  ht: 330,
  hp: 360,
  hiv: 555,
  hi: 1530,
} as const

export const DECLARED_TRIMESTERS: Record<string, { credits: number; ht: number; hp: number; hiv: number; hi: number }> = {
  '1': { credits: 7,  ht: 105, hp: 0,   hiv: 105, hi: 315 },
  '2': { credits: 10, ht: 90,  hp: 120,  hiv: 150, hi: 450 },
  '3': { credits: 8,  ht: 75,  hp: 90,   hiv: 120, hi: 360 },
  '4': { credits: 9,  ht: 60,  hp: 150,  hiv: 180, hi: 405 },
}

export const PENSUM_COURSES = [
  // Trimestre 1
  { code: 'EHC-101', name: 'Fundamentos y Características del Currículo Dominicano de los Niveles Preuniversitarios', trimester: 1, ht: 60, hp: 0, hiv: 60, hi: 180, credits: 4, prerequisite: 'Licenciatura' },
  { code: 'EHD-101', name: 'Psicología del Desarrollo Adolescente',                                                     trimester: 1, ht: 45, hp: 0, hiv: 45, hi: 135, credits: 3, prerequisite: 'Licenciatura' },
  // Trimestre 2
  { code: 'EHD-102', name: 'Proceso de Enseñanza Aprendizaje',                                                          trimester: 2, ht: 60, hp: 0,  hiv: 60, hi: 180, credits: 4, prerequisite: 'EHM-101' },
  { code: 'EHD-103', name: 'Evaluación de los Aprendizajes',                                                            trimester: 2, ht: 15, hp: 60, hiv: 45, hi: 135, credits: 3, prerequisite: 'Licenciatura' },
  { code: 'EHD-104', name: 'Medios y Recursos para el Aprendizaje',                                                     trimester: 2, ht: 15, hp: 60, hiv: 45, hi: 135, credits: 3, prerequisite: 'Licenciatura' },
  // Trimestre 3
  { code: 'EHC-102', name: 'Didáctica Especial y Práctica Docente I de Informática',                                   trimester: 3, ht: 15, hp: 90, hiv: 60, hi: 180, credits: 4, prerequisite: 'EHC-101' },
  { code: 'EHD-105', name: 'Identidad y Ética del Profesional Docente',                                                 trimester: 3, ht: 30, hp: 0,  hiv: 30, hi: 90,  credits: 2, prerequisite: 'Licenciatura' },
  { code: 'EHD-106', name: 'Psicología Educativa',                                                                      trimester: 3, ht: 30, hp: 0,  hiv: 30, hi: 90,  credits: 4, prerequisite: 'EHD-101' },
  // Trimestre 4
  { code: 'EHC-103', name: 'Didáctica Especial y Práctica Docente II de Informática',                                  trimester: 4, ht: 30, hp: 60, hiv: 60, hi: 180, credits: 4, prerequisite: 'EHC-102' },
  { code: 'EHC-104', name: 'Proyecto Pedagógico de Matemática para el Nivel Secundario',                                trimester: 4, ht: 15, hp: 60, hiv: 90, hi: 135, credits: 3, prerequisite: 'EHC-103' },
  { code: 'EHC-105', name: 'Seminario de Actualización Profesional',                                                    trimester: 4, ht: 15, hp: 30, hiv: 30, hi: 90,  credits: 2, prerequisite: 'Licenciatura' },
] as const

export type PensumCourse = (typeof PENSUM_COURSES)[number]

/** Ordered course codes for prev/next navigation */
export const COURSE_CODE_ORDER = PENSUM_COURSES.map((c) => c.code)

export const TRIMESTER_NAMES = ['Primer trimestre', 'Segundo trimestre', 'Tercer trimestre', 'Cuarto trimestre'] as const

// Known inconsistencies — stored as reference, displayed in validation module
export const KNOWN_INCONSISTENCIES = [
  {
    type: 'credits_mismatch' as const,
    scope: 'program',
    label: 'Créditos totales del programa',
    declared: 34,
    computed: 36,
    difference: 2,
    description: 'El pénsum declara 34 CR pero la suma individual de las 11 asignaturas es 36 CR. Diferencia: +2.',
  },
  {
    type: 'credits_mismatch' as const,
    scope: 'trimester_3',
    label: 'Créditos declarados del Tercer Trimestre',
    declared: 8,
    computed: 10,
    difference: 2,
    description: 'El tercer trimestre declara 8 CR pero la suma de EHC-102 (4) + EHD-105 (2) + EHD-106 (4) = 10 CR. Diferencia: +2.',
  },
  {
    type: 'missing_prerequisite' as const,
    scope: 'EHD-102',
    label: 'Prerrequisito no localizado: EHM-101',
    declared: 34,
    computed: 36,
    difference: 0,
    description: 'EHD-102 requiere EHM-101 como prerrequisito, pero EHM-101 no figura entre las 11 asignaturas del pénsum suministrado. Referencia no localizada.',
  },
] as const
