// frontend/src/hooks/useNotes.js
import { useState, useEffect, useCallback } from 'react'
import { getNotes } from '../services/noteService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Notes du compte : expose entries (livres avec leur note), loading, error, reload
export function useNotes() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getNotes({ signal: controller.signal })
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