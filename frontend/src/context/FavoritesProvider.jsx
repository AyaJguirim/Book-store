// frontend/src/context/FavoritesProvider.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FavoritesContext } from './FavoritesContext'
import { useAuth } from '../hooks/useAuth'
import {
  getFavoriteIds,
  addFavorite,
  removeFavorite,
  importFavorites,
} from '../services/favoriteService'
import { getErrorMessage } from '../utils/getErrorMessage'

const STORAGE_KEY = 'bookstore:favorites'
const MAX_ID = 2147483647 // plus grand entier accepté par PostgreSQL (INTEGER)
const MAX_FAVORITES = 500
const NO_FAVORITES = []

// Favoris du VISITEUR (non connecté), lus dans localStorage.
// Si la valeur est absente ou corrompue, on repart d'une liste vide.
function loadGuestFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((id) => Number.isInteger(id) && id >= 1 && id <= MAX_ID)
      .slice(0, MAX_FAVORITES)
  } catch {
    return []
  }
}

function saveGuestFavorites(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage indisponible (mode privé, quota plein) : on ignore
  }
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  // Visiteur : liste locale. Compte : liste venant de l'API (account.userId dit à qui elle appartient)
  const [guestFavorites, setGuestFavorites] = useState(loadGuestFavorites)
  const [account, setAccount] = useState({ userId: null, ids: NO_FAVORITES })
  const [error, setError] = useState(null) // { userId, message }
  const [reloadCount, setReloadCount] = useState(0)
  const pending = useRef(new Set()) // livres dont l'envoi à l'API est en cours

  const accountReady = userId !== null && account.userId === userId
  const ready = userId === null || accountReady
  const favorites = userId === null ? guestFavorites : accountReady ? account.ids : NO_FAVORITES

  // Sauvegarde de la liste du visiteur
  useEffect(() => {
    saveGuestFavorites(guestFavorites)
  }, [guestFavorites])

  // À la connexion : on charge les favoris du compte, après y avoir copié ceux du visiteur
  useEffect(() => {
    if (userId === null) return

    let cancelled = false
    const guestIds = loadGuestFavorites()
    const request = guestIds.length > 0 ? importFavorites(guestIds) : getFavoriteIds()

    request
      .then((ids) => {
        if (cancelled) return
        setAccount({ userId, ids })
        // Copiés dans le compte : on les efface du navigateur pour qu'ils ne
        // soient pas récupérés par un autre compte sur le même ordinateur
        if (guestIds.length > 0) setGuestFavorites([])
      })
      .catch((err) => {
        if (!cancelled) setError({ userId, message: getErrorMessage(err) })
      })

    return () => {
      cancelled = true
    }
  }, [userId, reloadCount])

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites])

  const toggleFavorite = useCallback(
    async (id) => {
      // Visiteur : tout se passe dans le navigateur
      if (userId === null) {
        setGuestFavorites((previous) =>
          previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
        )
        return
      }

      // Compte : on attend que la liste soit chargée, et un seul envoi à la fois par livre
      if (!accountReady || pending.current.has(id)) return

      const wasFavorite = account.ids.includes(id)
      const apply = (makeFavorite) =>
        setAccount((previous) => {
          if (previous.userId !== userId) return previous
          const others = previous.ids.filter((item) => item !== id)
          return { userId, ids: makeFavorite ? [...others, id] : others }
        })

      pending.current.add(id)
      apply(!wasFavorite) // affichage immédiat

      try {
        if (wasFavorite) {
          await removeFavorite(id)
        } else {
          await addFavorite(id)
        }
      } catch (err) {
        apply(wasFavorite) // l'envoi a échoué : on revient en arrière
        setError({ userId, message: getErrorMessage(err) })
      } finally {
        pending.current.delete(id)
      }
    },
    [userId, accountReady, account],
  )

  // Retire les favoris du visiteur dont le livre n'existe plus.
  // Pour un compte, la base le garantit déjà : rien à faire.
  const keepOnly = useCallback(
    (validIds) => {
      if (userId !== null) return
      setGuestFavorites((previous) => {
        const kept = previous.filter((id) => validIds.includes(id))
        return kept.length === previous.length ? previous : kept
      })
    },
    [userId],
  )

  const clearError = useCallback(() => setError(null), [])

  const reload = useCallback(() => {
    setError(null)
    setReloadCount((count) => count + 1)
  }, [])

  const value = useMemo(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      keepOnly,
      count: favorites.length,
      ready,
      error: error && error.userId === userId ? error.message : null,
      canRetry: userId !== null && !accountReady,
      clearError,
      reload,
    }),
    [favorites, isFavorite, toggleFavorite, keepOnly, ready, error, userId, accountReady, clearError, reload],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}