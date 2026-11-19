import { useState, useEffect, useCallback } from 'react'
import { getReadingHistory, removeReadingProgress } from '../services/readingProgressService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Historique de lecture : expose books, loading, error, reload et remove
export function useReadingHistory() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getReadingHistory({ signal: controller.signal })
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
  const remove = useCallback(async (bookId) => {
    await removeReadingProgress(bookId)
    setBooks((current) => current.filter((book) => book.id !== bookId))
  }, [])

  return { books, loading, error, reload, remove }
}
