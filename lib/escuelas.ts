import escuelasData from '@/data/escuelas-uruguay.json'
import type { Nino } from './types'

export interface EscuelaUruguay {
  id: string
  nombre: string
  departamento: string
  localidad: string
  subsistema: string
  codigo: string
}

export const escuelasUruguay = escuelasData as EscuelaUruguay[]

export const escuelasSearchItems = escuelasUruguay.map(escuela => {
  const label = formatEscuela(escuela)
  return {
    escuela,
    label,
    normalizedLabel: normalizeEscuelaText(label),
    normalizedCodigo: normalizeEscuelaText(escuela.codigo),
    normalizedNombre: normalizeEscuelaText(escuela.nombre),
  }
})

const escuelasById = new Map(escuelasUruguay.map(escuela => [escuela.id, escuela]))
const escuelasByLabel = new Map(escuelasSearchItems.map(item => [item.label, item.escuela]))

export function formatEscuela(escuela: EscuelaUruguay): string {
  const place = [escuela.localidad, escuela.departamento].filter(Boolean).join(', ')
  return `${escuela.nombre} · ${place} · ${escuela.subsistema}`
}

export function formatNinoEscuela(nino: Pick<Nino, 'escuela' | 'escuelaId'>): string {
  const escuela = findEscuelaById(nino.escuelaId)
  if (escuela) return formatEscuela(escuela)
  return nino.escuela?.trim() || 'Sin escuela'
}

export function findEscuelaById(id?: string): EscuelaUruguay | undefined {
  if (!id) return undefined
  return escuelasById.get(id)
}

export function findEscuelaByExactLabel(label?: string): EscuelaUruguay | undefined {
  if (!label) return undefined
  return escuelasByLabel.get(label.trim())
}

export function findEscuelaByLabel(label?: string): EscuelaUruguay | undefined {
  if (!label) return undefined
  const trimmed = label.trim()
  return findEscuelaByExactLabel(trimmed) ?? findEscuelaByText(trimmed)
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

  const fullLabelMatch = escuelasSearchItems.find(item => item.normalizedLabel === normalized)
  if (fullLabelMatch) return fullLabelMatch.escuela

  const codeMatch = escuelasSearchItems.find(item => item.normalizedCodigo === normalized)
  if (codeMatch) return codeMatch.escuela

  const exactNameMatches = escuelasSearchItems.filter(item => item.normalizedNombre === normalized)
  if (exactNameMatches.length === 1) return exactNameMatches[0].escuela

  const candidates = escuelasSearchItems
    .map(item => ({ escuela: item.escuela, score: schoolScore(normalized, item) }))
    .filter(item => item.score >= 0.92)
    .sort((a, b) => b.score - a.score)

  if (candidates.length === 0) return undefined
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) return undefined
  return candidates[0].escuela
}

function schoolScore(value: string, item: (typeof escuelasSearchItems)[number]): number {
  const name = item.normalizedNombre
  const label = item.normalizedLabel
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
