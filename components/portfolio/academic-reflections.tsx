'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { BookOpen, Check, Clock3, MessageSquareQuote, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course, Participant } from '@/lib/portfolio/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

type SectionKey = 'course' | 'final_summary' | 'final_pedagogy' | 'final_ethics' | 'final_individual'
type AcademicReflection = { id: string; section_key: SectionKey; course_id: string | null; participant_id: string | null; author_id: string; title: string; content: string; learning_acquired: string; practical_application: string; difficulties: string; status: 'draft' | 'published'; updated_at: string }
type Draft = Pick<AcademicReflection, 'title' | 'content' | 'learning_acquired' | 'practical_application' | 'difficulties' | 'status'>
const supabase = createClient()
const emptyDraft: Draft = { title: '', content: '', learning_acquired: '', practical_application: '', difficulties: '', status: 'draft' }
const finalSections: Array<{ key: Extract<SectionKey, 'final_summary' | 'final_pedagogy' | 'final_ethics'>; title: string; prompt: string }> = [
  { key: 'final_summary', title: 'A. Síntesis del Trayecto Formativo', prompt: 'Reflexión grupal sobre la formación durante los cuatro trimestres.' },
  { key: 'final_pedagogy', title: 'B. Evolución Pedagógica y Didáctica en Informática', prompt: 'Análisis de la evolución de los conocimientos y las competencias docentes.' },
  { key: 'final_ethics', title: 'C. Compromiso Ético y Profesional', prompt: 'Responsabilidad, ética, inclusión y ejercicio profesional.' },
]
const readableDate = (value: string) => new Intl.DateTimeFormat('es-DO', { dateStyle: 'long' }).format(new Date(value))

function useAcademicReflections(key: string) {
  return useSWR<AcademicReflection[]>(key, async () => {
    const { data, error } = await supabase.from('portfolio_academic_reflections').select('*').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []) as AcademicReflection[]
  })
}

async function saveReflection(sectionKey: SectionKey, values: Draft, scope: { course_id?: string; participant_id?: string }) {
  const query = supabase.from('portfolio_academic_reflections').select('id').eq('section_key', sectionKey)
  if (scope.course_id) query.eq('course_id', scope.course_id)
  else query.is('course_id', null)
  if (scope.participant_id) query.eq('participant_id', scope.participant_id)
  else query.is('participant_id', null)
  const { data: existing, error: lookupError } = await query.maybeSingle()
  if (lookupError) throw lookupError
  const payload = { section_key: sectionKey, ...scope, ...values }
  const result = existing
    ? await supabase.from('portfolio_academic_reflections').update(payload).eq('id', existing.id)
    : await supabase.from('portfolio_academic_reflections').insert(payload)
  if (result.error) throw result.error
}

