import { useState, useEffect, useCallback } from 'react'
import { getRecentViews, clearRecentViews } from '../services/accountService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Historique de consultation : expose books, loading, error, reload et clear
export function useRecentViews() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getRecentViews({ signal: controller.signal })
      .then(setBooks)
      .catch((err) => {
        if (isCanceled(err)) return
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  // Peut échouer : l'appelant affiche l'erreur
  const clear = useCallback(async () => {
    await clearRecentViews()
    setBooks([])
  }, [])

  return { books, loading, error, reload, clear }
}