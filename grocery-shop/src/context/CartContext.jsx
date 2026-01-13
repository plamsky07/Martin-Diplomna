import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

function key(uid) {
  return `cart_${uid || "guest"}`;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const k = key(user?.uid);
    const raw = localStorage.getItem(k);
    setItems(raw ? JSON.parse(raw) : []);
  }, [user?.uid]);

  useEffect(() => {
    const k = key(user?.uid);
    localStorage.setItem(k, JSON.stringify(items));
  }, [items, user?.uid]);

 const add = (product, qty = 1) => {
  setItems((prev) => {
    const found = prev.find((x) => x.id === product.id);
    if (found) {
      return prev.map((x) =>
        x.id === product.id ? { ...x, qty: x.qty + qty } : x
      );
    }

    return [
      ...prev,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || "",
        qty,
        grams: product.grams ?? null,
        expiryDate: product.expiryDate ?? "",
        // ако имаш промоции:
        promoPercent: product.promoPercent ?? null,
        promoPrice: product.promoPrice ?? null,
      },
    ];
  });
};


  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id));
  const setQty = (id, qty) => setItems((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  const clear = () => setItems([]);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = items.reduce((s, x) => s + x.qty * Number(x.price || 0), 0);

  const value = useMemo(() => ({ items, add, remove, setQty, clear, count, total }), [items, count, total]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
