'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getUsuario } from '@/lib/firestore'
import type { Usuario } from '@/lib/types'

interface AuthState {
  firebaseUser: User | null
  usuario: Usuario | null
  loading: boolean
}

export function useAuth(): AuthState & { logout: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    usuario: null,
    loading: true,
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const usuario = await getUsuario(firebaseUser.uid)
        setState({ firebaseUser, usuario, loading: false })
      } else {
        setState({ firebaseUser: null, usuario: null, loading: false })
      }
    })
    return unsub
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return { ...state, logout }
}
