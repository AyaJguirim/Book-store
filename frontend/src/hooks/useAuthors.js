import { useState, useEffect, useCallback } from 'react'
import { getAuthors } from '../services/authorService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Charge la liste des auteurs : expose authors, loading, error et reload
export function useAuthors() {
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getAuthors({ signal: controller.signal })
      .then(setAuthors)
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

  return { authors, loading, error, reload }
}
