import { useState, useEffect } from 'react'
import { getCategories } from '../services/categoryService'
import { isCanceled } from '../services/api'
import { getErrorMessage } from '../utils/getErrorMessage'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getCategories({ signal: controller.signal })
      .then(setCategories)
      .catch((err) => {
        if (isCanceled(err)) return
        setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { categories, loading, error }
}