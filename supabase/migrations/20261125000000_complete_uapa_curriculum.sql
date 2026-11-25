begin;

alter table public.portfolio_courses
  add column if not exists prerequisite text,
  add column if not exists facilitator text;

update public.portfolio_courses as course
set trimester = source.trimester,
    course_code = source.course_code,
    title = source.title,
    is_placeholder = false,
    credits = source.credits,
    hours_theoretical = source.ht,
    hours_practical = source.hp,
    hours_research_virtual = source.hiv,
    hours_independent = source.hi,
    prerequisite = source.prerequisite
from (values
  (1, 1, 'EHC-101', 'Fundamentos y Características del Currículo Dominicano de los Niveles Preuniversitarios', 4, 60, 0, 60, 180, 'Licenciatura'),
  (2, 1, 'EHD-101', 'Psicología del Desarrollo Adolescente', 3, 45, 0, 45, 135, 'Licenciatura'),
  (3, 2, 'EHD-102', 'Proceso de Enseñanza Aprendizaje', 4, 60, 0, 60, 180, 'EHM-101'),
  (4, 2, 'EHD-103', 'Evaluación de los Aprendizajes', 3, 15, 60, 45, 135, 'Licenciatura'),
  (5, 2, 'EHD-104', 'Medios y Recursos para el Aprendizaje', 3, 15, 60, 45, 135, 'Licenciatura'),
  (6, 3, 'EHC-102', 'Didáctica Especial y Práctica Docente I de Informática', 4, 15, 90, 60, 180, 'EHC-101'),
  (7, 3, 'EHD-105', 'Identidad y Ética del Profesional Docente', 2, 30, 0, 30, 90, 'Licenciatura'),
  (8, 3, 'EHD-106', 'Psicología Educativa', 4, 30, 0, 30, 90, 'EHD-101'),
  (9, 4, 'EHC-103', 'Didáctica Especial y Práctica Docente II de Informática', 4, 30, 60, 60, 180, 'EHC-102'),
  (10, 4, 'EHC-104', 'Proyecto Pedagógico de Matemática para el Nivel Secundario', 3, 15, 60, 90, 135, 'EHC-103'),
  (11, 4, 'EHC-105', 'Seminario de Actualización Profesional', 2, 15, 30, 30, 90, 'Licenciatura')
) as source(course_number, trimester, course_code, title, credits, ht, hp, hiv, hi, prerequisite)
where course.course_number = source.course_number;

insert into public.portfolio_settings (key, value)
values ('curriculum', '{"institution":"Universidad Abierta Para Adultos (UAPA)","decree":"230 del 12 de octubre de 1995","pensum_year":"2024","duration":"1 año","modalities":["presencial","virtual"],"declared_totals":{"ht":330,"hp":360,"hiv":555,"hi":1530,"credits":34},"trimesters":{"1":{"credits":7,"ht":105,"hp":0,"hiv":105,"hi":315},"2":{"credits":10,"ht":90,"hp":120,"hiv":150,"hi":450},"3":{"credits":8,"ht":75,"hp":90,"hiv":120,"hi":360},"4":{"credits":9,"ht":60,"hp":150,"hiv":180,"hi":405}}}'::jsonb)
on conflict (key) do nothing;

commit;
