import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";
import Hero from "../components/Hero";

import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";

import { useNavigate } from "react-router-dom";
import { setPendingAction } from "../utils/pendingAction";
import { trackEvent } from "../utils/analytics";
import { formatMoneyEUR } from "../utils/money";

function sameArray(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function getPriceView(p) {
  const base = Number(p.price || 0);
  const promo = p.promo?.enabled ? p.promo : null;
  if (!promo) return { base, final: base, hasPromo: false, label: "" };

  let final = base;
  if (promo.price != null && !Number.isNaN(Number(promo.price))) final = Number(promo.price);
  else if (promo.percent != null && !Number.isNaN(Number(promo.percent))) final = base * (1 - Number(promo.percent) / 100);

  final = Math.max(0, final);
  return { base, final, hasPromo: final < base, label: promo.label || "PROMO" };
}

export default function Products({ filters, onCategories, onSubcategories }) {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);

  const nav = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const { toggle, isFav } = useFavorites();
  const [orders, setOrders] = useState([]);

    useEffect(() => {
    const uo = onSnapshot(query(collection(db, "orders")), (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => uo();
    }, []);

    const bestSellers = useMemo(() => {
    const qtyMap = new Map(); // productId -> qty
    orders.forEach(o => (o.items || []).forEach(it => {
        const id = it.productId;
        qtyMap.set(id, (qtyMap.get(id) || 0) + Number(it.qty || 0));
    }));

    // сортираме продуктите по qty
    const sorted = [...products]
        .map(p => ({ ...p, soldQty: qtyMap.get(p.id) || 0 }))
        .sort((a, b) => b.soldQty - a.soldQty);

    return sorted.filter(p => p.soldQty > 0).slice(0, 6);
    }, [orders, products]);

  const promoProducts = useMemo(
    () => products.filter(p => p.promo?.enabled),
    [products]
  );

  useEffect(() => {
    const qy = query(collection(db, "products"));
    const unsub = onSnapshot(qy, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const computedSubcategories = useMemo(() => {
    const selectedCat = filters?.category || "all";
    if (selectedCat === "all") return [];

    const set = new Set(
      products
        .filter((p) => p.category === selectedCat)
        .map((p) => p.subcategory)
        .filter(Boolean)
    );

    return ["all", ...Array.from(set)];
  }, [products, filters?.category]);

  useEffect(() => {
    if (!onSubcategories) return;
    onSubcategories(computedSubcategories);
  }, [computedSubcategories, onSubcategories]);

  useEffect(() => {
    const qc = query(collection(db, "categories"));
    const unsubCats = onSnapshot(qc, (snap) => {
      setCats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubCats();
  }, []);

  // ✅ само изчисляваме (без setState към App тук)
  const categories = useMemo(() => ["all", ...cats.map((c) => c.name)], [cats]);

  // ✅ изпращаме към App СЛЕД render: подаваме ПЪЛНИТЕ категории (обекти), използваме names за сравнение
  const lastCatsRef = useRef([]);
  useEffect(() => {
    if (!onCategories) return;
    const names = cats.map((c) => c.name);
    if (sameArray(lastCatsRef.current, names)) return;
    lastCatsRef.current = names;
    onCategories(cats);
  }, [cats, onCategories]);

  // ✅ филтър
  const filtered = useMemo(() => {
    const t = (filters?.query || "").trim().toLowerCase();
    const cat = filters?.category || "all";
    const sub = filters?.subcategory || "all";

    const minP = filters?.minPrice === "" ? null : Number(filters.minPrice);
    const maxP = filters?.maxPrice === "" ? null : Number(filters.maxPrice);

    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const price = Number(p.price || 0);

      const okCat = cat === "all" ? true : p.category === cat;
      const okSub = sub === "all" ? true : p.subcategory === sub;
      const okText = !t ? true : name.includes(t);

      const okMin = minP == null || (!Number.isNaN(minP) && price >= minP);
      const okMax = maxP == null || (!Number.isNaN(maxP) && price <= maxP);

      return okCat && okSub && okText && okMin && okMax;
    });
  }, [products, filters]);

  const requireAuthThen = (action) => {
    setPendingAction(action);
    nav("/register");
  };

  return (
    <div className="container">
      <Hero
        title="GroceryShop"
        subtitle="Свежи продукти • Бързо • Удобно"
        highlight="🔥 Топ оферти и най-продавани"
        categories={categories}
        onPickCategory={(c) => {
          // broadcast pick to App (App listens for 'pickCategory' event)
          try {
            window.dispatchEvent(new CustomEvent('pickCategory', { detail: c }));
          } catch (e) {
            // noop
          }
        }}
      />

      <div className="hr" style={{ margin: "14px 0" }} />

      {/* твоя UI си остава същия */}
      <div
        className="card"
        style={{
          background: "rgba(255,255,255,0.92)",
          padding: 18,
          borderRadius: 22,
        }}
      >
        <div className="row">
          <h1 className="h1" style={{ margin: 0 }}>Продукти</h1>
          <div className="spacer" />
          <span className="badge">
            Категории: {Math.max(0, categories.length - 1)} | Налични: {products.length}
          </span>
        </div>

        <div id="productsList" />

        <div className="hr" />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          <button
            className="badge"
            style={{ padding: "10px 14px", borderRadius: 999, fontWeight: 900 }}
            onClick={() => filters?.setCategory?.("all")}
          >
            🧺 Всички
          </button>

          {cats.map((c) => (
            <button
              key={c.id}
              className="badge"
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                fontWeight: 900,
                background: "rgba(17,24,39,0.03)",
                border: "1px solid rgba(17,24,39,0.08)",
              }}
              onClick={() => filters?.setCategory?.(c.name)}
              title={(c.subcategories || []).join(", ")}
            >
              {(c.icon || "🏷️")} {c.name}
            </button>
          ))}
        </div>

        {promoProducts.length > 0 && (
          <>
            <div className="hr" />
            <div className="row" style={{ alignItems: "baseline" }}>
              <h2 className="h2" style={{ margin: 0, fontWeight: 950 }}>✨ Промоции</h2>
              <div className="spacer" />
              <span className="badge">{promoProducts.length}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginTop: 12 }}>
              {promoProducts.slice(0, 6).map((p) => {
                const pr = getPriceView(p);
                return (
                  <div key={p.id} className="card" style={{ padding: 14, borderRadius: 22 }}>
                    <div style={{ fontWeight: 950 }}>{p.name}</div>
                    <div style={{ opacity: 0.7, fontSize: 13 }}>{p.category}</div>
                    <div style={{ marginTop: 10 }}>
                      {pr.hasPromo ? (
                        <div className="row" style={{ gap: 8 }}>
                          <span className="badge" style={{ textDecoration: "line-through", opacity: 0.6 }}>
                            {formatMoneyEUR(pr.base)}
                          </span>
                          <span className="badge" style={{ fontWeight: 950 }}>
                            {formatMoneyEUR(pr.final)}
                          </span>
                        </div>
                      ) : (
                        <span className="badge">{formatMoneyEUR(pr.final)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )} 

        {bestSellers.length > 0 && (
          <>
            <div className="hr" />
            <div className="row" style={{ alignItems: "baseline" }}>
              <h2 className="h2" style={{ margin: 0, fontWeight: 950 }}>🔥 Най-продавани</h2>
              <div className="spacer" />
              <span className="badge">Top {bestSellers.length}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14, marginTop: 12 }}>
              {bestSellers.map((p) => (
                <div key={p.id} className="card" style={{ padding: 14, borderRadius: 22 }}>
                  <div style={{ fontWeight: 950 }}>{p.name}</div>
                  <div style={{ opacity: 0.7, fontSize: 13 }}>{p.soldQty} бр. продадени</div>
                  <div style={{ marginTop: 10 }} className="badge">{formatMoneyEUR(p.price)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                padding: 14,
                borderRadius: 22,
                background: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(17,24,39,0.06)",
                boxShadow: "0 10px 22px rgba(17,24,39,0.06)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "1px solid rgba(17,24,39,0.08)",
                  background: "rgba(17,24,39,0.02)",
                }}
              >
                {p.promo?.enabled && (
                  <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}>
                    <span className="badge" style={{ fontWeight: 950 }}>
                      ✨ {p.promo.label || "PROMO"}
                    </span>
                  </div>
                )}

                <img
                  src={p.imageUrl && p.imageUrl.trim() ? p.imageUrl : "/no-image.png"}
                  alt={p.name}
                  onError={(e) => (e.currentTarget.src = "/no-image.png")}
                  style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }}
                />
              </div>

              <div style={{ marginTop: 12, minHeight: 54 }}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>{p.name}</div>
                <div style={{ opacity: 0.65, fontSize: 13 }}>
                  {p.category}{p.subcategory ? ` / ${p.subcategory}` : ""}
                </div>
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                {(() => {
                  const pr = getPriceView(p);
                  return (
                    <div className="row" style={{ gap: 10, alignItems: "center" }}>
                      {pr.hasPromo && (
                        <span className="badge" style={{ fontWeight: 950 }}>
                          ✨ {pr.label}
                        </span>
                      )}

                      <div className="spacer" />

                      {pr.hasPromo ? (
                        <div className="row" style={{ gap: 8 }}>
                          <span className="badge" style={{ textDecoration: "line-through", opacity: 0.6 }}>
                            {formatMoneyEUR(pr.base)}
                          </span>
                          <span className="badge" style={{ fontWeight: 950 }}>
                            {formatMoneyEUR(pr.final)}
                          </span>
                        </div>
                      ) : (
                        <span className="badge">{formatMoneyEUR(pr.final)}</span>
                      )}
                    </div>
                  );
                })()}
                <button
                  className="btn"
                  style={{ borderRadius: 999, width: 46, padding: 0 }}
                  onClick={() => {
                    if (!user) {
                      requireAuthThen({ type: "TOGGLE_FAVORITE", productId: p.id, redirectTo: "/" });
                      return;
                    }
                        toggle(p.id);
                        trackEvent("toggle_favorite", { productId: p.id, name: p.name, path: "/" }, user);
                  }}
                >
                  {isFav(p.id) ? "♥" : "♡"}
                </button>
              </div>

              <button
                className="btn btnPrimary"
                style={{ width: "100%", marginTop: 12, borderRadius: 16, height: 48, fontWeight: 950 }}
                onClick={() => {
                  if (!user) {
                    requireAuthThen({ type: "ADD_TO_CART", productId: p.id, qty: 1, redirectTo: "/cart" });
                    return;
                  }
                    add(p, 1);
                    trackEvent("add_to_cart", { productId: p.id, name: p.name, price: p.price, qty: 1, path: "/" }, user);
                }}
              >
                Добави в количка
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="h2" style={{ marginTop: 16 }}>
            Няма намерени продукти по този филтър.
          </p>
        )}
      </div>
      
    </div>
  );
}