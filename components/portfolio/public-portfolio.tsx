'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, BookOpen, CheckCircle2, Clock3, GraduationCap, Lightbulb, MessageSquareQuote, Search, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course, Evidence, Experience, Participant, Reflection } from '@/lib/portfolio/types'
import { STATUS_LABELS } from '@/lib/portfolio/types'
import { PortfolioSidebar } from './portfolio-sidebar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const supabase = createClient()
type MetricKey = 'hours_theoretical' | 'hours_practical' | 'hours_research_virtual' | 'hours_independent' | 'credits'
type PublicSettings = { institution?: string; program?: string; title?: string; public_intro?: string; pensum_year?: string }
type PortfolioView = 'home' | 'pensum' | 'participants' | 'trimester' | 'reflection'

function usePortfolioData<T>(key: string, table: string, columns: string, filter?: [string, string]) {
  return useSWR<T[]>(key, async () => {
    let query = supabase.from(table).select(columns)
    if (filter) query = query.eq(filter[0], filter[1])
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as T[]
  })
}

function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="max-w-2xl"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-blue-700">{eyebrow}</p><h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-[#0B2545] sm:text-3xl">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></div>
}

function ParticipantCard({ participant }: { participant: Participant }) {
  return <Card className="h-full border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-50 text-sm font-bold text-[#0B2545]">
          {participant.photo_path ? <img src={participant.photo_path} alt={`Fotografía de ${participant.full_name || participant.code}`} className="size-full object-cover" /> : participant.code}
        </div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">Participante {participant.code}</p><h3 className="mt-1 truncate font-semibold text-[#0B2545]">{participant.full_name || 'Perfil por completar'}</h3></div>
      </div>
      <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">{participant.bio || participant.professional_area || 'La biografía y el área profesional se añadirán desde el espacio privado.'}</p>
      {participant.professional_area && <Badge variant="secondary" className="mt-3 max-w-full truncate">{participant.professional_area}</Badge>}
    </CardContent>
  </Card>
}

const statusProgress: Record<Course['status'], number> = { pending: 0, in_progress: 50, review: 80, completed: 100 }

function CourseCard({ course }: { course: Course }) {
  const status = STATUS_LABELS[course.status] || course.status
  const href = `/trimestre/${course.trimester}#course-${course.id}`
  return <Link href={href} id={`course-link-${course.id}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
    <Card id={`course-${course.id}`} className="h-full border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">{course.course_code || `Asignatura ${String(course.course_number).padStart(2, '0')}`}</p><h3 className="mt-2 font-semibold leading-5 text-[#0B2545]">{course.is_placeholder ? 'Título pendiente de confirmar' : course.title}</h3></div><Badge variant={course.status === 'completed' ? 'default' : 'secondary'}>{status}</Badge></div>
        {course.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{course.description}</p>}
        <Separator className="my-4" />
        <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Créditos</span><span className="font-semibold text-slate-700">{course.credits === null || course.credits === undefined ? 'Por confirmar' : course.credits}</span></div>
        <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Progreso</span><span className="text-xs font-semibold text-[#0B2545]">{statusProgress[course.status]}%</span></div>
        <Progress value={statusProgress[course.status]} aria-label={`Progreso de ${course.title}: ${statusProgress[course.status]}%`} className="mt-2 h-1.5" />
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-800">Ver asignatura <ArrowRight aria-hidden="true" size={14} /></span>
      </CardContent>
    </Card>
  </Link>
}

function TermSection({ term, courses }: { term: number; courses: Course[] }) {
  const termCourses = courses.filter((course) => course.trimester === term).sort((a, b) => a.course_number - b.course_number)
  return <section aria-labelledby={`term-${term}`} className="relative">
    <div className="mb-4 flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0B2545] text-xs font-bold text-white">0{term}</span><div><h3 id={`term-${term}`} className="font-heading text-lg font-bold text-[#0B2545]">{['Primer', 'Segundo', 'Tercer', 'Cuarto'][term - 1]} trimestre</h3><p className="text-xs text-slate-500">{termCourses.length} asignaturas</p></div></div>
    {termCourses.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{termCourses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <Card className="border-dashed"><CardContent className="p-6 text-sm text-slate-500">Asignaturas pendientes de registrar.</CardContent></Card>}
  </section>
}

function MetricCard({ label, abbreviation, value, detail, icon: Icon }: { label: string; abbreviation: string; value: string; detail: string; icon: typeof BookOpen }) {
  return <Card className="border-slate-200/80 bg-white shadow-sm"><CardContent className="p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-800"><Icon aria-hidden="true" size={18} /></span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold tracking-wide text-slate-600">{abbreviation}</span></div><p className="mt-4 text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold tracking-tight text-[#0B2545] sm:text-2xl">{value}</p><p className="mt-1 min-h-4 text-[10px] leading-4 text-slate-400">{detail}</p></CardContent></Card>
}

export function PublicPortfolio({ view = 'home', trimester }: { view?: PortfolioView; trimester?: number }) {
  const { data: participants, isLoading: loadingParticipants } = usePortfolioData<Participant>('public-participants', 'portfolio_participants', 'id,code,full_name,professional_area,photo_path,bio,participation_status,joined_at')
  const { data: courses, isLoading: loadingCourses } = usePortfolioData<Course>('public-courses', 'portfolio_courses', 'id,trimester,course_number,course_code,credits,hours_theoretical,hours_practical,hours_research_virtual,hours_independent,title,description,is_placeholder,status')
  const { data: experiences, isLoading: loadingExperiences } = usePortfolioData<Experience>('public-experiences', 'portfolio_experiences', 'id,participant_id,course_id,title,description,learning_date,status,created_at', ['status', 'published'])
  const { data: reflections } = usePortfolioData<Reflection>('public-group-reflection', 'portfolio_reflections', 'id,participant_id,course_id,title,body,reflection_type,status,created_at', ['status', 'published'])
  const { data: evidence } = usePortfolioData<Evidence>('public-evidence', 'portfolio_evidence', 'id,experience_id,title,storage_path,mime_type,file_size,status,created_at', ['status', 'published'])
  const { data: settingsRow } = useSWR('portfolio-public-settings', async () => {
    const { data, error } = await supabase.from('portfolio_settings').select('value').eq('key', 'institution').maybeSingle()
    if (error) throw error
    return (data?.value || {}) as PublicSettings
  })
  const { data: evidenceLinks } = useSWR(evidence?.length ? ['portfolio-public-evidence-links', evidence.map((item) => item.id).join(',')] : null, async () => {
    const links = await Promise.all((evidence || []).map(async (item) => {
      const { data } = await supabase.storage.from('portfolio-evidence').createSignedUrl(item.storage_path, 3600)
      return [item.id, data?.signedUrl || ''] as const
    }))
    return Object.fromEntries(links)
  })

  const people = participants ?? []
  const curriculum = courses ?? []
  const totalCourses = curriculum.length
  const completedCourses = curriculum.filter((course) => course.status === 'completed').length
  const curriculumProgress = totalCourses ? Math.round((completedCourses / totalCourses) * 100) : 0
  const publicSettings = settingsRow
  const institution = publicSettings?.institution || 'Universidad Abierta Para Adultos (UAPA)'
  const program = publicSettings?.program || 'Especialidad en Habilitación Docente en Informática'
  const intro = publicSettings?.public_intro || 'Un recorrido de aprendizaje, práctica y reflexión para transformar la docencia a través de la informática.'
  const year = publicSettings?.pensum_year || '2024'
  const publishedCount = experiences?.length ?? 0
  const groupReflection = reflections?.find((reflection) => reflection.reflection_type === 'group')
  const individualReflections = reflections?.filter((reflection) => reflection.reflection_type === 'individual') ?? []

  const aggregateMetric = (field: MetricKey) => {
    const entered = curriculum.filter((course) => course[field] !== null && course[field] !== undefined)
    const total = entered.reduce((sum, course) => sum + Number(course[field] || 0), 0)
    return { total, entered: entered.length, value: entered.length ? total.toLocaleString('es-DO') : 'Pendiente de confirmar', detail: entered.length ? `${entered.length} de ${totalCourses} asignaturas con dato oficial` : 'Se completa desde Administración' }
  }
  const metrics = [
    { label: 'Horas teóricas', abbreviation: 'HT', result: aggregateMetric('hours_theoretical'), icon: BookOpen },
    { label: 'Horas prácticas', abbreviation: 'HP', result: aggregateMetric('hours_practical'), icon: Lightbulb },
    { label: 'Investigación e interacción virtual', abbreviation: 'HIV', result: aggregateMetric('hours_research_virtual'), icon: Search },
    { label: 'Estudio independiente', abbreviation: 'HI', result: aggregateMetric('hours_independent'), icon: Clock3 },
    { label: 'Créditos', abbreviation: 'CR', result: aggregateMetric('credits'), icon: GraduationCap },
  ]

  const pageInfo: Record<PortfolioView, { eyebrow: string; title: string; description: string }> = {
    home: { eyebrow: 'Portafolio académico digital', title: 'Aprender para enseñar en un mundo digital.', description: intro },
    pensum: { eyebrow: 'Ruta curricular', title: 'Pénsum oficial', description: `Recorrido académico de la ${program}. Los datos curriculares permanecen editables hasta confirmar la fuente oficial.` },
    participants: { eyebrow: 'Comunidad de aprendizaje', title: 'Participantes', description: 'Seis voces, trayectorias y áreas profesionales que construyen juntas una práctica docente más significativa.' },
    trimester: { eyebrow: 'Recorrido académico', title: `${['Primer', 'Segundo', 'Tercer', 'Cuarto'][Math.max(0, (trimester || 1) - 1)]} trimestre`, description: 'Explora asignaturas, su estado actual y el avance curricular asociado a cada una.' },
    reflection: { eyebrow: 'Voces que reflexionan', title: 'Reflexión final independiente', description: 'Ideas y aprendizajes individuales que dan cuenta del trayecto de formación y de la práctica docente.' },
  }
  const heading = pageInfo[view]
  const courseForView = view === 'trimester' ? curriculum.filter((course) => course.trimester === trimester) : curriculum
  const isHome = view === 'home'

  return <div className="min-h-screen bg-[#F6F8FC] text-slate-800 md:flex">
    <PortfolioSidebar completedCourses={completedCourses} totalCourses={totalCourses} loading={loadingCourses} />
    <div className="min-w-0 flex-1 md:ml-[264px]">
      <main className="mx-auto min-h-screen max-w-[1500px] px-4 pb-12 pt-6 sm:px-6 md:px-8 md:pt-9 lg:px-10">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-700">{heading.eyebrow}</p><h1 className="mt-2 max-w-3xl font-heading text-2xl font-bold leading-tight tracking-tight text-[#0B2545] sm:text-3xl">{heading.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{heading.description}</p></div>
          <div className="flex items-center gap-2"><Badge variant="secondary" className="rounded-lg px-3 py-1.5">Pénsum {year}</Badge><Link href="/admin" className="hidden min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-[#0B2545] transition hover:border-blue-200 hover:bg-blue-50 sm:inline-flex"><Users aria-hidden="true" size={15} />Administrar</Link></div>
        </header>

        {isHome && <>
          <section aria-label="Indicadores del pénsum" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {metrics.map(({ label, abbreviation, result, icon }) => <MetricCard key={abbreviation} label={label} abbreviation={abbreviation} value={loadingCourses ? 'Cargando…' : result.value} detail={loadingCourses ? 'Leyendo pénsum oficial' : result.detail} icon={icon} />)}
            <MetricCard label="Asignaturas completadas" abbreviation="CURSO" value={loadingCourses ? 'Cargando…' : `${completedCourses} / ${totalCourses || '—'}`} detail={loadingCourses ? 'Leyendo pénsum oficial' : curriculumProgress ? `${curriculumProgress}% del pénsum` : 'Progreso según estados registrados'} icon={CheckCircle2} />
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
            <Card className="overflow-hidden border-0 bg-[#0B2545] text-white shadow-sm"><CardContent className="relative p-6 sm:p-8"><div aria-hidden="true" className="absolute -right-16 -top-28 size-72 rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -right-5 -top-20 size-52 rounded-full border border-white/10" /><div className="relative"><div className="flex flex-wrap items-center gap-2"><Badge className="border border-blue-200/25 bg-blue-300/10 text-blue-100 hover:bg-blue-300/10">{institution}</Badge><span className="text-xs text-blue-100/65">Pénsum {year}</span></div><p className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-blue-200">{program}</p><h2 className="mt-3 max-w-2xl font-heading text-2xl font-bold leading-tight sm:text-3xl">{publicSettings?.title || 'Portafolio Académico Digital'}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/75">{intro}</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/pensum" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0B2545] transition hover:bg-blue-50">Explorar el pénsum <ArrowRight aria-hidden="true" size={16} /></Link><Link href="/participantes" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:bg-white/10">Conocer participantes</Link></div></div></CardContent></Card>
            <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">Avance curricular</p><h2 className="mt-2 font-heading text-xl font-bold text-[#0B2545]">Tu recorrido, paso a paso</h2></div><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-800"><BookOpen aria-hidden="true" size={19} /></span></div><div className="mt-7 flex items-end justify-between gap-3"><p className="text-3xl font-bold text-[#0B2545]">{curriculumProgress}<span className="ml-1 text-lg">%</span></p><p className="pb-1 text-xs text-slate-500">{loadingCourses ? 'Cargando pénsum…' : `${completedCourses} de ${totalCourses} completadas`}</p></div><Progress value={loadingCourses ? null : curriculumProgress} aria-label={loadingCourses ? 'Cargando progreso curricular' : `Progreso curricular: ${completedCourses} de ${totalCourses} asignaturas completadas`} className="mt-3 h-2" /><Separator className="my-5" /><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-slate-600"><Users aria-hidden="true" size={16} /><span>{loadingParticipants ? 'Cargando directorio…' : `${people.length} participantes`}</span></div><Link href="/participantes" className="text-xs font-semibold text-blue-800 hover:text-blue-950">Ver directorio</Link></div></CardContent></Card>
          </section>

          <section className="mt-10"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><SectionTitle eyebrow="Ruta curricular" title="Cuatro trimestres de crecimiento." copy="Sigue el avance de cada asignatura y consulta el detalle por trimestre." /><Link href="/pensum" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-950">Ver pénsum <ArrowRight aria-hidden="true" size={15} /></Link></div>{loadingCourses ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-40 rounded-2xl" />)}</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((term) => { const termCourses = curriculum.filter((course) => course.trimester === term); const complete = termCourses.filter((course) => course.status === 'completed').length; const percent = termCourses.length ? Math.round(complete / termCourses.length * 100) : 0; return <Link key={term} href={`/trimestre/${term}`} className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"><Card className="h-full border-slate-200/80 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-blue-800">0{term}</span><span className="text-xs text-slate-400">{loadingCourses ? 'Cargando…' : `${termCourses.length} asignaturas`}</span></div><h3 className="mt-4 font-semibold text-[#0B2545]">{['Primer', 'Segundo', 'Tercer', 'Cuarto'][term - 1]} trimestre</h3><p className="mt-1 text-xs text-slate-500">{loadingCourses ? 'Leyendo pénsum…' : `${complete} completadas`}</p><Progress value={loadingCourses ? null : percent} aria-label={loadingCourses ? 'Cargando avance del trimestre' : `${percent}% completado`} className="mt-3 h-1.5" /></CardContent></Card></Link> })}</div>}</section>

          <section className="mt-10"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><SectionTitle eyebrow="Comunidad de aprendizaje" title="Seis perspectivas, una comunidad." copy="Conoce a las personas que forman parte de este recorrido académico." /><Link href="/participantes" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800 hover:text-blue-950">Ver participantes <ArrowRight aria-hidden="true" size={15} /></Link></div>{loadingParticipants ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-44 rounded-2xl" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{people.slice(0, 3).map((participant) => <ParticipantCard key={participant.id} participant={participant} />)}{!people.length && <Card className="border-dashed sm:col-span-2 xl:col-span-3"><CardContent className="p-8 text-center text-sm text-slate-500">Los perfiles aparecerán aquí cuando sean completados y publicados.</CardContent></Card>}</div>}</section>

          <section className="mt-10 grid gap-5 lg:grid-cols-2"><Card className="border-slate-200/80 shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-800"><BookOpen aria-hidden="true" size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">Aprendizajes en acción</p><h2 className="mt-1 font-heading text-lg font-bold text-[#0B2545]">Experiencias publicadas</h2></div><Badge variant="secondary" className="ml-auto">{publishedCount}</Badge></div>{loadingExperiences ? <Skeleton className="mt-5 h-20 rounded-xl" /> : <div className="mt-5 flex flex-col gap-3">{(experiences || []).slice(0, 2).map((experience) => <article key={experience.id} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{people.find((person) => person.id === experience.participant_id)?.code || 'Participante'}</p><h3 className="mt-1 font-semibold text-[#0B2545]">{experience.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{experience.description}</p>{(evidence || []).filter((item) => item.experience_id === experience.id).map((item) => evidenceLinks?.[item.id] ? <a key={item.id} href={evidenceLinks[item.id]} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-800">{item.title}<ArrowRight aria-hidden="true" size={13} /></a> : null)}</article>)}{!experiences?.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aún no se han publicado experiencias.</p>}</div>}</CardContent></Card>
            <Card className="border-slate-200/80 shadow-sm"><CardContent className="p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800"><MessageSquareQuote aria-hidden="true" size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-700">Voces que reflexionan</p><h2 className="mt-1 font-heading text-lg font-bold text-[#0B2545]">Reflexión del equipo</h2></div></div><h3 className="mt-5 font-semibold text-[#0B2545]">{groupReflection?.title || 'La reflexión final del equipo está en construcción.'}</h3><p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">{groupReflection?.body || 'Este espacio reunirá la mirada colectiva sobre el camino recorrido, los aprendizajes construidos y los compromisos que acompañarán la práctica docente.'}</p><Link href="/reflexion" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-800">Ver reflexión final <ArrowRight aria-hidden="true" size={14} /></Link></CardContent></Card>
          </section>
        </>}

        {view === 'pensum' && <section><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-600">{loadingCourses ? 'Cargando pénsum oficial…' : `${completedCourses} de ${totalCourses} asignaturas completadas`}</p><Progress value={loadingCourses ? null : curriculumProgress} aria-label={loadingCourses ? 'Cargando progreso curricular' : `Progreso total ${curriculumProgress}%`} className="mt-3 h-2 max-w-md" /></div><Badge variant="secondary" className="rounded-lg px-3 py-1.5">{loadingCourses ? 'Cargando…' : `${totalCourses} asignaturas registradas`}</Badge></div>{loadingCourses ? <div className="grid gap-8">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-64 rounded-2xl" />)}</div> : <div className="relative flex flex-col gap-9 before:absolute before:bottom-4 before:left-5 before:top-5 before:w-px before:bg-blue-100 sm:before:left-[19px]">{[1,2,3,4].map((term) => <TermSection key={term} term={term} courses={curriculum} />)}</div>}</section>}

        {view === 'trimester' && <section><div className="mb-6 flex items-center justify-between gap-4"><p className="text-sm text-slate-600">{loadingCourses ? 'Cargando pénsum…' : `${courseForView.length} asignaturas en este período`}</p><Link href="/pensum" className="text-sm font-semibold text-blue-800 hover:text-blue-950">Ver los cuatro trimestres</Link></div>{loadingCourses ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-56 rounded-2xl" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{courseForView.sort((a, b) => a.course_number - b.course_number).map((course) => <CourseCard key={course.id} course={course} />)}{!courseForView.length && <Card className="border-dashed sm:col-span-2 xl:col-span-3"><CardContent className="p-8 text-sm text-slate-500">No hay asignaturas registradas para este trimestre.</CardContent></Card>}</div>}</section>}

        {view === 'participants' && <section>{loadingParticipants ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <Skeleton key={item} className="h-48 rounded-2xl" />)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{people.map((participant) => <ParticipantCard key={participant.id} participant={participant} />)}{!people.length && <Card className="border-dashed sm:col-span-2 xl:col-span-3"><CardContent className="p-10 text-center"><Users aria-hidden="true" className="mx-auto text-slate-400" /><p className="mt-3 font-medium text-slate-700">Los perfiles del equipo estarán disponibles próximamente.</p></CardContent></Card>}</div>}<p className="mt-5 text-xs leading-5 text-slate-500">La matrícula y el correo de contacto se mantienen privados y solo están disponibles en el espacio de administración.</p></section>}

        {view === 'reflection' && <section className="flex flex-col gap-4">{individualReflections.length ? individualReflections.map((reflection) => <Card key={reflection.id} className="border-slate-200/80 bg-white shadow-sm"><CardContent className="p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><Badge variant="secondary">Reflexión individual</Badge><span className="text-xs text-slate-500">{people.find((person) => person.id === reflection.participant_id)?.code || 'Participante'}</span></div><h2 className="mt-5 font-heading text-xl font-bold text-[#0B2545]">{reflection.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{reflection.body}</p></CardContent></Card>) : <Card className="border-dashed"><CardContent className="p-10 text-center"><MessageSquareQuote aria-hidden="true" className="mx-auto text-slate-400" /><h2 className="mt-4 font-semibold text-[#0B2545]">La reflexión individual está en construcción.</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Cuando se publique una reflexión, aparecerá en esta página. Los borradores permanecen privados para sus autores y el equipo administrador.</p></CardContent></Card>}</section>}

        <footer className="mt-12 border-t border-slate-200 pt-5 text-xs text-slate-500"><div className="flex flex-wrap items-center justify-between gap-3"><span>{institution} · {program}</span><Link href="/admin" className="inline-flex items-center gap-1 font-medium text-blue-800 hover:text-blue-950">Administrar contenido <ArrowRight aria-hidden="true" size={13} /></Link></div></footer>
      </main>
    </div>
  </div>
}
