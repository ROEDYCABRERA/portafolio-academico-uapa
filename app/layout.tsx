import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portafolio Académico Digital UAPA',
  description: 'Recorrido formativo, experiencias y reflexiones de la Especialidad en Habilitación Docente en Informática de la UAPA.',
  applicationName: 'Portafolio Académico Digital UAPA',
  openGraph: {
    title: 'Portafolio Académico Digital UAPA',
    description: 'Un recorrido de aprendizaje, práctica y reflexión docente.',
    type: 'website',
    locale: 'es_DO',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0B2545',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" data-scroll-behavior="smooth"><body className="antialiased">{children}<Toaster position="top-right" richColors />{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
