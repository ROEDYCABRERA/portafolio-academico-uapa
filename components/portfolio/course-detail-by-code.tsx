'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight,
  ClipboardList, FileCheck2, MessageSquareQuote, UserRound,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course, Evidence, Experience, Reflection } from '@/lib/portfolio/types'
import { STATUS_LABELS } from '@/lib/portfolio/types'
import { COURSE_CODE_ORDER, PENSUM_COURSES } from '@/lib/portfolio/pensum-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

const supabase = createClient()

const sections = [
  { id: 'overview',     label: 'Descripción',         icon: BookOpen },
  { id: 'experiences',  label: 'Experiencias',         icon: ClipboardList },
  { id: 'evidence',     label: 'Evidencias',           icon: FileCheck2 },
  { id: 'reflections',  label: 'Reflexión personal',   icon: MessageSquareQuote },
] as const

type Tab = (typeof sections)[number]['id']

const STATUS_COLOR: Record<string, string> = {
  pending:     'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  review:      'bg-amber-100 text-amber-800',
  completed:   'bg-emerald-100 text-emerald-800',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function EmptySection({ title, copy }: { title: string; copy: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-9 text-center">
        <BookOpen aria-hidden="true" className="mx-auto text-slate-400" />
        <h2 className="mt-3 font-semibold text-[#0B2545]">{title}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{copy}</p>
      </CardContent>
    </Card>
  )
}

export function CourseDetailByCode({ code }: { code: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Load course by code
  const { data: course, isLoading } = useSWR(['course-by-code', code], async () => {
    const { data, error } = await supabase
      .from('portfolio_courses')
      .select('*')
      .eq('course_code', code)
      .maybeSingle()
    if (error) throw error
    return data as Course | null
  })

  // Navigation: use canonical PENSUM_COURSES order
  const codeIndex = COURSE_CODE_ORDER.indexOf(code as typeof COURSE_CODE_ORDER[number])
  const prevCode = codeIndex > 0 ? COURSE_CODE_ORDER[codeIndex - 1] : null
  const nextCode = codeIndex < COURSE_CODE_ORDER.length - 1 ? COURSE_CODE_ORDER[codeIndex + 1] : null
  const prevMeta = prevCode ? PENSUM_COURSES.find((c) => c.code === prevCode) : null
  const nextMeta = nextCode ? PENSUM_COURSES.find((c) => c.code === nextCode) : null

  // Experiences
  const { data: experiences = [] } = useSWR(
    course?.id ? ['code-experiences', course.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('portfolio_experiences')
        .select('id,participant_id,course_id,title,description,learning_date,status,created_at')
        .eq('course_id', course!.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as Experience[]
    },
  )

  // Reflections (new academic table)
  const { data: academicReflections = [] } = useSWR(
    course?.id ? ['code-academic-reflections', course.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('portfolio_academic_reflections')
        .select('id,participant_id,title,content,what_i_learned,my_experience,difficulties,skills_developed,how_i_will_apply,final_reflection,learning_acquired,practical_application,updated_at')
        .eq('course_id', course!.id)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data || []) as Array<{
        id: string; participant_id: string; title: string; content: string
        what_i_learned: string; my_experience: string; difficulties: string
        skills_developed: string; how_i_will_apply: string; final_reflection: string
        learning_acquired: string; practical_application: string; updated_at: string
      }>
    },
  )

  // Legacy reflections
  const { data: legacyReflections = [] } = useSWR(
    course?.id ? ['code-legacy-reflections', course.id] : null,
    async () => {
      const { data, error } = await supabase
        .from('portfolio_reflections')
        .select('id,participant_id,course_id,title,body,reflection_type,status,created_at')
        .eq('course_id', course!.id)
        .eq('reflection_type', 'individual')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as Reflection[]
    },
  )

  // Evidence
  const experienceIds = experiences.map((e) => e.id)
  const { data: evidence = [] } = useSWR(
    experienceIds.length ? ['code-evidence', experienceIds.join(',')] : null,
    async () => {
      const { data, error } = await supabase
        .from('portfolio_evidence')
        .select('id,experience_id,title,description,storage_path,mime_type,file_size,status')
        .in('experience_id', experienceIds)
        .eq('status', 'published')
      if (error) throw error
      return (data || []) as Evidence[]
    },
  )

  const { data: links = {} } = useSWR(
    evidence.length ? ['code-evidence-links', evidence.map((i) => i.id).join(',')] : null,
    async () => {
      const signed = await Promise.all(
        evidence.map(async (item) => {
          const { data } = await supabase.storage.from('portfolio-evidence').createSignedUrl(item.storage_path, 3600)
          return [item.id, data?.signedUrl || ''] as const
        }),
      )
      return Object.fromEntries(signed) as Record<string, string>
    },
  )

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="mt-4 h-14 rounded-2xl" />
        <Skeleton className="mt-4 h-64 rounded-2xl" />
      </main>
    )
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#0B2545]">Asignatura no encontrada</h1>
        <p className="mt-3 text-sm text-slate-600">No se encontró ninguna asignatura con el código «{code}».</p>
        <Link href="/pensum" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800">
          <ArrowLeft aria-hidden="true" size={16} />Volver al pénsum
        </Link>
      </main>
    )
  }

  const trimesterName = ['Primer', 'Segundo', 'Tercer', 'Cuarto'][course.trimester - 1] ?? `Trimestre ${course.trimester}`
  const position = codeIndex + 1

  return (
    <main className="mx-auto max-w-5xl px-4 pb-14 pt-7 sm:px-6 md:px-8">
      {/* Back link */}
      <Link href="/pensum" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950">
        <ArrowLeft aria-hidden="true" size={16} />Volver al pénsum
      </Link>

      {/* Header card */}
      <header className="mt-5 rounded-3xl bg-[#0B2545] p-6 text-white shadow-sm sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-200">
              {course.course_code} · {trimesterName}
            </p>
            <h1 className="mt-3 font-heading text-2xl font-bold leading-tight sm:text-3xl">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/80">
              {course.description || 'Consulta la información curricular, los aprendizajes publicados y las reflexiones personales asociadas a esta asignatura.'}
            </p>
          </div>
          <StatusBadge status={course.status} />
        </div>

        {/* Metric cards */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {([
            ['CR',  course.credits],
            ['HT',  course.hours_theoretical],
            ['HP',  course.hours_practical],
            ['HIV', course.hours_research_virtual],
            ['HI',  course.hours_independent],
          ] as [string, number | null][]).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[.06] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-100/60">{label}</p>
              <p className="mt-1 text-lg font-bold">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* Meta row */}
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-4 text-sm">
          <p>
            <span className="text-blue-100/60">Prerrequisito: </span>
            <span className="font-medium">{course.prerequisite || 'No especificado'}</span>
          </p>
          <p>
            <span className="text-blue-100/60">Facilitador/a: </span>
            <span className="font-medium">{course.facilitator || 'Pendiente de asignación'}</span>
          </p>
          <p>
            <span className="text-blue-100/60">Posición en pénsum: </span>
            <span className="font-medium">{position} de {COURSE_CODE_ORDER.length}</span>
          </p>
        </div>
      </header>

      {/* Tabs */}
      <section className="mt-6" aria-label="Contenido de la asignatura">
        <div
          role="tablist"
          aria-label="Secciones de la asignatura"
          className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-4"
        >
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`tab-${id}`}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              onClick={() => setActiveTab(id)}
              onKeyDown={(event) => {
                const current = sections.findIndex((s) => s.id === activeTab)
                const next =
                  event.key === 'ArrowRight' ? (current + 1) % sections.length :
                  event.key === 'ArrowLeft'  ? (current - 1 + sections.length) % sections.length :
                  event.key === 'Home' ? 0 :
                  event.key === 'End'  ? sections.length - 1 : current
                if (next !== current) {
                  event.preventDefault()
                  const nextSection = sections[next]
                  setActiveTab(nextSection.id)
                  document.getElementById(`tab-${nextSection.id}`)?.focus()
                }
              }}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                activeTab === id ? 'bg-[#0B2545] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon aria-hidden="true" size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="mt-4 focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          {/* ── DESCRIPCIÓN ── */}
          {activeTab === 'overview' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-slate-200/80">
                <CardContent className="flex gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800">
                    <ClipboardList aria-hidden="true" size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-[#0B2545]">Prerrequisito</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{course.prerequisite || 'No especificado'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80">
                <CardContent className="flex gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800">
                    <UserRound aria-hidden="true" size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold text-[#0B2545]">Facilitador/a</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{course.facilitator || 'Pendiente de asignación'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 md:col-span-2">
                <CardContent className="p-5">
                  <h2 className="font-semibold text-[#0B2545]">Propósito de aprendizaje</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {course.description || 'La descripción específica de la asignatura será incorporada por el equipo académico.'}
                  </p>
                </CardContent>
              </Card>

              {/* Academic information */}
              <Card className="border-slate-200/80 md:col-span-2">
                <CardContent className="p-5">
                  <h2 className="font-semibold text-[#0B2545]">Información académica</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {([
                      ['Créditos (CR)',   course.credits],
                      ['Horas teóricas (HT)',  course.hours_theoretical],
                      ['Horas prácticas (HP)', course.hours_practical],
                      ['HIV',                  course.hours_research_virtual],
                      ['Estudio indep. (HI)',  course.hours_independent],
                    ] as [string, number | null][]).map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                        <p className="mt-1 text-lg font-bold text-[#0B2545]">{value ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    {[
                      { label: 'Trimestre',    value: trimesterName },
                      { label: 'Código',       value: course.course_code },
                      { label: 'Estado',       value: STATUS_LABELS[course.status] || course.status },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
                        <p className="mt-1 font-medium text-[#0B2545]">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── EXPERIENCIAS ── */}
          {activeTab === 'experiences' && (
            <div className="flex flex-col gap-3">
              {experiences.length ? experiences.map((exp) => (
                <Card key={exp.id} className="border-slate-200/80">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Experiencia de aprendizaje</p>
                    <h2 className="mt-2 font-semibold text-[#0B2545]">{exp.title}</h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{exp.description}</p>
                    {exp.learning_date && (
                      <p className="mt-3 text-xs text-slate-500">
                        {new Date(`${exp.learning_date}T12:00:00`).toLocaleDateString('es-DO')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )) : (
                <EmptySection
                  title="Aún no hay experiencias publicadas"
                  copy="Las experiencias del portafolio se mostrarán aquí después de que el equipo las publique."
                />
              )}
            </div>
          )}

          {/* ── EVIDENCIAS ── */}
          {activeTab === 'evidence' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {evidence.length ? evidence.map((item) => (
                <Card key={item.id} className="border-slate-200/80">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                        <FileCheck2 aria-hidden="true" size={19} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-[#0B2545]">{item.title}</h2>
                        <p className="mt-1 text-xs text-slate-500">{item.description || 'Evidencia académica publicada'}</p>
                        {links[item.id] ? (
                          <a
                            href={links[item.id]}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-blue-800 underline underline-offset-2"
                          >
                            Descargar / Ver evidencia <ArrowRight aria-hidden="true" size={13} />
                          </a>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">Enlace temporal no disponible. Recarga la página.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <EmptySection
                  title="No hay evidencias publicadas"
                  copy="Los archivos asociados a las experiencias aparecerán en esta sección cuando se publiquen."
                />
              )}
            </div>
          )}

          {/* ── REFLEXIÓN PERSONAL ── */}
          {activeTab === 'reflections' && (
            <div className="flex flex-col gap-3">
              {academicReflections.map((ref) => (
                <Card key={ref.id} className="border-slate-200/80">
                  <CardContent className="p-5 sm:p-7">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <MessageSquareQuote aria-hidden="true" size={15} />
                      Reflexión personal publicada
                    </div>
                    <h2 className="mt-3 font-heading text-lg font-bold text-[#0B2545]">
                      {ref.title || 'Reflexión de aprendizaje'}
                    </h2>
                    {ref.content && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{ref.content}</p>}
                    <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                      {([
                        ['¿Qué aprendí?',               ref.what_i_learned],
                        ['¿Cómo fue mi experiencia?',   ref.my_experience],
                        ['¿Qué dificultades encontré?', ref.difficulties],
                        ['¿Qué competencias desarrollé?', ref.skills_developed],
                        ['¿Cómo aplicaré estos conocimientos?', ref.how_i_will_apply],
                        ['Reflexión final',             ref.final_reflection],
                      ] as [string, string][]).filter(([, v]) => Boolean(v)).map(([label, value]) => (
                        <div key={label}>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-800">{label}</h3>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {legacyReflections.map((ref) => (
                <Card key={`legacy-${ref.id}`} className="border-slate-200/80">
                  <CardContent className="p-5 sm:p-7">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <MessageSquareQuote aria-hidden="true" size={15} />
                      Reflexión personal publicada
                    </div>
                    <h2 className="mt-3 font-heading text-lg font-bold text-[#0B2545]">{ref.title}</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{ref.body}</p>
                  </CardContent>
                </Card>
              ))}
              {!academicReflections.length && !legacyReflections.length && (
                <EmptySection
                  title="Aún no hay reflexiones personales publicadas"
                  copy="Las reflexiones individuales vinculadas a esta asignatura aparecerán aquí una vez publicadas."
                />
              )}
            </div>
          )}
        </div>

        <span className="sr-only">
          Sección {sections.findIndex((s) => s.id === activeTab) + 1} de {sections.length}
        </span>
      </section>

      {/* Prev / Next navigation */}
      <nav aria-label="Navegar entre asignaturas" className="mt-8 border-t border-slate-200 pt-5">
        <p className="mb-3 text-center text-xs text-slate-500">
          Asignatura {position} de {COURSE_CODE_ORDER.length} en el pénsum
        </p>
        <div className="flex items-center justify-between gap-4">
          {prevMeta ? (
            <Link
              href={`/asignaturas/${prevMeta.code.toLowerCase()}`}
              className="group flex max-w-[48%] flex-col gap-0.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <ChevronLeft aria-hidden="true" size={14} /> Anterior
              </span>
              <span className="font-semibold text-[#0B2545]">{prevMeta.code}</span>
              <span className="line-clamp-1 text-xs text-slate-500">{prevMeta.name}</span>
            </Link>
          ) : <span />}

          {nextMeta ? (
            <Link
              href={`/asignaturas/${nextMeta.code.toLowerCase()}`}
              className="group flex max-w-[48%] flex-col items-end gap-0.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="flex items-center gap-1 text-xs text-slate-500">
                Siguiente <ChevronRight aria-hidden="true" size={14} />
              </span>
              <span className="font-semibold text-[#0B2545]">{nextMeta.code}</span>
              <span className="line-clamp-1 text-right text-xs text-slate-500">{nextMeta.name}</span>
            </Link>
          ) : <span />}
        </div>
      </nav>
    </main>
  )
}
