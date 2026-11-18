import { useState, useEffect, useCallback, useMemo } from "react";
import { AuthContext } from "./AuthContext";
import * as authService from "../services/authService";
import { getToken, setToken, removeToken } from "../utils/tokenStorage";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // On est "en chargement" seulement s'il y a un jeton à vérifier
  const [loading, setLoading] = useState(() => getToken() !== null);

  // Au démarrage : le jeton enregistré désigne-t-il encore un utilisateur ?
  useEffect(() => {
    if (getToken() === null) return;

    let cancelled = false;
    authService
      .getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((error) => {
        // 401 : jeton invalide ou expiré. Autre erreur (réseau) : on le garde
        if (error.response?.status === 401) removeToken();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authService.login({ email, password });
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const result = await authService.register({ name, email, password });
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
