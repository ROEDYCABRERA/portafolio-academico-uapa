'use client'

import { FormEvent, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, GraduationCap, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthMode = 'login' | 'signup' | 'recovery'

let rememberedAdminAuth: { email: string; password: string } | null = null

function rememberAdminAuthForm() {
  rememberedAdminAuth = {
    email: document.querySelector<HTMLInputElement>('#admin-email')?.value ?? '',
    password: document.querySelector<HTMLInputElement>('#admin-password')?.value ?? '',
  }
}

export function AdminAuth() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState(() => rememberedAdminAuth?.email ?? '')
  const [password, setPassword] = useState(() => rememberedAdminAuth?.password ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const supabase = createClient()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const normalizedEmail = String(formData.get('email') ?? email).trim().toLowerCase()
    const submittedPassword = String(formData.get('password') ?? password)
    const submittedValues = { email: normalizedEmail, password: mode === 'recovery' ? '' : submittedPassword }
    rememberedAdminAuth = submittedValues
    setEmail(normalizedEmail)
    if (mode !== 'recovery') setPassword(submittedPassword)
    setBusy(true)
    setMessage('')

    if (mode !== 'recovery' && submittedPassword.length < 8) {
      setMessage('Usa una contraseña de al menos 8 caracteres.')
      setBusy(false)
      return
    }

    if (mode === 'recovery') {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
      })
      setMessage(error
        ? 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo más tarde.'
        : 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.')
    } else if (mode === 'signup') {
      rememberedAdminAuth = null
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: submittedPassword,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) rememberedAdminAuth = submittedValues
      setMessage(error
        ? 'No se pudo crear la cuenta. Revisa el correo e intenta de nuevo.'
        : 'Te enviamos un correo para confirmar tu cuenta. El rol se asigna solo después de verificar el correo.')
    } else {
      rememberedAdminAuth = null
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: submittedPassword })
      if (error) rememberedAdminAuth = submittedValues
      setMessage(error
        ? 'No se pudo iniciar sesión. Verifica tus datos y que el correo esté confirmado.'
        : 'Sesión iniciada. Cargando tu espacio…')
    }
    setBusy(false)
  }

  const title = mode === 'login'
    ? 'Espacio de administración'
    : mode === 'signup' ? 'Crear acceso' : 'Restablecer contraseña'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#eaf2ff_0%,#f8fafc_50%,#f1f5f9_100%)] px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" onClick={rememberAdminAuthForm} className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-800">
          <ArrowLeft size={16} />Volver al portafolio
        </Link>
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
          <div className="bg-[#0B2545] px-7 py-7 text-white">
            <span className="grid size-12 place-items-center rounded-xl bg-white/10"><GraduationCap /></span>
            <h1 className="mt-5 text-2xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-blue-100/75">Gestión del Portafolio Académico Digital UAPA</p>
          </div>
          <CardContent className="p-7">
            <form onSubmit={onSubmit} autoComplete="on" aria-busy={busy} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-email">Correo electrónico</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="admin-email"
                    name="email"
                    autoComplete={mode === 'login' ? 'username' : 'email'}
                    autoCapitalize="none"
                    spellCheck={false}
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nombre@correo.com"
                    className="pl-9"
                  />
                </div>
              </div>
              {mode !== 'recovery' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="admin-password">Contraseña</Label>
                  <div className="relative">
                    <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="admin-password"
                      name="password"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Al menos 8 caracteres"
                      className="pl-9 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((show) => !show)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('recovery'); setMessage('') }}
                  className="self-end text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
              <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-[#0B2545] hover:bg-[#143B68]">
                {busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace de recuperación'}
              </Button>
              {message && <p role="status" aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">{message}</p>}
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              {mode === 'login' ? '¿Primera vez aquí?' : '¿Ya tienes acceso?'}{' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); setPassword(''); if (rememberedAdminAuth) rememberedAdminAuth = { ...rememberedAdminAuth, password: '' } }}
                className="font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                {mode === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}
              </button>
            </p>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              El registro no concede privilegios por sí solo. El rol se asigna en el servidor tras confirmar el correo.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
