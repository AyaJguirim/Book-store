import { useState, useEffect } from 'react'

// Retourne la valeur donnée, mais mise à jour seulement après `delay` ms sans changement
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)

    // Si la valeur change avant la fin du délai, on annule le minuteur
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}