function ReflectionEditor({ sectionKey, participantId, courseId, initial, heading, description, compact = false, onSaved }: { sectionKey: SectionKey; participantId: string | null; courseId: string | null; initial?: AcademicReflection; heading: string; description: string; compact?: boolean; onSaved: () => Promise<unknown> }) {
  const [draft, setDraft] = useState<Draft>(() => initial ? { title: initial.title, content: initial.content, learning_acquired: initial.learning_acquired, practical_application: initial.practical_application, difficulties: initial.difficulties, status: initial.status } : emptyDraft)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (initial) setDraft({ title: initial.title, content: initial.content, learning_acquired: initial.learning_acquired, practical_application: initial.practical_application, difficulties: initial.difficulties, status: initial.status })
  }, [initial?.id, initial?.updated_at])
  async function submit(status: Draft['status']) {
    if ((!draft.title.trim() || !draft.content.trim()) && status === 'published') { toast.error('Añade un título y el contenido antes de publicar.'); return }
    setBusy(true)
    try {
      await saveReflection(sectionKey, { ...draft, status }, { ...(courseId ? { course_id: courseId } : {}), ...(participantId ? { participant_id: participantId } : {}) })
      toast.success(status === 'published' ? 'Reflexión publicada.' : 'Borrador guardado.')
      await onSaved()
    } catch { toast.error('No se pudo guardar. Revisa tu conexión y permisos.') }
    finally { setBusy(false) }
  }
  const fields: Array<{ key: keyof Pick<Draft, 'content' | 'learning_acquired' | 'practical_application' | 'difficulties'>; label: string; hint: string }> = [
    { key: 'content', label: 'Reflexión', hint: 'Desarrolla tu reflexión con tus propias palabras.' },
    { key: 'learning_acquired', label: 'Aprendizajes adquiridos', hint: '¿Qué conocimientos o competencias incorporaste?' },
    { key: 'practical_application', label: 'Aplicación práctica', hint: '¿Cómo los integrarás en tu práctica docente?' },
    { key: 'difficulties', label: 'Dificultades encontradas', hint: '¿Qué retos enfrentaste y cómo los abordaste?' },
  ]
  return <Card className="border-slate-200/80 shadow-sm"><CardHeader className={compact ? 'p-4 pb-0' : 'p-5 pb-0'}><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="font-heading text-lg text-[#0B2545]">{heading}</CardTitle><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div><Badge variant={draft.status === 'published' ? 'default' : 'secondary'}>{draft.status === 'published' ? 'Publicado' : 'Borrador'}</Badge></div></CardHeader><CardContent className={compact ? 'p-4' : 'p-5'}><div className="flex flex-col gap-4"><div className="flex flex-col gap-1.5"><Label htmlFor={`title-${sectionKey}-${courseId || participantId || 'group'}`}>Título</Label><Input id={`title-${sectionKey}-${courseId || participantId || 'group'}`} maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Escribe un título para tu reflexión" /></div>{fields.map((field) => <div key={field.key} className="flex flex-col gap-1.5"><Label htmlFor={`${field.key}-${sectionKey}-${courseId || participantId || 'group'}`}>{field.label}</Label><Textarea id={`${field.key}-${sectionKey}-${courseId || participantId || 'group'}`} value={draft[field.key]} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} placeholder={field.hint} maxLength={6000} className={field.key === 'content' ? 'min-h-32' : 'min-h-24'} /></div>)}<div className="flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void submit('draft')}><Save data-icon="inline-start" />{busy ? 'Guardando…' : 'Guardar borrador'}</Button><Button type="button" disabled={busy} onClick={() => void submit('published')}><Check data-icon="inline-start" />Publicar</Button>{initial?.updated_at && <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={14} />Actualizada {readableDate(initial.updated_at)}</span>}</div></div></CardContent></Card>
}

export function ParticipantAcademicReflections({ profile, courses }: { profile: Pick<Participant, 'id' | 'code' | 'full_name'>; courses: Course[] }) {
  const { data: reflections = [], mutate } = useAcademicReflections(`academic-reflections-participant-${profile.id}`)
  const courseReflections = useMemo(() => reflections.filter((item) => item.section_key === 'course'), [reflections])
  const final = reflections.find((item) => item.section_key === 'final_individual' && item.participant_id === profile.id)
  return <div className="mt-8 flex flex-col gap-8"><section className="flex flex-col gap-4"><div><p className="eyebrow">Registro personal</p><h2 className="mt-2 text-xl font-bold text-[#0B2545]">Reflexiones por asignatura</h2><p className="mt-1 text-sm leading-6 text-slate-600">Cada participante gestiona únicamente sus propias reflexiones. Los borradores son privados.</p></div>{courses.map((course) => <ReflectionEditor key={course.id} sectionKey="course" participantId={profile.id} courseId={course.id} initial={courseReflections.find((item) => item.course_id === course.id)} heading={`${course.course_code || `T${course.trimester}`} · ${course.title}`} description="Registra qué aprendiste, cómo lo aplicarás y los retos que encontraste." compact onSaved={() => mutate()} />)}</section><section className="flex flex-col gap-4"><div><p className="eyebrow">Cierre del recorrido</p><h2 className="mt-2 text-xl font-bold text-[#0B2545]">D. Reflexión Individual Final</h2><p className="mt-1 text-sm leading-6 text-slate-600">Una síntesis personal de tu recorrido. Solo tú y el equipo administrador pueden ver el borrador.</p></div><ReflectionEditor sectionKey="final_individual" participantId={profile.id} courseId={null} initial={final} heading={`Reflexión de ${profile.code}`} description="Recoge los aprendizajes, la evolución de tu práctica y tus compromisos profesionales." onSaved={() => mutate()} /></section></div>
}

