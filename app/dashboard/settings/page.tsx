'use client'

import { useEffect, useState } from 'react'
import { getAppConfig, setAppConfig } from '@/lib/firestore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageFade } from '@/components/ui/page-fade'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [añoActivo, setAñoActivo] = useState('')
  const [umbral, setUmbral] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAppConfig()
      .then(cfg => {
        setAñoActivo(String(cfg.añoActivo))
        setUmbral(String(cfg.umbralFidelidadAlerta))
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load config:', err)
        setError('No se pudo cargar la configuración.')
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    const parsedAño = Number(añoActivo)
    const parsedUmbral = Number(umbral)
    if (
      !Number.isInteger(parsedAño) ||
      parsedAño < 2000 ||
      parsedAño > 2100 ||
      !Number.isFinite(parsedUmbral) ||
      parsedUmbral < 0 ||
      parsedUmbral > 100
    ) {
      setError('Revisá el año y el umbral antes de guardar.')
      return
    }
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      await setAppConfig({
        añoActivo: parsedAño,
        umbralFidelidadAlerta: parsedUmbral,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save config:', err)
      setError('No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageFade>
        <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
      </PageFade>
    )
  }

  return (
    <PageFade>
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
            className={`w-full transition-all duration-200 ${saved ? 'bg-green-600 text-white' : ''}`}
          >
            {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
    </div>
    </PageFade>
  )
}
