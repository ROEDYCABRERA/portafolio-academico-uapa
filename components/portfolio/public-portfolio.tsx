'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { Course, Evidence, Experience, Participant, Reflection } from '@/lib/portfolio/types'
import { ArrowDown, ArrowRight, BookOpen, GraduationCap, Layers3, LockKeyhole, Quote, Sparkles, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const supabase = createClient()

function usePortfolioData<T>(key: string, table: string, columns: string, filter?: [string, string]) {
  return useSWR<T[]>(key, async () => {
    let query = supabase.from(table).select(columns)
    if (filter) query = query.eq(filter[0], filter[1])
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as T[]
  })
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="max-w-2xl"><p className="eyebrow">{eyebrow}</p><h2 className="section-title mt-3">{title}</h2><p className="mt-3 leading-7 text-slate-600">{copy}</p></div>
}

function DirectorySkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-52 rounded-2xl" />)}</div>
}

export function PublicPortfolio() {
  const { data: participants, isLoading: loadingParticipants } = usePortfolioData<Participant>('public-participants', 'portfolio_participants', 'id,code,full_name,professional_area,photo_path,bio,participation_status,joined_at')
  const { data: courses, isLoading: loadingCourses } = usePortfolioData<Course>('public-courses', 'portfolio_courses', 'id,trimester,course_number,title,description,is_placeholder,status')
  const { data: experiences, isLoading: loadingExperiences } = usePortfolioData<Experience>('public-experiences', 'portfolio_experiences', 'id,participant_id,course_id,title,description,learning_date,status,created_at', ['status', 'published'])
  const { data: reflections } = usePortfolioData<Reflection>('public-group-reflection', 'portfolio_reflections', 'id,participant_id,course_id,title,body,reflection_type,status,created_at', ['status', 'published'])
  const { data: evidence } = usePortfolioData<Evidence>('public-evidence', 'portfolio_evidence', 'id,experience_id,title,storage_path,mime_type,file_size,status,created_at', ['status', 'published'])
  const { data: publicSettings } = useSWR<{ institution?: string; program?: string; title?: string; public_intro?: string }>('portfolio-public-settings', async () => {
    const { data, error } = await supabase.rpc('portfolio_public_settings')
    if (error) throw error
    return (data || {}) as { institution?: string; program?: string; title?: string; public_intro?: string }
  })
  const { data: evidenceLinks } = useSWR(evidence?.length ? ['portfolio-public-evidence-links', evidence.map((item) => item.id).join(',')] : null, async () => {
    const links = await Promise.all((evidence || []).map(async (item) => {
      const { data } = await supabase.storage.from('portfolio-evidence').createSignedUrl(item.storage_path, 3600)
      return [item.id, data?.signedUrl || ''] as const
    }))
    return Object.fromEntries(links)
  })

  const publicParticipants = participants ?? []
  const courseList = courses ?? []
  const courseCount = courseList.length
  const publishedCount = experiences?.length ?? 0
  const latestReflection = reflections?.find((reflection) => reflection.reflection_type === 'group')

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Portafolio UAPA, inicio">
            <span className="grid size-11 place-items-center rounded-xl bg-[#0B2545] text-white"><GraduationCap aria-hidden="true" /></span>
            <span><span className="block text-sm font-bold tracking-tight text-[#0B2545]">PORTAFOLIO UAPA</span><span className="hidden text-xs text-slate-500 sm:block">Habilitación Docente en Informática</span></span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Navegación principal">
            <a href="#programa" className="transition hover:text-blue-700">El programa</a><a href="#pensum" className="transition hover:text-blue-700">Pénsum</a><a href="#participantes" className="transition hover:text-blue-700">Participantes</a><a href="#evidencias" className="transition hover:text-blue-700">Aprendizajes</a>
          </nav>
          <Link href="/admin" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0B2545] px-5 text-sm font-medium text-white transition hover:bg-[#143B68]"><LockKeyhole size={16} />Acceso privado</Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#0B2545] text-white">
        <div className="absolute -right-24 -top-36 size-[32rem] rounded-full border border-white/10" aria-hidden="true" /><div className="absolute -right-8 -top-20 size-[24rem] rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1.2fr_0.8fr] md:items-center md:py-28 lg:px-8">
          <div>
            <Badge className="border border-blue-200/25 bg-blue-300/10 text-blue-100 hover:bg-blue-300/10">{publicSettings?.institution || 'UNIVERSIDAD ABIERTA PARA ADULTOS'}</Badge>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">Portafolio académico digital</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">{publicSettings?.title || 'Aprender para enseñar en un mundo digital.'}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/80">{publicSettings?.public_intro || `Un recorrido compartido de formación, práctica y reflexión en la ${publicSettings?.program || 'Especialidad en Habilitación Docente en Informática'}.`}</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="#pensum" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#0B2545] transition hover:bg-blue-50">Explorar el portafolio <ArrowDown size={16} /></a><a href="#participantes" className="inline-flex h-11 items-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-medium text-white transition hover:bg-white/10">Conocer al equipo</a></div>
            <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-blue-100/75"><span className="flex items-center gap-2"><Users size={17} /> Seis voces, un trayecto</span><span className="flex items-center gap-2"><BookOpen size={17} /> Cuatro trimestres</span></div>
          </div>
          <Card className="border-white/10 bg-white/[0.06] text-white shadow-2xl shadow-black/10 backdrop-blur">
            <CardContent className="p-7 sm:p-8">
              <div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-blue-300/15 text-blue-100"><Sparkles /></span><span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Nuestro recorrido</span></div>
              <h2 className="mt-8 text-2xl font-semibold">Del conocimiento a la práctica docente.</h2><p className="mt-3 leading-7 text-blue-100/75">Cada asignatura abre nuevas preguntas, experiencias y oportunidades para construir una educación más significativa.</p>
              <Separator className="my-7 bg-white/15" />
              <div className="grid grid-cols-3 gap-4"><div><p className="text-3xl font-semibold">4</p><p className="mt-1 text-xs text-blue-100/65">trimestres</p></div><div><p className="text-3xl font-semibold">{courseCount || '11'}</p><p className="mt-1 text-xs text-blue-100/65">asignaturas</p></div><div><p className="text-3xl font-semibold">6</p><p className="mt-1 text-xs text-blue-100/65">participantes</p></div></div>
              {loadingCourses && <span className="sr-only">Cargando pénsum desde la base de datos</span>}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="programa" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start"><SectionHeading eyebrow="La experiencia" title="Una formación que conecta saber y hacer." copy="Este portafolio documenta el avance del equipo a lo largo de la Especialidad en Habilitación Docente en Informática, reuniendo experiencias, evidencias y reflexiones que dan cuenta del aprendizaje." />
          <div className="grid gap-4 sm:grid-cols-2"><Card className="border-slate-200/80 bg-white shadow-sm"><CardContent className="p-6"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><BookOpen /></span><h3 className="mt-5 font-semibold text-[#0B2545]">Aprendizaje situado</h3><p className="mt-2 text-sm leading-6 text-slate-600">Experiencias vinculadas a los retos reales de la docencia y la tecnología.</p></CardContent></Card><Card className="border-slate-200/80 bg-white shadow-sm"><CardContent className="p-6"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Layers3 /></span><h3 className="mt-5 font-semibold text-[#0B2545]">Evidencias con propósito</h3><p className="mt-2 text-sm leading-6 text-slate-600">Producciones y recursos que muestran el desarrollo de competencias.</p></CardContent></Card></div>
        </div>
      </section>

      <section id="pensum" className="scroll-mt-24 bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><SectionHeading eyebrow="Ruta curricular" title="Cuatro trimestres de crecimiento." copy="El pénsum oficial puede incorporarse desde el panel privado. Los títulos pendientes se mantienen como marcadores editables, sin inventar asignaturas." /><span className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">{courseCount} asignaturas registradas</span></div>
          {loadingCourses ? <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-56 rounded-2xl" />)}</div> : <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((term) => { const items = courseList.filter((course) => course.trimester === term).sort((a,b) => a.course_number-b.course_number); return <Card key={term} className="border-slate-200/80 shadow-sm"><CardContent className="p-6"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">TRIMESTRE 0{term}</span><span className="text-xs text-slate-400">{items.length} asignaturas</span></div><div className="mt-6 flex flex-col gap-3">{items.map((course) => <div key={course.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Asignatura {String(course.course_number).padStart(2,'0')}</p><p className="mt-1 text-sm font-medium leading-5 text-slate-800">{course.is_placeholder ? 'Título pendiente de confirmar' : course.title}</p></div>)}{items.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Asignaturas pendientes de registrar.</p>}</div></CardContent></Card> })}</div>}
        </div>
      </section>

      <section id="participantes" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24"><div className="flex flex-wrap items-end justify-between gap-6"><SectionHeading eyebrow="Comunidad de aprendizaje" title="Seis perspectivas, una comunidad." copy="El directorio se completa de manera colaborativa. Los perfiles se mostrarán aquí cuando el equipo publique su información." /><Badge variant="secondary" className="rounded-full px-4 py-2">{publicParticipants.length} perfiles públicos</Badge></div>
        {loadingParticipants ? <div className="mt-9"><DirectorySkeleton /></div> : <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{publicParticipants.map((person) => <Card key={person.id} className="border-slate-200/80 bg-white shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-50 text-lg font-bold text-[#0B2545]">{person.photo_path ? <img src={person.photo_path} alt={`Fotografía de ${person.full_name || person.code}`} className="size-full object-cover" /> : person.code}</div><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Participante {person.code}</p><h3 className="mt-1 font-semibold">{person.full_name || 'Perfil por completar'}</h3></div></div><p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{person.bio || person.professional_area || 'La biografía y el área profesional se añadirán desde el espacio de administración.'}</p></CardContent></Card>)}{publicParticipants.length === 0 && <Card className="col-span-full border-dashed bg-white"><CardContent className="p-10 text-center"><Users className="mx-auto text-slate-400" /><p className="mt-3 font-medium text-slate-700">Los perfiles del equipo estarán disponibles próximamente.</p><p className="mt-1 text-sm text-slate-500">Se mostrarán aquí cuando sean compartidos públicamente.</p></CardContent></Card>}</div>}
      </section>

      <section id="evidencias" className="scroll-mt-24 bg-[#EFF5FB] py-20 lg:py-24"><div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_0.8fr] md:items-center lg:px-8"><SectionHeading eyebrow="Aprendizajes en acción" title="Cada evidencia cuenta una historia." copy="Las experiencias y reflexiones aparecen en este espacio una vez revisadas y publicadas por el equipo. Los borradores permanecen en el área privada." /><Card className="border-blue-100 bg-white shadow-sm"><CardContent className="flex items-start gap-4 p-6"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><BookOpen /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#0B2545]">Experiencias publicadas</h3><Badge variant="secondary">{publishedCount}</Badge></div>{loadingExperiences ? <Skeleton className="mt-3 h-14 w-full" /> : <p className="mt-2 text-sm leading-6 text-slate-600">{publishedCount ? `${publishedCount} experiencias de aprendizaje compartidas por el equipo.` : 'Aún no se han publicado experiencias. Los contenidos aparecerán aquí cuando estén listos para compartir.'}</p>}<a href="#reflexion" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">Leer reflexión del equipo <ArrowRight size={16} /></a></div></CardContent></Card></div></section>

      <section aria-label="Experiencias publicadas" className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24"><SectionHeading eyebrow="Archivo de aprendizajes" title="Experiencias compartidas." copy="Una selección de aportes revisados y publicados por el equipo." />{loadingExperiences?<div className="mt-6 grid gap-4 md:grid-cols-2"><Skeleton className="h-44 rounded-2xl"/><Skeleton className="h-44 rounded-2xl"/></div>:<div className="mt-6 grid gap-4 md:grid-cols-2">{(experiences||[]).map((experience)=><Card key={experience.id} className="border-slate-200/80 bg-white shadow-sm"><CardContent className="p-6"><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{publicParticipants.find((person)=>person.id===experience.participant_id)?.full_name||publicParticipants.find((person)=>person.id===experience.participant_id)?.code||'Participante'} · {courseList.find((course)=>course.id===experience.course_id)?.title||'Experiencia de aprendizaje'}</p><h3 className="mt-3 text-lg font-semibold text-[#0B2545]">{experience.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{experience.description}</p>{(evidence||[]).filter((item)=>item.experience_id===experience.id).length>0&&<div className="mt-5 flex flex-wrap gap-2">{(evidence||[]).filter((item)=>item.experience_id===experience.id).map((item)=>evidenceLinks?.[item.id]?<a key={item.id} href={evidenceLinks[item.id]} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100">{item.title}<ArrowRight size={14}/></a>:null)}</div>}</CardContent></Card>)}{!experiences?.length&&<Card className="border-dashed md:col-span-2"><CardContent className="p-8 text-center text-sm text-slate-500">Las experiencias aparecerán aquí cuando se publiquen.</CardContent></Card>}</div>}</section>

      <section id="reflexion" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24"><div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:items-start"><div><p className="eyebrow">Voces que reflexionan</p><h2 className="section-title mt-3">Pensar la práctica también es aprender.</h2></div><Card className="border-slate-200/80 bg-white shadow-sm"><CardContent className="p-7 sm:p-9"><Quote className="text-blue-700" size={27} /><h3 className="mt-5 text-xl font-semibold text-[#0B2545]">{latestReflection?.title || 'La reflexión final del equipo está en construcción.'}</h3><p className="mt-3 whitespace-pre-line leading-7 text-slate-600">{latestReflection?.body || 'Este espacio reunirá la mirada colectiva sobre el camino recorrido, los aprendizajes construidos y los compromisos que acompañarán la práctica docente.'}</p><p className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-400">Reflexión final grupal</p></CardContent></Card></div></section>

      <footer className="bg-[#0B2545] text-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-5 py-9 sm:flex-row sm:items-center lg:px-8"><div><p className="font-semibold">{publicSettings?.institution || 'Universidad Abierta Para Adultos · UAPA'}</p><p className="mt-1 text-sm text-blue-100/70">{publicSettings?.program || 'Especialidad en Habilitación Docente en Informática'}</p></div><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-blue-100/80 hover:text-white">Administrar contenido <ArrowRight size={16} /></Link></div></footer>
    </main>
  )
}
