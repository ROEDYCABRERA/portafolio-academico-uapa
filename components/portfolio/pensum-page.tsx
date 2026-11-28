'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Clock3,
  GraduationCap, Lightbulb, Search, XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/lib/portfolio/types'
import { STATUS_LABELS } from '@/lib/portfolio/types'
import { DECLARED_TOTALS, DECLARED_TRIMESTERS, PENSUM_COURSES, PENSUM_INFO } from '@/lib/portfolio/pensum-data'
import { PortfolioSidebar } from './portfolio-sidebar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const supabase = createClient()
const TRIMESTER_LABELS = ['Primer trimestre', 'Segundo trimestre', 'Tercer trimestre', 'Cuarto trimestre']

const STATUS_COLOR: Record<string, string> = {
  pending:     'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  review:      'bg-amber-100 text-amber-800',
  completed:   'bg-emerald-100 text-emerald-800',
}

type MetricKey = 'hours_theoretical' | 'hours_practical' | 'hours_research_virtual' | 'hours_independent' | 'credits'
const fieldMap: Record<string, MetricKey> = { ht: 'hours_theoretical', hp: 'hours_practical', hiv: 'hours_research_virtual', hi: 'hours_independent', credits: 'credits' }

function useCourses() {
  return useSWR<Course[]>('pensum-all-courses', async () => {
    const { data, error } = await supabase
      .from('portfolio_courses')
      .select('id,trimester,course_number,course_code,credits,hours_theoretical,hours_practical,hours_research_virtual,hours_independent,title,description,is_placeholder,status,prerequisite,facilitator,publication_status,updated_at')
      .order('trimester')
      .order('course_number')
    if (error) throw error
    return (data ?? []) as Course[]
  })
}

