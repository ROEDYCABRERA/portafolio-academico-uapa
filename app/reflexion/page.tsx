import type { Metadata } from 'next'
import { PublicPortfolio } from '@/components/portfolio/public-portfolio'

export const metadata: Metadata = {
  title: 'Reflexiones académicas | Portafolio UAPA',
  description: 'Reflexiones grupales e individuales publicadas sobre el trayecto formativo, la evolución pedagógica y el compromiso profesional.',
}

export default function ReflectionPage() {
  return <PublicPortfolio view="reflection" />
}
