'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { getUsuario } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim()
  if (!trimmed.includes('@')) return `${trimmed}@jazit.local`
  return trimmed
}

function getLoginErrorMessage(err: unknown) {
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code?: unknown }).code)
    : ''
  const message = err instanceof Error ? err.message : ''

  if (code === 'auth/unauthorized-domain') {
    return 'Dominio no autorizado en Firebase Auth. Agregá este dominio de Vercel en Firebase > Authentication > Settings > Authorized domains.'
  }

  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid') {
    return 'La API key de Firebase en Vercel no coincide con el proyecto.'
  }

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Usuario o contraseña incorrectos.'
  }

  if (code) return `No se pudo iniciar sesión (${code}).`

  if (message) return `No se pudo iniciar sesión: ${message}`

  return 'No se pudo iniciar sesión.'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const auth = getFirebaseAuth()
      const credential = await signInWithEmailAndPassword(
        auth,
        normalizeLoginIdentifier(email),
        password
      )
      const usuario = await getUsuario(credential.user.uid)

      if (!usuario) {
        await signOut(auth)
        setError('Usuario no encontrado en el sistema.')
        setLoading(false)
        return
      }

      if (usuario.rol === 'superadmin') {
        router.push('/dashboard')
      } else if (usuario.rol === 'admin' && usuario.grupoId) {
        router.push(`/grupo/${usuario.grupoId}`)
      } else {
        await signOut(auth)
        setError('Rol no configurado. Contactá al administrador.')
      }
    } catch (err) {
      setError(getLoginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #0a0040 0%, #19006f 55%, #1e3a8a 100%)' }}
    >
      <div className="w-full max-w-md space-y-9">
        <div className="text-center text-white animate-pop">
          <Image
            src="/jhazit-75-logo.png"
            alt="Jazit Hanoar 75"
            width={84}
            height={84}
            priority
            className="mx-auto mb-5 rounded-3xl border border-white/25 shadow-xl shadow-slate-950/20"
          />
          <h1 className="text-3xl font-extrabold leading-none tracking-normal">Jazit Hanoar</h1>
          <p className="mt-2 text-sm font-medium text-white/75">El gigante de Rivera <span className="mx-1">·</span> v8</p>
        </div>

        <Card className="w-full rounded-[22px] border-0 bg-white p-2 shadow-2xl shadow-slate-950/20 animate-pop" style={{ animationDelay: '80ms' }}>
          <CardHeader className="sr-only">
            <CardTitle>Jazit Hanoar</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Usuario
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </main>
  )
}
