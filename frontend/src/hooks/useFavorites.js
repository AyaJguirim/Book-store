import { useContext } from 'react'
import { FavoritesContext } from '../context/FavoritesContext'

// Hook personnalisé : expose favorites, isFavorite, toggleFavorite et count
export function useFavorites() {
  const context = useContext(FavoritesContext)

  if (context === null) {
    throw new Error('useFavorites doit être utilisé à l\'intérieur de <FavoritesProvider>')
  }

  return context
}