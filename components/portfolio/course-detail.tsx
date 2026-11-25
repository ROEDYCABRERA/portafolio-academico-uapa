'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, BookOpen, ClipboardList, FileCheck2, MessageSquareQuote, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course, Evidence, Experience, Reflection } from '@/lib/portfolio/types'
import { STATUS_LABELS } from '@/lib/portfolio/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const supabase = createClient()
const sections = [
  { id: 'overview', label: 'Descripción', icon: BookOpen },
  { id: 'experiences', label: 'Experiencias', icon: ClipboardList },
  { id: 'evidence', label: 'Evidencias', icon: FileCheck2 },
  { id: 'reflections', label: 'Reflexión personal', icon: MessageSquareQuote },
] as const

type Tab = (typeof sections)[number]['id']

export function CourseDetail({ courseId }: { courseId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const { data: courseOrder = [] } = useSWR('course-navigation', async () => {
    const { data, error } = await supabase.from('portfolio_courses').select('id,course_number').order('course_number')
    if (error) throw error
    return data || []
  })
  const { data: course, isLoading } = useSWR(['course-detail', courseId], async () => {
    const { data, error } = await supabase.from('portfolio_courses').select('*').eq('id', courseId).maybeSingle()
    if (error) throw error
    return data as Course | null
  })
  const { data: experiences = [] } = useSWR(courseId ? ['course-experiences', courseId] : null, async () => {
    const { data, error } = await supabase.from('portfolio_experiences').select('id,participant_id,course_id,title,description,learning_date,status,created_at').eq('course_id', courseId).eq('status', 'published').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Experience[]
  })
  const { data: reflections = [] } = useSWR(courseId ? ['course-reflections', courseId] : null, async () => {
    const { data, error } = await supabase.from('portfolio_reflections').select('id,participant_id,course_id,title,body,reflection_type,status,created_at').eq('course_id', courseId).eq('reflection_type', 'individual').eq('status', 'published').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Reflection[]
  })
  const experienceIds = experiences.map((experience) => experience.id)
  const { data: evidence = [] } = useSWR(experienceIds.length ? ['course-evidence', experienceIds.join(',')] : null, async () => {
    const { data, error } = await supabase.from('portfolio_evidence').select('id,experience_id,title,description,storage_path,mime_type,file_size,status').in('experience_id', experienceIds).eq('status', 'published')
    if (error) throw error
    return (data || []) as Evidence[]
  })
  const { data: links = {} } = useSWR(evidence.length ? ['course-evidence-links', evidence.map((item) => item.id).join(',')] : null, async () => {
    const signedLinks = await Promise.all(evidence.map(async (item) => {
      const { data } = await supabase.storage.from('portfolio-evidence').createSignedUrl(item.storage_path, 3600)
      return [item.id, data?.signedUrl || ''] as const
    }))
    return Object.fromEntries(signedLinks) as Record<string, string>
  })

  if (isLoading) return <main className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-52 rounded-2xl" /></main>
  if (!course) return <main className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold text-[#0B2545]">No encontramos esta asignatura</h1><Link href="/pensum" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800"><ArrowLeft aria-hidden="true" size={16} />Volver al pénsum</Link></main>

  const activeIndex = sections.findIndex((section) => section.id === activeTab)
  const courseIndex = courseOrder.findIndex((item) => item.id === course.id)
  const previousCourse = courseOrder[courseIndex - 1]
  const nextCourse = courseOrder[courseIndex + 1]
  const courseEvidence = evidence

  return <main className="mx-auto max-w-5xl px-4 pb-14 pt-7 sm:px-6 md:px-8">
    <Link href={`/trimestre/${course.trimester}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950"><ArrowLeft aria-hidden="true" size={16} />Volver al trimestre {course.trimester}</Link>
    <header className="mt-5 rounded-3xl bg-[#0B2545] p-6 text-white shadow-sm sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-200">{course.course_code || `Asignatura ${String(course.course_number).padStart(2, '0')}`} · Trimestre {course.trimester}</p><h1 className="mt-3 font-heading text-2xl font-bold leading-tight sm:text-3xl">{course.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/80">{course.description || 'Consulta la información curricular, los aprendizajes publicados y las reflexiones personales asociadas a esta asignatura.'}</p></div><Badge variant={course.status === 'completed' ? 'default' : 'secondary'} className="border-white/15 px-3 py-1.5">{STATUS_LABELS[course.status] || course.status}</Badge></div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{[['Créditos', course.credits], ['HT', course.hours_theoretical], ['HP', course.hours_practical], ['HIV', course.hours_research_virtual], ['HI', course.hours_independent]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[.06] p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-100/60">{label}</p><p className="mt-1 text-lg font-bold">{value ?? '—'}</p></div>)}</div>
      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-4 text-sm"><p><span className="text-blue-100/60">Prerrequisito:</span> <span className="font-medium">{course.prerequisite || 'No especificado'}</span></p><p><span className="text-blue-100/60">Facilitador/a:</span> <span className="font-medium">{course.facilitator || 'Por asignar'}</span></p></div>
    </header>

    <section className="mt-6" aria-label="Contenido de la asignatura">
      <div role="tablist" aria-label="Secciones de la asignatura" className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-4">{sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" id={`tab-${id}`} role="tab" aria-selected={activeTab === id} aria-controls={`panel-${id}`} tabIndex={activeTab === id ? 0 : -1} onClick={() => setActiveTab(id)} onKeyDown={(event) => { const current = sections.findIndex((section) => section.id === activeTab); const next = event.key === 'ArrowRight' ? (current + 1) % sections.length : event.key === 'ArrowLeft' ? (current - 1 + sections.length) % sections.length : event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : current; if (next !== current) { event.preventDefault(); const nextSection = sections[next]; setActiveTab(nextSection.id); document.getElementById(`tab-${nextSection.id}`)?.focus() } }} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${activeTab === id ? 'bg-[#0B2545] text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Icon aria-hidden="true" size={16} /><span>{label}</span></button>)}</div>
      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} tabIndex={0} className="mt-4 focus-visible:outline-2 focus-visible:outline-blue-700">
        {activeTab === 'overview' && <div className="grid gap-4 md:grid-cols-2"><Card className="border-slate-200/80"><CardContent className="flex gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800"><ClipboardList aria-hidden="true" size={19} /></span><div><h2 className="font-semibold text-[#0B2545]">Asignatura prerrequisito</h2><p className="mt-1 text-sm leading-6 text-slate-600">{course.prerequisite || 'No especificado'}</p></div></CardContent></Card><Card className="border-slate-200/80"><CardContent className="flex gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-800"><UserRound aria-hidden="true" size={19} /></span><div><h2 className="font-semibold text-[#0B2545]">Facilitador/a</h2><p className="mt-1 text-sm leading-6 text-slate-600">{course.facilitator || 'Por asignar'}</p></div></CardContent></Card><Card className="border-slate-200/80 md:col-span-2"><CardContent className="p-5"><h2 className="font-semibold text-[#0B2545]">Propósito de aprendizaje</h2><p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{course.description || 'La descripción específica de la asignatura será incorporada por el equipo académico.'}</p></CardContent></Card></div>}
        {activeTab === 'experiences' && <div className="flex flex-col gap-3">{experiences.length ? experiences.map((experience) => <Card key={experience.id} className="border-slate-200/80"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Experiencia de aprendizaje</p><h2 className="mt-2 font-semibold text-[#0B2545]">{experience.title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{experience.description}</p>{experience.learning_date && <p className="mt-3 text-xs text-slate-500">{new Date(`${experience.learning_date}T12:00:00`).toLocaleDateString('es-DO')}</p>}</CardContent></Card>) : <EmptySection title="Aún no hay experiencias publicadas" copy="Las experiencias del portafolio se mostrarán aquí después de que el equipo las publique." />}</div>}
        {activeTab === 'evidence' && <div className="grid gap-3 sm:grid-cols-2">{courseEvidence.length ? courseEvidence.map((item) => <Card key={item.id} className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><FileCheck2 aria-hidden="true" size={19} /></span><div className="min-w-0"><h2 className="font-semibold text-[#0B2545]">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.description || 'Evidencia académica publicada'}</p>{links[item.id] ? <a href={links[item.id]} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 items-center text-xs font-semibold text-blue-800 underline underline-offset-2">Abrir evidencia</a> : <p className="mt-3 text-xs text-slate-500">Enlace temporal no disponible. Vuelve a cargar la página.</p>}</div></div></CardContent></Card>) : <EmptySection title="No hay evidencias publicadas" copy="Los archivos asociados a las experiencias aparecerán en esta sección cuando se publiquen." />}</div>}
        {activeTab === 'reflections' && <div className="flex flex-col gap-3">{reflections.length ? reflections.map((reflection) => <Card key={reflection.id} className="border-slate-200/80"><CardContent className="p-5 sm:p-7"><div className="flex items-center gap-2 text-xs font-semibold text-amber-800"><MessageSquareQuote aria-hidden="true" size={15} />Reflexión personal publicada</div><h2 className="mt-3 font-heading text-lg font-bold text-[#0B2545]">{reflection.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{reflection.body}</p></CardContent></Card>) : <EmptySection title="Aún no hay reflexiones personales publicadas" copy="Las reflexiones individuales vinculadas a esta asignatura aparecerán aquí una vez publicadas." />}</div>}
      </div>
      <span className="sr-only">Sección {activeIndex + 1} de {sections.length}</span>
    </section>
    <nav aria-label="Navegar entre asignaturas" className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
      {previousCourse ? <Link href={`/asignatura/${previousCourse.id}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950"><ArrowLeft aria-hidden="true" size={16} />Asignatura anterior</Link> : <span />}
      {nextCourse ? <Link href={`/asignatura/${nextCourse.id}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950">Siguiente asignatura <ArrowLeft aria-hidden="true" size={16} className="rotate-180" /></Link> : <span />}
    </nav>
  </main>
}

function EmptySection({ title, copy }: { title: string; copy: string }) {
  return <Card className="border-dashed"><CardContent className="p-9 text-center"><BookOpen aria-hidden="true" className="mx-auto text-slate-400" /><h2 className="mt-3 font-semibold text-[#0B2545]">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{copy}</p></CardContent></Card>
}
