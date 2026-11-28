'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ChevronRight, GraduationCap, Home, LockKeyhole, Menu, MessageSquareQuote, Users, X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

type PortfolioSidebarProps = {
  completedCourses: number
  totalCourses: number
  loading: boolean
}

const coreLinks = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/pensum', label: 'Pénsum oficial', icon: BookOpen },
  { href: '/participantes', label: 'Participantes', icon: Users },
]

const trimesterLinks = [1, 2, 3, 4].map((trimester) => ({
  href: `/trimestre/${trimester}`,
  label: `${['Primer', 'Segundo', 'Tercer', 'Cuarto'][trimester - 1]} trimestre`,
  trimester,
}))

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const navLinkClass = (active: boolean) => `group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? 'bg-white/12 font-semibold text-white' : 'text-blue-100/75 hover:bg-white/8 hover:text-white'}`

  return (
    <>
      <nav aria-label="Navegación principal" className="flex flex-col gap-1">
        {coreLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} onClick={onNavigate} className={navLinkClass(active)}><Icon aria-hidden="true" size={17} /><span>{label}</span>{active && <ChevronRight aria-hidden="true" size={15} className="ml-auto" />}</Link>
        })}
      </nav>
      <div className="mt-7">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-blue-200/55">Recorrido académico</p>
        <nav aria-label="Trimestres" className="mt-2 flex flex-col gap-1">
          {trimesterLinks.map(({ href, label, trimester }) => {
            const active = pathname === href
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} onClick={onNavigate} className={navLinkClass(active)}><span className={`grid size-6 place-items-center rounded-lg text-[10px] font-bold ${active ? 'bg-white/15 text-white' : 'bg-white/8 text-blue-100/70'}`}>0{trimester}</span><span>{label}</span>{active && <ChevronRight aria-hidden="true" size={15} className="ml-auto" />}</Link>
          })}
        </nav>
      </div>
      <nav aria-label="Reflexiones" className="mt-7 flex flex-col gap-1">
        <Link href="/reflexion" aria-current={pathname === '/reflexion' ? 'page' : undefined} onClick={onNavigate} className={navLinkClass(pathname === '/reflexion')}><MessageSquareQuote aria-hidden="true" size={17} /><span>Reflexión final</span>{pathname === '/reflexion' && <ChevronRight aria-hidden="true" size={15} className="ml-auto" />}</Link>
      </nav>
    </>
  )
}

export function PortfolioSidebar({ completedCourses, totalCourses, loading }: PortfolioSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const drawer = drawerRef.current
    if (!drawer) return
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    drawer.querySelector<HTMLButtonElement>('button[aria-label="Cerrar menú"]')?.focus()

    const manageDrawerKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', manageDrawerKeys)
    return () => {
      window.removeEventListener('keydown', manageDrawerKeys)
      mobileTriggerRef.current?.focus()
    }
  }, [open])

  const progress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
  const progressLabel = loading ? '—' : `${progress}%`
  const progressDescription = loading ? 'Cargando pénsum oficial…' : `${completedCourses} de ${totalCourses} asignaturas completadas`

  return (
    <>
      <div className="sticky top-0 z-40 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <Link href="/" aria-label="Portafolio UAPA, inicio" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#0B2545] text-white"><GraduationCap aria-hidden="true" size={20} /></span>
          <span><span className="block text-xs font-bold tracking-wide text-[#0B2545]">PORTAFOLIO UAPA</span><span className="block text-[10px] text-slate-500">Habilitación Docente</span></span>
        </Link>
        <button ref={mobileTriggerRef} type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="portfolio-mobile-navigation" onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-[#0B2545] transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          {open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
        </button>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-[#0B2545] px-4 py-5 text-white md:flex">
        <Link href="/" aria-label="Portafolio UAPA, inicio" className="flex items-center gap-3 px-2">
          <span className="grid size-11 place-items-center rounded-xl bg-white/10"><GraduationCap aria-hidden="true" size={22} /></span>
          <span><span className="block text-sm font-bold tracking-wide">PORTAFOLIO UAPA</span><span className="mt-0.5 block text-[11px] leading-4 text-blue-100/65">Habilitación Docente en Informática</span></span>
        </Link>
        <div className="mt-8 flex-1 overflow-y-auto pb-4"><Navigation pathname={pathname} onNavigate={() => setOpen(false)} /></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">Progreso curricular</p><span className="text-xs text-blue-100/70">{progressLabel}</span></div>
          <Progress value={loading ? null : progress} aria-label={loading ? 'Cargando progreso curricular' : `Progreso curricular: ${completedCourses} de ${totalCourses} asignaturas completadas`} className="mt-3 h-1.5 bg-white/15 [&_[data-slot=progress-indicator]]:bg-blue-300" />
          <p className="mt-2 text-[11px] text-blue-100/60">{progressDescription}</p>
        </div>
        <Link href="/admin" className="mt-4 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-blue-100/75 transition hover:bg-white/8 hover:text-white"><LockKeyhole aria-hidden="true" size={17} /><span>Administrar contenido</span></Link>
      </aside>

      {open && <div className="fixed inset-0 z-50 md:hidden">
        <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/45" />
        <aside ref={drawerRef} id="portfolio-mobile-navigation" role="dialog" aria-modal="true" aria-label="Menú de navegación" className="relative flex h-full w-[min(86vw,320px)] flex-col bg-[#0B2545] px-4 py-5 text-white shadow-2xl">
          <div className="flex items-center justify-between px-2">
            <Link href="/" aria-label="Portafolio UAPA, inicio" onClick={() => setOpen(false)} className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/10"><GraduationCap aria-hidden="true" size={21} /></span><span><span className="block text-sm font-bold">PORTAFOLIO UAPA</span><span className="text-[10px] text-blue-100/65">Habilitación Docente</span></span></Link>
            <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg text-blue-100 hover:bg-white/10"><X aria-hidden="true" size={19} /></button>
          </div>
          <div className="mt-8 flex-1 overflow-y-auto pb-4"><Navigation pathname={pathname} onNavigate={() => setOpen(false)} /></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">Progreso curricular</p><span className="text-xs text-blue-100/70">{progressLabel}</span></div><Progress value={loading ? null : progress} aria-label={loading ? 'Cargando progreso curricular' : `Progreso curricular: ${completedCourses} de ${totalCourses} asignaturas completadas`} className="mt-3 h-1.5 bg-white/15 [&_[data-slot=progress-indicator]]:bg-blue-300" /><p className="mt-2 text-[11px] text-blue-100/60">{progressDescription}</p></div>
          <Link href="/admin" onClick={() => setOpen(false)} className="mt-4 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-blue-100/75 transition hover:bg-white/8 hover:text-white"><LockKeyhole aria-hidden="true" size={17} /><span>Administrar contenido</span></Link>
        </aside>
      </div>}
    </>
  )
}
