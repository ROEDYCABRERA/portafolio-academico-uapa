'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Course } from '@/lib/portfolio/types'

type Totals = Record<string, number>
type CurriculumValue = Record<string, unknown> & {
  declared_totals: Totals
  trimesters: Record<string, Totals>
}

const totalFields = [
  ['credits', 'Créditos'], ['ht', 'Horas teóricas'], ['hp', 'Horas prácticas'],
  ['hiv', 'Investigación e interacción virtual'], ['hi', 'Estudio independiente'],
] as const

const defaults: CurriculumValue = {
  declared_totals: { credits: 34, ht: 330, hp: 360, hiv: 555, hi: 1530 },
  trimesters: {
    '1': { credits: 7, ht: 105, hp: 0, hiv: 105, hi: 315 },
    '2': { credits: 10, ht: 90, hp: 120, hiv: 150, hi: 450 },
    '3': { credits: 8, ht: 75, hp: 90, hiv: 120, hi: 360 },
    '4': { credits: 9, ht: 60, hp: 150, hiv: 180, hi: 405 },
  },
}

function readValue(value: Record<string, unknown>): CurriculumValue {
  const declared = value.declared_totals as Record<string, unknown> | undefined
  const terms = value.trimesters as Record<string, Record<string, unknown>> | undefined
  const toNumber = (input: unknown, fallback: number) => typeof input === 'number' && Number.isFinite(input) ? input : fallback
  return {
    ...value,
    declared_totals: Object.fromEntries(totalFields.map(([key]) => [key, toNumber(declared?.[key], defaults.declared_totals[key])])),
    trimesters: Object.fromEntries(['1', '2', '3', '4'].map((term) => [term, Object.fromEntries(totalFields.map(([key]) => [key, toNumber(terms?.[term]?.[key], defaults.trimesters[term][key])]))])),
  }
}

export function CurriculumTotalsEditor({ courses, value, onSave }: { courses: Course[]; value: Record<string, unknown>; onSave: (value: CurriculumValue) => Promise<void> }) {
  const [totals, setTotals] = useState(() => readValue(value))
  const [saving, setSaving] = useState(false)
  const setNumber = (group: 'declared_totals' | 'trimesters', term: string | null, field: string, raw: string) => {
    const next = raw === '' ? 0 : Number(raw)
    if (!Number.isFinite(next) || next < 0) return
    setTotals((current) => group === 'declared_totals'
      ? { ...current, declared_totals: { ...current.declared_totals, [field]: next } }
      : { ...current, trimesters: { ...current.trimesters, [term!]: { ...current.trimesters[term!], [field]: next } } })
  }
  const courseFields = { credits: 'credits', ht: 'hours_theoretical', hp: 'hours_practical', hiv: 'hours_research_virtual', hi: 'hours_independent' } as const
  const warnings: string[] = []
  if (courses.length) {
    for (const [field, courseField] of Object.entries(courseFields) as Array<[keyof typeof courseFields, (typeof courseFields)[keyof typeof courseFields]]>) {
      const assigned = courses.reduce((sum, course) => sum + Number(course[courseField] || 0), 0)
      const declared = totals.declared_totals[field]
      if (assigned !== declared) warnings.push(`Programa: ${declared} ${field.toUpperCase()} declarados frente a ${assigned} en las asignaturas.`)
    }
    for (const term of ['1', '2', '3', '4']) {
      const termCourses = courses.filter((course) => course.trimester === Number(term))
      for (const [field, courseField] of Object.entries(courseFields) as Array<[keyof typeof courseFields, (typeof courseFields)[keyof typeof courseFields]]>) {
        const assigned = termCourses.reduce((sum, course) => sum + Number(course[courseField] || 0), 0)
        const declared = totals.trimesters[term][field]
        if (assigned !== declared) warnings.push(`Trimestre ${term}: ${declared} ${field.toUpperCase()} declarados frente a ${assigned} en las asignaturas.`)
      }
    }
  }
  const fieldInput = (group: 'declared_totals' | 'trimesters', term: string | null, field: string, label: string, id: string) => (
    <div className="space-y-1.5" key={id}>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" min="0" step="1" inputMode="numeric" value={group === 'declared_totals' ? totals.declared_totals[field] : totals.trimesters[term!][field]} onChange={(event) => setNumber(group, term, field, event.target.value)} />
    </div>
  )

  return <Card className="border-blue-100 shadow-sm"><CardContent className="space-y-6 p-5">
    <div><p className="font-semibold text-[#2563EB]">Totales declarados del pénsum</p><p className="mt-1 text-sm text-slate-600">Estos valores se conservan tal como aparecen en la fuente curricular. Las diferencias con la suma de las asignaturas se muestran para revisión, no se corrigen automáticamente.</p></div>
    {warnings.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Advertencia: hay diferencias entre los totales declarados y las asignaturas.</p><ul className="mt-2 flex flex-col gap-1">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p className="mt-2 text-xs">Revisa la fuente y corrige los valores si corresponde. No se realizan ajustes automáticos.</p></div>}
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold text-slate-700">Programa completo</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{totalFields.map(([key, label]) => fieldInput('declared_totals', null, key, label, `program-${key}`))}</div></fieldset>
    <div className="grid gap-4 xl:grid-cols-2">{['1', '2', '3', '4'].map((term) => <fieldset key={term} className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-700">Trimestre {term}</legend><div className="grid gap-3 sm:grid-cols-2">{totalFields.map(([key, label]) => fieldInput('trimesters', term, key, label, `term-${term}-${key}`))}</div></fieldset>)}</div>
    <Button type="button" disabled={saving} onClick={async () => { setSaving(true); await onSave({ ...value, ...totals }); setSaving(false) }}>{saving ? 'Guardando…' : 'Guardar totales'}</Button>
  </CardContent></Card>
}
