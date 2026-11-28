'use client'

import { useState } from 'react'
import {
  AlertTriangle, CheckCircle2, RefreshCw, XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/lib/portfolio/types'
import {
  DECLARED_TOTALS, DECLARED_TRIMESTERS, KNOWN_INCONSISTENCIES, PENSUM_COURSES,
} from '@/lib/portfolio/pensum-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const supabase = createClient()

type IssueKind = 'info' | 'warning' | 'error'
interface ValidationIssue {
  id: string
  kind: IssueKind
  scope: string
  title: string
  detail: string
  declared?: number
  computed?: number
  difference?: number
}

function computeIssues(courses: Course[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const fieldMap = {
    credits: 'credits' as const,
    ht:      'hours_theoretical' as const,
    hp:      'hours_practical' as const,
    hiv:     'hours_research_virtual' as const,
    hi:      'hours_independent' as const,
  }
  const fieldLabel: Record<string, string> = { credits: 'CR', ht: 'HT', hp: 'HP', hiv: 'HIV', hi: 'HI' }

  // 1. Program-level totals
  for (const [key, courseField] of Object.entries(fieldMap) as [keyof typeof fieldMap, typeof fieldMap[keyof typeof fieldMap]][]) {
    const declared = DECLARED_TOTALS[key]
    const computed = courses.reduce((s, c) => s + Number(c[courseField] || 0), 0)
    if (computed !== declared) {
      issues.push({
        id: `program-${key}`,
        kind: 'warning',
        scope: 'Programa completo',
        title: `Diferencia en ${fieldLabel[key]} del programa`,
        detail: `El pénsum declara ${declared} ${fieldLabel[key]}. La suma de las asignaturas cargadas en Supabase es ${computed}. Diferencia: ${computed > declared ? '+' : ''}${computed - declared}.`,
        declared,
        computed,
        difference: computed - declared,
      })
    }
  }

  // 2. Per-trimester totals
  for (const term of ['1', '2', '3', '4']) {
    const declared = DECLARED_TRIMESTERS[term]
    const termCourses = courses.filter((c) => c.trimester === Number(term))
    for (const [key, courseField] of Object.entries(fieldMap) as [keyof typeof fieldMap, typeof fieldMap[keyof typeof fieldMap]][]) {
      const dec = declared[key]
      const comp = termCourses.reduce((s, c) => s + Number(c[courseField] || 0), 0)
      if (comp !== dec) {
        issues.push({
          id: `term-${term}-${key}`,
          kind: 'warning',
          scope: `Trimestre ${term}`,
          title: `Diferencia en ${fieldLabel[key]} (Trimestre ${term})`,
          detail: `Declarados: ${dec}. Suma de asignaturas cargadas: ${comp}. Diferencia: ${comp > dec ? '+' : ''}${comp - dec}.`,
          declared: dec,
          computed: comp,
          difference: comp - dec,
        })
      }
    }
  }

  // 3. Missing prerequisite references
  const knownCodes = new Set(courses.map((c) => c.course_code).filter(Boolean))
  for (const course of courses) {
    if (!course.prerequisite) continue
    const prereq = course.prerequisite.trim()
    if (prereq === 'Licenciatura') continue
    // Multiple prerequsites separated by comma
    const parts = prereq.split(',').map((p) => p.trim())
    for (const part of parts) {
      if (part && !knownCodes.has(part)) {
        issues.push({
          id: `missing-prereq-${course.course_code}-${part}`,
          kind: 'error',
          scope: `Prerrequisito · ${course.course_code}`,
          title: `Prerrequisito no localizado: ${part}`,
          detail: `${course.course_code} requiere "${part}" como prerrequisito, pero ese código no figura entre las asignaturas registradas en Supabase. Referencia no localizada.`,
        })
      }
    }
  }

  // 4. Count check
  if (courses.length !== PENSUM_COURSES.length) {
    issues.push({
      id: 'count-mismatch',
      kind: courses.length < PENSUM_COURSES.length ? 'error' : 'warning',
      scope: 'Conteo de asignaturas',
      title: `Conteo de asignaturas: ${courses.length} en BD, ${PENSUM_COURSES.length} esperadas`,
      detail: `El pénsum 2024 tiene ${PENSUM_COURSES.length} asignaturas. Se encontraron ${courses.length} en la base de datos.`,
    })
  }

  // 5. Code verification — check canonical codes exist
  for (const ref of PENSUM_COURSES) {
    if (!knownCodes.has(ref.code)) {
      issues.push({
        id: `missing-code-${ref.code}`,
        kind: 'error',
        scope: `Asignatura faltante`,
        title: `${ref.code} no encontrada en la base de datos`,
        detail: `La asignatura "${ref.name}" (${ref.code}) del pénsum 2024 no está registrada en Supabase.`,
      })
    }
  }

  return issues
}

const ISSUE_ICON = {
  info:    CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
}
const ISSUE_CLASS = {
  info:    'border-blue-200 bg-blue-50',
  warning: 'border-amber-200 bg-amber-50',
  error:   'border-red-200 bg-red-50',
}
const ICON_CLASS = {
  info:    'text-blue-700',
  warning: 'text-amber-700',
  error:   'text-red-700',
}

export function PensumValidationModule({
  courses,
  onSaved,
}: {
  courses: Course[]
  onSaved?: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [runId, setRunId] = useState(0)

  const issues = computeIssues(courses)

  async function saveRun() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('portfolio_pensum_validations').insert({
        actor_id: user?.id ?? null,
        issues: issues,
      })
      if (error) throw error
      toast.success('Resultado de validación guardado.')
      setRunId((n) => n + 1)
      onSaved?.()
    } catch {
      toast.error('No se pudo guardar la validación.')
    } finally {
      setSaving(false)
    }
  }

  const warnings = issues.filter((i) => i.kind === 'warning').length
  const errors   = issues.filter((i) => i.kind === 'error').length
  const infos    = issues.filter((i) => i.kind === 'info').length

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-[#2563EB]">Validación del pénsum</span>
          {errors   > 0 && <Badge variant="destructive">{errors} error{errors !== 1 ? 'es' : ''}</Badge>}
          {warnings > 0 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{warnings} advertencia{warnings !== 1 ? 's' : ''}</Badge>}
          {infos    > 0 && <Badge variant="secondary">{infos} info</Badge>}
          {issues.length === 0 && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Sin diferencias detectadas</Badge>}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={saveRun}>
          <RefreshCw size={14} className={saving ? 'animate-spin' : ''} data-icon="inline-start" />
          {saving ? 'Guardando…' : 'Guardar resultado'}
        </Button>
      </div>

      {/* Hardcoded known inconsistencies always shown */}
      <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
        <CardContent className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Inconsistencias documentadas en el pénsum fuente
          </p>
          <p className="mt-1 text-xs text-amber-900">
            Estas diferencias provienen del documento oficial del pénsum y se muestran únicamente como referencia.
            No se corrigen automáticamente.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {KNOWN_INCONSISTENCIES.map((issue) => {
              const Icon = issue.type === 'missing_prerequisite' ? XCircle : AlertTriangle
              return (
                <li key={issue.scope} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-4">
                  <Icon aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-semibold text-[#2563EB]">{issue.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{issue.description}</p>
                    {issue.difference > 0 && (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        Declarado: {issue.declared} · Suma: {issue.computed} · Diferencia: +{issue.difference}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Dynamic issues from Supabase data */}
      {issues.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-[#2563EB]">Validación en tiempo real (datos de Supabase)</p>
          {issues.map((issue) => {
            const Icon = ISSUE_ICON[issue.kind]
            return (
              <div
                key={issue.id}
                className={`flex items-start gap-3 rounded-xl border p-4 ${ISSUE_CLASS[issue.kind]}`}
              >
                <Icon aria-hidden="true" size={18} className={`mt-0.5 shrink-0 ${ICON_CLASS[issue.kind]}`} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{issue.scope}</span>
                  </div>
                  <p className="mt-1 font-semibold text-[#2563EB]">{issue.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{issue.detail}</p>
                  {issue.declared !== undefined && issue.computed !== undefined && (
                    <p className="mt-1.5 text-[11px] font-mono text-slate-500">
                      Declarado: {issue.declared} · Calculado: {issue.computed} · Diferencia: {issue.difference! > 0 ? '+' : ''}{issue.difference}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {issues.length === 0 && courses.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 aria-hidden="true" size={20} className="shrink-0 text-emerald-700" />
          <p className="text-sm text-emerald-900">
            No se detectaron diferencias entre los datos de Supabase y los totales declarados del pénsum.
          </p>
        </div>
      )}
    </div>
  )
}
