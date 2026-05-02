'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUsuario } from '@/lib/firestore'
import type { Usuario } from '@/lib/types'

interface AuthState {
  usuario: Usuario | null
  loading: boolean
}

export function useAuth(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    usuario: null,
    loading: true,
  })

  useEffect(() => {
    let active = true
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const usuario = await getUsuario(firebaseUser.uid)
          if (active) setState({ usuario, loading: false })
        } catch (err) {
          console.error('Failed to load authenticated user profile:', err)
          if (active) setState({ usuario: null, loading: false })
        }
      } else {
        setState({ usuario: null, loading: false })
      }
    })
    return () => {
      active = false
      unsub()
    }
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return { ...state, logout }
}
