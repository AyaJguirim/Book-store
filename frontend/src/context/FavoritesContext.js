// frontend/src/context/FavoritesContext.js
import { createContext } from 'react'

// Le "réservoir" partagé. La valeur null est remplacée par le Provider.
export const FavoritesContext = createContext(null)