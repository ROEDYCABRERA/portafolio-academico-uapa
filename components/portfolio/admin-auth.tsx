'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Eye, EyeOff, GraduationCap, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({ email: z.string().email('Escribe un correo válido.'), password: z.string().min(8, 'Usa al menos 8 caracteres.') })
type Values = z.infer<typeof schema>

export function AdminAuth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values: Values) {
    setBusy(true)
    setMessage('')
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: values.email.trim().toLowerCase(), password: values.password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      setMessage(error ? 'No se pudo crear la cuenta. Revisa el correo e intenta de nuevo.' : 'Te enviamos un correo para confirmar tu cuenta. El acceso de administración se activa después de confirmar el correo autorizado.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: values.email.trim().toLowerCase(), password: values.password })
      setMessage(error ? 'No se pudo iniciar sesión. Verifica tus datos y que el correo esté confirmado.' : 'Sesión iniciada. Cargando tu espacio…')
    }
    setBusy(false)
  }

  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#eaf2ff_0%,#f8fafc_50%,#f1f5f9_100%)] px-5 py-12"><div className="w-full max-w-md"><Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-800"><ArrowLeft size={16} />Volver al portafolio</Link><Card className="overflow-hidden border-slate-200/80 bg-white shadow-xl shadow-slate-900/5"><div className="bg-[#0B2545] px-7 py-7 text-white"><span className="grid size-12 place-items-center rounded-xl bg-white/10"><GraduationCap /></span><h1 className="mt-5 text-2xl font-bold">{mode === 'login' ? 'Espacio de administración' : 'Crear acceso'}</h1><p className="mt-2 text-sm text-blue-100/75">Gestión del Portafolio Académico Digital UAPA</p></div><CardContent className="p-7"><form onSubmit={handleSubmit(onSubmit)} className="space-y-5"><div className="space-y-2"><Label htmlFor="admin-email">Correo electrónico</Label><div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input id="admin-email" autoComplete="email" type="email" placeholder="nombre@correo.com" className="pl-9" aria-invalid={!!errors.email} {...register('email')} /></div>{errors.email && <p className="text-sm text-red-700">{errors.email.message}</p>}</div><div className="space-y-2"><Label htmlFor="admin-password">Contraseña</Label><div className="relative"><LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input id="admin-password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} placeholder="Al menos 8 caracteres" className="pl-9 pr-11" aria-invalid={!!errors.password} {...register('password')} /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{errors.password && <p className="text-sm text-red-700">{errors.password.message}</p>}</div><Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-[#0B2545] hover:bg-[#143B68]">{busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</Button>{message && <p role="status" aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">{message}</p>}</form><p className="mt-6 text-center text-sm text-slate-600">{mode === 'login' ? '¿Primera vez aquí?' : '¿Ya tienes acceso?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }} className="font-semibold text-blue-700 underline-offset-4 hover:underline">{mode === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}</button></p><p className="mt-4 text-center text-xs leading-5 text-slate-500">El registro no concede privilegios por sí solo. La administración se asigna únicamente a las cuentas autorizadas y confirmadas.</p></CardContent></Card></div></main>
}
