'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SetupPage() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, email, password: password || undefined, name }),
      })
      const data = await res.json() as { error?: string; success?: boolean }

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Error desconocido.')
        return
      }

      setStatus('done')
      setMessage('¡Configuración exitosa! Redirigiendo al login...')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      setStatus('error')
      setMessage(String(err))
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuración inicial — Jazit Hanoar</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'done' ? (
            <p className="text-green-600 text-sm font-medium">{message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Esto crea el primer superadmin y el documento config/app en Firestore. Solo funciona una vez.
              </p>
              <div>
                <Label htmlFor="secret">Clave de setup (BOOTSTRAP_SECRET)</Label>
                <Input
                  id="secret"
                  type="password"
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email del superadmin</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña (opcional si ya existe en Firebase Auth)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              {status === 'error' && (
                <p className="text-red-600 text-sm">{message}</p>
              )}
              <Button type="submit" className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Configurando...' : 'Configurar'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
