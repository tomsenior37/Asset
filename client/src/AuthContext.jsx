import React, { createContext, useContext, useEffect, useState } from 'react'
import { me, clearToken, getToken } from './services/auth'

const AuthContext = createContext({ user: null, role: 'guest', isAdmin: false })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('guest')

  useEffect(() => {
    (async () => {
      if (!getToken()) return
      try { const u = await me(); setUser(u); setRole(u.role || 'user') } catch (_e) { /* ignore */ }
    })()
  }, [])

  function logout(){
    clearToken()
    window.location.reload()
  }

  const value = { user, role, isAdmin: role === 'admin', logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(){ return useContext(AuthContext) }
