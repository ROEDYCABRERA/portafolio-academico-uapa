import type { Metadata } from 'next'
import { CourseDetailByCode } from '@/components/portfolio/course-detail-by-code'

export const metadata: Metadata = {
  title: 'Asignatura | Portafolio Académico UAPA',
  description: 'Información curricular, experiencias, evidencias y reflexiones personales de la asignatura.',
}

export default async function AsignaturaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <CourseDetailByCode code={code.toUpperCase()} />
}
