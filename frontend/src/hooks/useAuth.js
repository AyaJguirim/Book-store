import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

// Expose user, loading, login, register et logout
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>")
  }

  return context
}
