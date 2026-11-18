// frontend/src/hooks/useStats.js
import { useState, useEffect, useCallback } from 'react'
import { getStats } from '../services/statsService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Statistiques d'une année : expose stats, loading, error et reload
export function useStats(year) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getStats(year, { signal: controller.signal })
      .then(setStats)
      .catch((err) => {
        if (isCanceled(err)) return
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [year, reloadCount])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  return { stats, loading, error, reload }
}