export function AdminAcademicReflections({ participants, courses }: { participants: Participant[]; courses: Course[] }) {
  const { data: reflections = [], mutate, error } = useAcademicReflections('academic-reflections-admin')
  const groups = finalSections.map((section) => ({ ...section, record: reflections.find((item) => item.section_key === section.key) }))
  return <div className="flex flex-col gap-9"><section className="flex flex-col gap-4"><div><p className="eyebrow">Reflexión final independiente</p><h3 className="mt-2 text-xl font-bold text-[#0B2545]">Síntesis compartida</h3><p className="mt-1 text-sm leading-6 text-slate-600">Completa y publica las tres reflexiones grupales. No se muestra contenido de ejemplo.</p></div>{error && <p role="alert" className="text-sm text-red-700">No se pudieron cargar las reflexiones académicas.</p>}{groups.map((section) => <ReflectionEditor key={section.key} sectionKey={section.key} participantId={null} courseId={null} initial={section.record} heading={section.title} description={section.prompt} onSaved={() => mutate()} />)}</section><section className="flex flex-col gap-4"><div><p className="eyebrow">Seguimiento del portafolio</p><h3 className="mt-2 text-xl font-bold text-[#0B2545]">Reflexiones por asignatura</h3><p className="mt-1 text-sm leading-6 text-slate-600">Vista de los seis espacios individuales por asignatura; la autoría y los estados se mantienen separados.</p></div>{courses.map((course) => <div key={course.id} className="flex flex-col gap-3"><h4 className="flex items-center gap-2 font-semibold text-[#0B2545]"><BookOpen size={16} />{course.title}</h4><div className="grid gap-3 md:grid-cols-2">{participants.map((participant) => { const reflection = reflections.find((item) => item.section_key === 'course' && item.course_id === course.id && item.participant_id === participant.id); return <article key={participant.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><h5 className="font-semibold text-[#0B2545]">{participant.code} · {participant.full_name || 'Participante'}</h5><Badge variant={reflection?.status === 'published' ? 'default' : 'secondary'}>{reflection ? (reflection.status === 'published' ? 'Publicado' : 'Borrador') : 'Pendiente'}</Badge></div>{reflection ? <><p className="mt-3 text-sm font-medium text-slate-700">{reflection.title || 'Sin título'}</p><p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">{reflection.content || 'Sin contenido todavía.'}</p><p className="mt-3 text-xs text-slate-500">Actualizada {readableDate(reflection.updated_at)}</p></> : <p className="mt-3 text-sm text-slate-500">Aún no hay una reflexión para esta asignatura.</p>}</article> })}</div></div>)}</section><section className="flex flex-col gap-4"><div><p className="eyebrow">Reflexiones individuales finales</p><h3 className="mt-2 text-xl font-bold text-[#0B2545]">D. Espacios personales P1–P6</h3></div><div className="grid gap-3 md:grid-cols-2">{participants.map((participant) => { const reflection = reflections.find((item) => item.section_key === 'final_individual' && item.participant_id === participant.id); return <article key={participant.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><h4 className="font-semibold text-[#0B2545]">{participant.code} · {participant.full_name || 'Participante'}</h4><Badge variant={reflection?.status === 'published' ? 'default' : 'secondary'}>{reflection ? (reflection.status === 'published' ? 'Publicado' : 'Borrador') : 'Pendiente'}</Badge></div>{reflection && <><p className="mt-3 font-medium text-slate-700">{reflection.title}</p><p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">{reflection.content}</p></>}</article> })}</div></section></div>
}

export function PublicAcademicReflections() {
  const { data: reflections = [], isLoading } = useSWR('academic-reflections-public', async () => {
    const { data, error } = await supabase.from('portfolio_academic_reflections').select('id,section_key,course_id,participant_id,author_id,title,content,learning_acquired,practical_application,difficulties,status,updated_at').eq('status', 'published').order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []) as AcademicReflection[]
  })
  const { data: people = [] } = useSWR('academic-reflections-public-people', async () => {
    const { data, error } = await supabase.from('portfolio_participants').select('id,code,full_name')
    if (error) throw error
    return (data || []) as Array<Pick<Participant, 'id' | 'code' | 'full_name'>>
  })
  const group = finalSections.map((section) => ({ ...section, record: reflections.find((item) => item.section_key === section.key) }))
  const individual = reflections.filter((item) => item.section_key === 'final_individual')
  return <div className="flex flex-col gap-8">{isLoading ? <p className="text-sm text-slate-500">Cargando reflexiones publicadas…</p> : <><section className="flex flex-col gap-4"><div><p className="eyebrow">Reflexión final independiente</p><h2 className="mt-2 font-heading text-2xl font-bold text-[#0B2545]">La mirada colectiva del trayecto</h2><p className="mt-1 text-sm leading-6 text-slate-600">Reflexiones compartidas por el equipo, publicadas por administración.</p></div><div className="grid gap-4">{group.map((section) => section.record ? <article key={section.key} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><Badge variant="secondary">Reflexión grupal</Badge><h3 className="mt-4 font-heading text-xl font-bold text-[#0B2545]">{section.record.title || section.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{section.record.content}</p><ReflectionDetails reflection={section.record} /><p className="mt-5 text-xs text-slate-500">Equipo académico · Actualizada {readableDate(section.record.updated_at)}</p></article> : null)}{!group.some((section) => section.record) && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Las reflexiones grupales se mostrarán aquí cuando sean publicadas.</p>}</div></section><section className="flex flex-col gap-4"><div><p className="eyebrow">Voces personales</p><h2 className="mt-2 font-heading text-2xl font-bold text-[#0B2545]">D. Reflexiones Individuales Finales</h2><p className="mt-1 text-sm leading-6 text-slate-600">Cada texto conserva su autoría y se muestra solo después de su publicación.</p></div><div className="grid gap-4 lg:grid-cols-2">{individual.map((reflection) => { const author = people.find((person) => person.id === reflection.participant_id); return <article key={reflection.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><Badge variant="secondary">{author?.code || 'Participante'}</Badge><h3 className="mt-4 font-heading text-lg font-bold text-[#0B2545]">{reflection.title || 'Reflexión final'}</h3><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{reflection.content}</p><ReflectionDetails reflection={reflection} /><p className="mt-5 text-xs text-slate-500">{author?.full_name || author?.code || 'Participante'} · Actualizada {readableDate(reflection.updated_at)}</p></article> })}{!individual.length && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 lg:col-span-2">Las reflexiones individuales aparecerán aquí cuando sus autores las publiquen.</p>}</div></section></>}</div>
}

function ReflectionDetails({ reflection }: { reflection: AcademicReflection }) {
  const details = [['Aprendizajes adquiridos', reflection.learning_acquired], ['Aplicación práctica', reflection.practical_application], ['Dificultades encontradas', reflection.difficulties]].filter(([, value]) => Boolean(value))
  return details.length ? <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">{details.map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">{label}</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{value}</p></div>)}</div> : null
}
