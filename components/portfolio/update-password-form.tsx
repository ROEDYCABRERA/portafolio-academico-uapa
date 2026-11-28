'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function UpdatePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (password.length < 8) {
      setMessage('Usa una contraseña de al menos 8 caracteres.')
      return
    }
    if (password !== confirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setMessage('El enlace no es válido o ha caducado. Solicita uno nuevo desde el inicio de sesión.')
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#eaf2ff_0%,#f8fafc_50%,#f1f5f9_100%)] px-5 py-12">
      <Card className="w-full max-w-md border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
        <CardHeader>
          <CardTitle className="text-2xl text-[#2563EB]">Crear nueva contraseña</CardTitle>
          <CardDescription>Elige una contraseña segura de al menos 8 caracteres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="bg-[#2563EB] hover:bg-[#1D4ED8]">
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
            {message && <p role="status" aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
