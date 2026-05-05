'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { escuelasUruguay, formatEscuela } from '@/lib/escuelas'

interface SchoolComboboxProps {
  value: string
  onChange: (value: string) => void
}

export function SchoolCombobox({ value, onChange }: SchoolComboboxProps) {
  const [focused, setFocused] = useState(false)
  const query = value.trim().toLowerCase()

  const options = useMemo(() => {
    if (!query) return escuelasUruguay.slice(0, 20)
    return escuelasUruguay
      .filter(escuela => formatEscuela(escuela).toLowerCase().includes(query))
      .slice(0, 25)
  }, [query])

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder="Buscar escuela oficial..."
        autoComplete="off"
      />
      {focused && options.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-[70] max-h-52 overflow-y-auto rounded-lg border bg-white shadow-lg">
          {options.map(escuela => {
            const label = formatEscuela(escuela)
            return (
              <button
                key={escuela.id}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  onChange(label)
                  setFocused(false)
                }}
                className="block w-full px-3 py-2 text-left text-sm transition-colors duration-100 hover:bg-slate-50"
              >
                <span className="block font-medium text-slate-900">{escuela.nombre}</span>
                <span className="block text-xs text-slate-500">
                  {[escuela.localidad, escuela.departamento, escuela.subsistema].filter(Boolean).join(' · ')}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
