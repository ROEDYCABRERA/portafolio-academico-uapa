-- ============================================================
-- MIGRACIÓN: PÉNSUM 2024 · HABILITACIÓN DOCENTE EN INFORMÁTICA
-- Universidad Abierta Para Adultos (UAPA)
-- Decreto 230 del 12 de octubre de 1995
-- ============================================================

-- ----------------------------------------------------------------
-- 1. ASEGURAR COLUMNAS EN portfolio_courses
--    Añadir las que puedan no existir; ignorar si ya están.
-- ----------------------------------------------------------------

ALTER TABLE portfolio_courses
  ADD COLUMN IF NOT EXISTS course_code          text,
  ADD COLUMN IF NOT EXISTS credits              numeric,
  ADD COLUMN IF NOT EXISTS hours_theoretical    integer,
  ADD COLUMN IF NOT EXISTS hours_practical      integer,
  ADD COLUMN IF NOT EXISTS hours_research_virtual integer,
  ADD COLUMN IF NOT EXISTS hours_independent    integer,
  ADD COLUMN IF NOT EXISTS prerequisite         text,
  ADD COLUMN IF NOT EXISTS facilitator          text,
  ADD COLUMN IF NOT EXISTS progress             integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS publication_status   text    DEFAULT 'published'
    CHECK (publication_status IN ('draft','review','published')),
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz DEFAULT now();

-- Índice único en course_code para evitar duplicados en re-ejecuciones
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_courses_course_code_idx
  ON portfolio_courses (course_code)
  WHERE course_code IS NOT NULL;

-- ----------------------------------------------------------------
-- 2. TABLA DE VALIDACIÓN DEL PÉNSUM
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_pensum_validations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at       timestamptz NOT NULL DEFAULT now(),
  actor_id     uuid REFERENCES auth.users(id),
  issues       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_pensum_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read validations"  ON portfolio_pensum_validations;
DROP POLICY IF EXISTS "Admins write validations" ON portfolio_pensum_validations;

