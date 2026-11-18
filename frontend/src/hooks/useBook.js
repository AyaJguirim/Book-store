import { useState, useEffect, useCallback } from 'react'
import { getBookById } from '../services/bookService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Charge un livre : expose book, loading, error ({ message, status }) et reload
export function useBook(id) {
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)
    setBook(null)

    getBookById(id, { signal: controller.signal })
      .then(setBook)
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

  return { book, loading, error, reload }
}