const TOKEN_KEY = 'bookstore:token'

// Chaque accès est protégé : localStorage peut être indisponible (mode privé, quota)
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // on ignore : l'utilisateur devra se reconnecter au prochain chargement
  }
}

export function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // on ignore
  }
}