CREATE POLICY "Admins read validations"  ON portfolio_pensum_validations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portfolio_admins pa
      WHERE pa.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins write validations" ON portfolio_pensum_validations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolio_admins pa
      WHERE pa.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 3. TABLA DE REFLEXIONES ACADÉMICAS (si no existe)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_academic_reflections (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id       uuid NOT NULL REFERENCES portfolio_participants(id) ON DELETE CASCADE,
  course_id            uuid REFERENCES portfolio_courses(id) ON DELETE SET NULL,
  section_key          text NOT NULL DEFAULT 'course',
  title                text,
  content              text,
  what_i_learned       text,
  my_experience        text,
  difficulties         text,
  skills_developed     text,
  how_i_will_apply     text,
  final_reflection     text,
  learning_acquired    text,
  practical_application text,
  status               text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','published')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_academic_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published reflections" ON portfolio_academic_reflections;
DROP POLICY IF EXISTS "Owner manage own reflections"      ON portfolio_academic_reflections;
DROP POLICY IF EXISTS "Admins manage all reflections"     ON portfolio_academic_reflections;

CREATE POLICY "Public read published reflections" ON portfolio_academic_reflections
  FOR SELECT USING (status = 'published');

CREATE POLICY "Owner manage own reflections" ON portfolio_academic_reflections
  FOR ALL USING (
    participant_id IN (
      SELECT id FROM portfolio_participants
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    participant_id IN (
      SELECT id FROM portfolio_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all reflections" ON portfolio_academic_reflections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM portfolio_admins pa
      WHERE pa.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------
-- 4. INSERTAR / ACTUALIZAR LAS 11 ASIGNATURAS DEL PÉNSUM 2024
--    ON CONFLICT evita duplicados al re-ejecutar.
-- ----------------------------------------------------------------

-- Trimestre 1
INSERT INTO portfolio_courses
  (trimester, course_number, course_code, title, description,
   hours_theoretical, hours_practical, hours_research_virtual, hours_independent,
   credits, prerequisite, status, is_placeholder, publication_status)
VALUES
  (1, 1, 'EHC-101',
   'Fundamentos y Características del Currículo Dominicano de los Niveles Preuniversitarios',
   NULL, 60, 0, 60, 180, 4, 'Licenciatura', 'pending', false, 'published'),
  (1, 2, 'EHD-101',
   'Psicología del Desarrollo Adolescente',
   NULL, 45, 0, 45, 135, 3, 'Licenciatura', 'pending', false, 'published')
ON CONFLICT (course_code) DO UPDATE SET
  trimester                 = EXCLUDED.trimester,
  course_number             = EXCLUDED.course_number,
  title                     = EXCLUDED.title,
  hours_theoretical         = EXCLUDED.hours_theoretical,
  hours_practical           = EXCLUDED.hours_practical,
  hours_research_virtual    = EXCLUDED.hours_research_virtual,
  hours_independent         = EXCLUDED.hours_independent,
  credits                   = EXCLUDED.credits,
  prerequisite              = EXCLUDED.prerequisite,
  is_placeholder            = EXCLUDED.is_placeholder,
  publication_status        = EXCLUDED.publication_status,
  updated_at                = now();

-- Trimestre 2
INSERT INTO portfolio_courses
  (trimester, course_number, course_code, title, description,
   hours_theoretical, hours_practical, hours_research_virtual, hours_independent,
   credits, prerequisite, status, is_placeholder, publication_status)
VALUES
  (2, 3, 'EHD-102',
   'Proceso de Enseñanza Aprendizaje',
   NULL, 60, 0, 60, 180, 4, 'EHM-101', 'pending', false, 'published'),
  (2, 4, 'EHD-103',
   'Evaluación de los Aprendizajes',
   NULL, 15, 60, 45, 135, 3, 'Licenciatura', 'pending', false, 'published'),
  (2, 5, 'EHD-104',
   'Medios y Recursos para el Aprendizaje',
   NULL, 15, 60, 45, 135, 3, 'Licenciatura', 'pending', false, 'published')
ON CONFLICT (course_code) DO UPDATE SET
  trimester                 = EXCLUDED.trimester,
  course_number             = EXCLUDED.course_number,
  title                     = EXCLUDED.title,
  hours_theoretical         = EXCLUDED.hours_theoretical,
  hours_practical           = EXCLUDED.hours_practical,
  hours_research_virtual    = EXCLUDED.hours_research_virtual,
  hours_independent         = EXCLUDED.hours_independent,
  credits                   = EXCLUDED.credits,
  prerequisite              = EXCLUDED.prerequisite,
  is_placeholder            = EXCLUDED.is_placeholder,
  publication_status        = EXCLUDED.publication_status,
  updated_at                = now();

-- Trimestre 3
INSERT INTO portfolio_courses
  (trimester, course_number, course_code, title, description,
   hours_theoretical, hours_practical, hours_research_virtual, hours_independent,
   credits, prerequisite, status, is_placeholder, publication_status)
VALUES
  (3, 6, 'EHC-102',
   'Didáctica Especial y Práctica Docente I de Informática',
   NULL, 15, 90, 60, 180, 4, 'EHC-101', 'pending', false, 'published'),
  (3, 7, 'EHD-105',
   'Identidad y Ética del Profesional Docente',
   NULL, 30, 0, 30, 90, 2, 'Licenciatura', 'pending', false, 'published'),
  (3, 8, 'EHD-106',
   'Psicología Educativa',
   NULL, 30, 0, 30, 90, 4, 'EHD-101', 'pending', false, 'published')
ON CONFLICT (course_code) DO UPDATE SET
  trimester                 = EXCLUDED.trimester,
  course_number             = EXCLUDED.course_number,
  title                     = EXCLUDED.title,
  hours_theoretical         = EXCLUDED.hours_theoretical,
  hours_practical           = EXCLUDED.hours_practical,
  hours_research_virtual    = EXCLUDED.hours_research_virtual,
  hours_independent         = EXCLUDED.hours_independent,
  credits                   = EXCLUDED.credits,
  prerequisite              = EXCLUDED.prerequisite,
  is_placeholder            = EXCLUDED.is_placeholder,
  publication_status        = EXCLUDED.publication_status,
  updated_at                = now();

-- Trimestre 4
INSERT INTO portfolio_courses
  (trimester, course_number, course_code, title, description,
   hours_theoretical, hours_practical, hours_research_virtual, hours_independent,
   credits, prerequisite, status, is_placeholder, publication_status)
VALUES
  (4, 9,  'EHC-103',
   'Didáctica Especial y Práctica Docente II de Informática',
   NULL, 30, 60, 60, 180, 4, 'EHC-102', 'pending', false, 'published'),
  (4, 10, 'EHC-104',
   'Proyecto Pedagógico de Matemática para el Nivel Secundario',
   NULL, 15, 60, 90, 135, 3, 'EHC-103', 'pending', false, 'published'),
  (4, 11, 'EHC-105',
   'Seminario de Actualización Profesional',
   NULL, 15, 30, 30, 90, 2, 'Licenciatura', 'pending', false, 'published')
ON CONFLICT (course_code) DO UPDATE SET
  trimester                 = EXCLUDED.trimester,
  course_number             = EXCLUDED.course_number,
  title                     = EXCLUDED.title,
  hours_theoretical         = EXCLUDED.hours_theoretical,
  hours_practical           = EXCLUDED.hours_practical,
  hours_research_virtual    = EXCLUDED.hours_research_virtual,
  hours_independent         = EXCLUDED.hours_independent,
  credits                   = EXCLUDED.credits,
  prerequisite              = EXCLUDED.prerequisite,
  is_placeholder            = EXCLUDED.is_placeholder,
  publication_status        = EXCLUDED.publication_status,
  updated_at                = now();

-- ----------------------------------------------------------------
-- 5. UPSERT CONFIGURACIÓN CURRICULAR CON TOTALES DECLARADOS
-- ----------------------------------------------------------------
INSERT INTO portfolio_settings (key, value, publication_status)
VALUES (
  'curriculum',
  '{
    "institution": "Universidad Abierta Para Adultos (UAPA)",
    "decree": "230 del 12 de octubre de 1995",
    "pensum_year": "2024",
    "duration": "1 año",
    "modalities": ["presencial", "virtual"],
    "specialty": "Especialidad en Habilitación Docente en Informática",
    "declared_totals": {
      "credits": 34,
      "ht": 330,
      "hp": 360,
      "hiv": 555,
      "hi": 1530
    },
    "trimesters": {
      "1": { "credits": 7,  "ht": 105, "hp": 0,   "hiv": 105, "hi": 315 },
      "2": { "credits": 10, "ht": 90,  "hp": 120,  "hiv": 150, "hi": 450 },
      "3": { "credits": 8,  "ht": 75,  "hp": 90,   "hiv": 120, "hi": 360 },
      "4": { "credits": 9,  "ht": 60,  "hp": 150,  "hiv": 180, "hi": 405 }
    }
  }'::jsonb,
  'published'
)
ON CONFLICT (key) DO UPDATE SET
  value              = EXCLUDED.value,
  publication_status = EXCLUDED.publication_status,
  updated_at         = now();

-- ----------------------------------------------------------------
-- 6. ELIMINAR CURSOS PLACEHOLDER VACÍOS QUE YA TENGAN REEMPLAZOS
--    (opcional — solo si existen cursos is_placeholder=true con
--     course_code NULL y trimestre repetido por los nuevos)
-- ----------------------------------------------------------------
-- Deshabilitar si no quieres eliminar nada:
-- DELETE FROM portfolio_courses
--   WHERE is_placeholder = true
--     AND course_code IS NULL;
