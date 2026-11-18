import { useState, useEffect, useCallback } from 'react'
import { getBooks } from '../services/bookService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Charge le catalogue depuis l'API : expose books, loading, error, reload
export function useBooks({ search = '', categoryId = null } = {}) {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getBooks({ search, categoryId, signal: controller.signal })
      .then(setBooks)
      .catch((err) => {
        if (isCanceled(err)) return // requête annulée par nous : pas une erreur
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    // Nettoyage : annule la requête si les paramètres changent avant la réponse
    return () => controller.abort()
  }, [search, categoryId, reloadCount])

  // Relancer le chargement : on change le compteur, ce qui relance l'effet
  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return { books, loading, error, reload }
}