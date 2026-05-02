'use client'

import { useEffect, useState } from 'react'
import { getAppConfig, setAppConfig } from '@/lib/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [añoActivo, setAñoActivo] = useState('')
  const [umbral, setUmbral] = useState('')

  useEffect(() => {
    getAppConfig()
      .then(cfg => {
        setAñoActivo(String(cfg.añoActivo))
        setUmbral(String(cfg.umbralFidelidadAlerta))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load config:', err)
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await setAppConfig({
      añoActivo: Number(añoActivo),
      umbralFidelidadAlerta: Number(umbral),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <p className="text-slate-500 text-sm">Cargando...</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Configuración</h2>

      <Card className="max-w-md">
        <CardContent className="p-4 space-y-4">
          <div>
            <Label htmlFor="año">Año activo</Label>
            <Input
              id="año"
              type="number"
              value={añoActivo}
              onChange={e => setAñoActivo(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="umbral">
              Umbral fidelidad (%) - mínimo para considerar janij real
            </Label>
            <Input
              id="umbral"
              type="number"
              min="0"
              max="100"
              value={umbral}
              onChange={e => setUmbral(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !añoActivo || !umbral}
            className="w-full"
          >
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
