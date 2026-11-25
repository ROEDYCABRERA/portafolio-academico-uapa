import type { Metadata } from 'next'
import { CourseDetail } from '@/components/portfolio/course-detail'

export const metadata: Metadata = {
  title: 'Detalle de asignatura | Portafolio Académico UAPA',
  description: 'Explora la información curricular, las experiencias, evidencias y reflexiones personales de cada asignatura.',
}

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  return <CourseDetail courseId={courseId} />
}
