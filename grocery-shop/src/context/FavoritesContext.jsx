import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);

function key(uid) {
  return `fav_${uid || "guest"}`;
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem(key(user?.uid));
    setIds(raw ? JSON.parse(raw) : []);
  }, [user?.uid]);

  useEffect(() => {
    localStorage.setItem(key(user?.uid), JSON.stringify(ids));
  }, [ids, user?.uid]);

  const toggle = (id) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isFav = (id) => ids.includes(id);

  const value = useMemo(() => ({ ids, toggle, isFav, count: ids.length }), [ids]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
