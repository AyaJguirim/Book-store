// frontend/src/hooks/useReadingLog.js
import { useState, useEffect, useCallback } from 'react'
import { getReadingLog } from '../services/accountService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Journal de lecture : expose entries (livres avec leur statut), loading, error, reload
export function useReadingLog() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getReadingLog({ signal: controller.signal })
      .then(setEntries)
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

  return { entries, loading, error, reload }
}