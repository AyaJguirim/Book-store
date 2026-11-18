// frontend/src/hooks/useReadingGoal.js
import { useState, useEffect, useCallback } from 'react'
import {
  getReadingGoal,
  saveReadingGoal,
  deleteReadingGoal,
} from '../services/readingGoalService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

// Objectif de lecture d'une année : expose goal ({ year, target, read }),
// loading, error, reload, save(target) et remove()
export function useReadingGoal(year) {
  const [goal, setGoal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)

    getReadingGoal(year, { signal: controller.signal })
      .then(setGoal)
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

  // Peuvent échouer : l'appelant affiche l'erreur
  const save = useCallback(
    async (target) => {
      const saved = await saveReadingGoal(year, target)
      setGoal(saved)
    },
    [year],
  )

  const remove = useCallback(async () => {
    await deleteReadingGoal(year)
    setGoal((previous) => (previous ? { ...previous, target: null } : previous))
  }, [year])

  return { goal, loading, error, reload, save, remove }
}