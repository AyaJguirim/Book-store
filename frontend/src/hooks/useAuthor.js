import { useState, useEffect, useCallback } from 'react'
import { getAuthorById } from '../services/authorService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Charge un auteur : expose author, loading, error ({ message, status }) et reload
export function useAuthor(id) {
  const [author, setAuthor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)
    setAuthor(null)

    getAuthorById(id, { signal: controller.signal })
      .then(setAuthor)
      .catch((err) => {
        if (isCanceled(err)) return
        setError({ message: getErrorMessage(err), status: err.response?.status })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [id, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return { author, loading, error, reload }
}