function MetricCard({ label, abbr, declared, computed, icon: Icon }: {
  label: string; abbr: string; declared: number; computed: number; icon: typeof BookOpen
}) {
  const diff = computed - declared
  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-800">
            <Icon aria-hidden="true" size={18} />
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold tracking-wide text-slate-600">{abbr}</span>
        </div>
        <p className="mt-4 text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-bold tracking-tight text-[#2563EB] sm:text-2xl">{declared.toLocaleString('es-DO')}</p>
        {diff !== 0 && (
          <p className="mt-1 text-[10px] leading-4 text-amber-700">
            Suma individual: {computed.toLocaleString('es-DO')} ({diff > 0 ? '+' : ''}{diff})
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function PensumPage() {
  const { data: courses = [], isLoading } = useCourses()
  const [activeFilter, setActiveFilter] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  // Calculate actuals from loaded courses
  const computedTotals = {
    credits: courses.reduce((s, c) => s + Number(c.credits || 0), 0),
    ht:      courses.reduce((s, c) => s + Number(c.hours_theoretical || 0), 0),
    hp:      courses.reduce((s, c) => s + Number(c.hours_practical || 0), 0),
    hiv:     courses.reduce((s, c) => s + Number(c.hours_research_virtual || 0), 0),
    hi:      courses.reduce((s, c) => s + Number(c.hours_independent || 0), 0),
  }

  const totalCourses = courses.length
  const completedCourses = courses.filter((c) => c.status === 'completed').length
  const progress = totalCourses ? Math.round((completedCourses / totalCourses) * 100) : 0

  // Filter and search
  const filtered = courses.filter((c) => {
    const matchesTerm = activeFilter === null || c.trimester === activeFilter
    const q = search.toLowerCase()
    const matchesSearch = !q || (c.course_code?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q))
    return matchesTerm && matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-800 md:flex">
      <PortfolioSidebar completedCourses={completedCourses} totalCourses={totalCourses} loading={isLoading} />
      <div className="min-w-0 flex-1 md:ml-[264px]">
        <main className="mx-auto min-h-screen max-w-[1500px] px-4 pb-12 pt-6 sm:px-6 md:px-8 md:pt-9 lg:px-10">

          {/* Page header */}
          <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-700">Ruta curricular</p>
              <h1 className="mt-2 max-w-3xl font-heading text-2xl font-bold leading-tight tracking-tight text-[#2563EB] sm:text-3xl">
                Pénsum 2024 · Habilitación Docente en Informática
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {PENSUM_INFO.institution} · Decreto {PENSUM_INFO.decree}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-lg px-3 py-1.5">Pénsum {PENSUM_INFO.pensumYear}</Badge>
              <Badge variant="secondary" className="rounded-lg px-3 py-1.5">{PENSUM_INFO.duration}</Badge>
              {PENSUM_INFO.modalities.map((m) => (
                <Badge key={m} variant="secondary" className="rounded-lg px-3 py-1.5 capitalize">{m}</Badge>
              ))}
            </div>
          </header>

          {/* Totals metrics */}
          <section aria-label="Totales del pénsum" className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />) : (
              <>
                <MetricCard label="Créditos" abbr="CR" declared={DECLARED_TOTALS.credits} computed={computedTotals.credits} icon={GraduationCap} />
                <MetricCard label="Horas teóricas" abbr="HT" declared={DECLARED_TOTALS.ht} computed={computedTotals.ht} icon={BookOpen} />
                <MetricCard label="Horas prácticas" abbr="HP" declared={DECLARED_TOTALS.hp} computed={computedTotals.hp} icon={Lightbulb} />
                <MetricCard label="Interacción virtual" abbr="HIV" declared={DECLARED_TOTALS.hiv} computed={computedTotals.hiv} icon={Search} />
                <MetricCard label="Estudio independiente" abbr="HI" declared={DECLARED_TOTALS.hi} computed={computedTotals.hi} icon={Clock3} />
              </>
            )}
          </section>

          {/* Progress bar */}
          <div className="mb-7 flex items-center gap-4">
            <div className="flex-1">
              <Progress value={isLoading ? null : progress} aria-label={`Progreso: ${completedCourses} de ${totalCourses} completadas`} className="h-2" />
            </div>
            <span className="text-sm font-semibold text-[#2563EB]">
              {isLoading ? '—' : `${completedCourses}/${totalCourses} completadas`}
            </span>
          </div>

          {/* Filters + search */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search aria-hidden="true" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar por código o nombre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[null, 1, 2, 3, 4].map((t) => (
                <button
                  key={t ?? 'all'}
                  type="button"
                  onClick={() => setActiveFilter(t)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    activeFilter === t
                      ? 'bg-[#2563EB] text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {t === null ? 'Todos' : `T${t}`}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-500">{filtered.length} asignatura{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Curriculum table (desktop) */}
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      {['Código', 'Asignatura', 'HT', 'HP', 'HIV', 'HI', 'CR', 'Prerrequisito', 'Estado'].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 first:pl-5 last:pr-5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length ? filtered.map((course) => (
                      <tr key={course.id} className="group transition hover:bg-blue-50/40">
                        <td className="pl-5 py-4">
                          <Link
                            href={`/asignaturas/${(course.course_code || '').toLowerCase()}`}
                            className="font-mono text-xs font-bold text-blue-800 hover:text-blue-950"
                          >
                            {course.course_code || '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-4 font-medium text-[#2563EB]">
                          <Link href={`/asignaturas/${(course.course_code || '').toLowerCase()}`} className="hover:text-blue-800">
                            {course.title}
                          </Link>
                          <p className="mt-0.5 text-[11px] text-slate-400">{TRIMESTER_LABELS[course.trimester - 1]}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{course.hours_theoretical ?? '—'}</td>
                        <td className="px-4 py-4 text-slate-700">{course.hours_practical ?? '—'}</td>
                        <td className="px-4 py-4 text-slate-700">{course.hours_research_virtual ?? '—'}</td>
                        <td className="px-4 py-4 text-slate-700">{course.hours_independent ?? '—'}</td>
                        <td className="px-4 py-4 font-semibold text-[#2563EB]">{course.credits ?? '—'}</td>
                        <td className="px-4 py-4 text-slate-500 text-xs">{course.prerequisite || '—'}</td>
                        <td className="pr-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[course.status] ?? 'bg-slate-100 text-slate-700'}`}>
                            {STATUS_LABELS[course.status] || course.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">
                          No hay asignaturas que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {filtered.length ? filtered.map((course) => (
                  <Link
                    key={course.id}
                    href={`/asignaturas/${(course.course_code || '').toLowerCase()}`}
                    className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    <Card className="h-full border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-blue-700">
                              {course.course_code} · {TRIMESTER_LABELS[course.trimester - 1]}
                            </p>
                            <h3 className="mt-1 font-semibold leading-5 text-[#2563EB]">{course.title}</h3>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[course.status] ?? 'bg-slate-100 text-slate-700'}`}>
                            {STATUS_LABELS[course.status] || course.status}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-5 gap-2">
                          {([['CR', course.credits], ['HT', course.hours_theoretical], ['HP', course.hours_practical], ['HIV', course.hours_research_virtual], ['HI', course.hours_independent]] as [string, number | null][]).map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-slate-50 p-2 text-center">
                              <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
                              <p className="mt-0.5 text-sm font-bold text-[#2563EB]">{value ?? '—'}</p>
                            </div>
                          ))}
                        </div>
                        {course.prerequisite && (
                          <p className="mt-2 text-[11px] text-slate-500">Prerrequisito: <span className="font-medium">{course.prerequisite}</span></p>
                        )}
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-800">
                          Ver asignatura <ArrowRight aria-hidden="true" size={13} />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                )) : (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-sm text-slate-500">
                      No hay asignaturas que coincidan con la búsqueda.
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Per-trimester summaries */}
          <section className="mt-10" aria-label="Resumen por trimestre">
            <h2 className="mb-4 font-heading text-lg font-bold text-[#2563EB]">Resumen por trimestre</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((term) => {
                const declared = DECLARED_TRIMESTERS[String(term)]
                const termCourses = courses.filter((c) => c.trimester === term)
                const actual = {
                  credits: termCourses.reduce((s, c) => s + Number(c.credits || 0), 0),
                  ht:      termCourses.reduce((s, c) => s + Number(c.hours_theoretical || 0), 0),
                  hp:      termCourses.reduce((s, c) => s + Number(c.hours_practical || 0), 0),
                  hiv:     termCourses.reduce((s, c) => s + Number(c.hours_research_virtual || 0), 0),
                  hi:      termCourses.reduce((s, c) => s + Number(c.hours_independent || 0), 0),
                }
                return (
                  <Card key={term} className="border-slate-200/80 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-semibold text-[#2563EB]">{TRIMESTER_LABELS[term - 1]}</h3>
                        <span className="text-xs text-slate-500">{termCourses.length} asignaturas</span>
                      </div>
                      <div className="mt-4 grid grid-cols-5 gap-2">
                        {(['credits', 'ht', 'hp', 'hiv', 'hi'] as const).map((field) => {
                          const dec = declared[field]
                          const act = actual[field]
                          const hasDiff = act !== dec
                          return (
                            <div key={field} className={`rounded-xl p-3 ${hasDiff ? 'bg-amber-50' : 'bg-slate-50'}`}>
                              <p className="text-[10px] font-semibold uppercase text-slate-500">{field.toUpperCase()}</p>
                              <p className="mt-1 font-bold text-[#2563EB]">{dec}</p>
                              {hasDiff && <p className="text-[9px] text-amber-700">Suma: {act}</p>}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
