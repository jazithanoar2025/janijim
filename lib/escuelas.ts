import escuelasData from '@/data/escuelas-uruguay.json'

export interface EscuelaUruguay {
  id: string
  nombre: string
  departamento: string
  localidad: string
  subsistema: string
  codigo: string
}

export const escuelasUruguay = escuelasData as EscuelaUruguay[]

export function formatEscuela(escuela: EscuelaUruguay): string {
  const place = [escuela.localidad, escuela.departamento].filter(Boolean).join(', ')
  return `${escuela.nombre} · ${place} · ${escuela.subsistema}`
}

export function findEscuelaById(id?: string): EscuelaUruguay | undefined {
  if (!id) return undefined
  return escuelasUruguay.find(escuela => escuela.id === id)
}

export function findEscuelaByLabel(label?: string): EscuelaUruguay | undefined {
  if (!label) return undefined
  const trimmed = label.trim()
  return escuelasUruguay.find(escuela => formatEscuela(escuela) === trimmed) ?? findEscuelaByText(trimmed)
}

export function normalizeEscuelaText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/º|°/g, ' n ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\b(esc|escuela|colegio|liceo|nro|no|num|numero)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function findEscuelaByText(value?: string): EscuelaUruguay | undefined {
  const normalized = normalizeEscuelaText(value)
  if (!normalized) return undefined

  const fullLabelMatch = escuelasUruguay.find(escuela => normalizeEscuelaText(formatEscuela(escuela)) === normalized)
  if (fullLabelMatch) return fullLabelMatch

  const codeMatch = escuelasUruguay.find(escuela => escuela.codigo === normalized)
  if (codeMatch) return codeMatch

  const exactNameMatches = escuelasUruguay.filter(escuela => normalizeEscuelaText(escuela.nombre) === normalized)
  if (exactNameMatches.length === 1) return exactNameMatches[0]

  const candidates = escuelasUruguay
    .map(escuela => ({ escuela, score: schoolScore(normalized, escuela) }))
    .filter(item => item.score >= 0.92)
    .sort((a, b) => b.score - a.score)

  if (candidates.length === 0) return undefined
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) return undefined
  return candidates[0].escuela
}

function schoolScore(value: string, escuela: EscuelaUruguay): number {
  const name = normalizeEscuelaText(escuela.nombre)
  const label = normalizeEscuelaText(formatEscuela(escuela))
  if (label.includes(value) || value.includes(label)) return 1
  if (name.includes(value) || value.includes(name)) return 0.96
  return diceCoefficient(value, name)
}

function diceCoefficient(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0
  const grams = new Map<string, number>()
  for (let i = 0; i < a.length - 1; i += 1) {
    const gram = a.slice(i, i + 2)
    grams.set(gram, (grams.get(gram) ?? 0) + 1)
  }
  let hits = 0
  for (let i = 0; i < b.length - 1; i += 1) {
    const gram = b.slice(i, i + 2)
    const count = grams.get(gram) ?? 0
    if (count > 0) {
      grams.set(gram, count - 1)
      hits += 1
    }
  }
  return (2 * hits) / (a.length + b.length - 2)
}
