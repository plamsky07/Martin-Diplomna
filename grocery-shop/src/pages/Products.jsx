import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import { db } from "../firebase";
import Hero from "../components/Hero";
import Pagination from "../components/Pagination";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
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
  return { base, final, hasPromo: final < base, label: promo.label || "ПРОМО" };
}

function getImageSrc(url) {
  const clean = (url || "").trim();
  if (!clean) return "/promo-fallback.jpg";
  return clean;
}

function normalizeSubcategories(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    if (input.length === 1 && typeof input[0] === "string" && input[0].includes(",")) {
      return input[0]
        .split(",")
        .map((s) => s.replaceAll('"', "").trim())
        .filter(Boolean);
    }
    return input
      .filter((s) => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((s) => s.replaceAll('"', "").trim())
      .filter(Boolean);
  }
  return [];
}

export default function Products({
  filters,
  categories: navCategories = [],
  subcategories = [],
  onSearchChange,
  onCategories,
  onSubcategories,
}) {
  const ITEMS_PER_PAGE = 12;

  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);

  const nav = useNavigate();
  const { user, profile } = useAuth();
  const { add } = useCart();
  const { toggle, isFav } = useFavorites();

  useEffect(() => {
    if (profile?.role !== "admin") return;

    const unsubscribeOrders = onSnapshot(query(collection(db, "orders")), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribeOrders();
  }, [profile?.role]);

  const bestSellers = useMemo(() => {
    const qtyMap = new Map();
    orders.forEach((o) =>
      (o.items || []).forEach((it) => {
        const id = it.productId;
        qtyMap.set(id, (qtyMap.get(id) || 0) + Number(it.qty || 0));
      })
    );

    const sorted = [...products]
      .map((p) => ({ ...p, soldQty: qtyMap.get(p.id) || 0 }))
      .sort((a, b) => b.soldQty - a.soldQty);

    return sorted.filter((p) => p.soldQty > 0).slice(0, 6);
  }, [orders, products]);

  const promoProducts = useMemo(() => products.filter((p) => p.promo?.enabled), [products]);

  const promoShowcase = useMemo(() => {
    const primary = promoProducts.slice(0, 12);
    if (primary.length >= 8) return primary;

    const needed = 8 - primary.length;
    const filler = products
      .filter((p) => !p.promo?.enabled)
      .slice(0, needed)
      .map((p) => ({
        ...p,
        promo: { enabled: true, label: "ОФЕРТА", percent: 10 },
      }));

    return [...primary, ...filler];
  }, [promoProducts, products]);

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(query(collection(db, "products")), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribeProducts();
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
    const unsubscribeCats = onSnapshot(query(collection(db, "categories")), (snap) => {
      setCats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribeCats();
  }, []);

  const categories = useMemo(() => ["all", ...cats.map((c) => c.name)], [cats]);
  const filterCategories = navCategories.length ? navCategories : categories;
  const effectiveSubs = useMemo(() => normalizeSubcategories(subcategories), [subcategories]);

  const q = filters?.query ?? "";
  const cat = filters?.category ?? "all";
  const sub = filters?.subcategory ?? "all";
  const minPrice = filters?.minPrice ?? "";
  const maxPrice = filters?.maxPrice ?? "";

  const emit = (next = {}) => {
    onSearchChange?.({
      query: next.query ?? q,
      category: next.category ?? cat,
      subcategory: next.subcategory ?? sub,
      minPrice: next.minPrice ?? minPrice,
      maxPrice: next.maxPrice ?? maxPrice,
    });
  };

  const lastCatsRef = useRef([]);
  useEffect(() => {
    if (!onCategories) return;
    const names = cats.map((c) => c.name);
    if (sameArray(lastCatsRef.current, names)) return;
    lastCatsRef.current = names;
    onCategories(cats);
  }, [cats, onCategories]);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedFiltered = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const requireAuthThen = (action) => {
    setPendingAction(action);
    nav("/register");
  };

  return (
    <div className="container">
      <Hero
        title="ЕзиГруп"
        subtitle="Свежи продукти, бърза доставка и лесно плащане."
        highlight="Топ оферти и най-продавани"
        categories={categories}
        onPickCategory={(c) => {
          try {
            window.dispatchEvent(new CustomEvent("pickCategory", { detail: c }));
          } catch {
            // noop
          }
        }}
      />

      <section className="card productsPanel" id="productsList">
        <div className="productFilterBar">
          <select
            className="input"
            value={cat}
            onChange={(e) => emit({ category: e.target.value, subcategory: "all" })}
          >
            <option value="all">Всички категории</option>
            {filterCategories.filter((c) => c && c !== "all").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="input"
            value={sub}
            onChange={(e) => emit({ subcategory: e.target.value })}
            disabled={effectiveSubs.length === 0}
          >
            <option value="all">Всички подкатегории</option>
            {effectiveSubs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            className="input"
            placeholder="Мин. цена"
            inputMode="decimal"
            value={minPrice}
            onChange={(e) => emit({ minPrice: e.target.value })}
          />

          <input
            className="input"
            placeholder="Макс. цена"
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => emit({ maxPrice: e.target.value })}
          />

          <input
            className="input"
            placeholder="Търсене на продукти..."
            value={q}
            onChange={(e) => emit({ query: e.target.value })}
          />

          <button className="btn btnPrimary" onClick={() => emit()}>
            Търси
          </button>

          <button
            className="btn"
            onClick={() => emit({ query: "", category: "all", subcategory: "all", minPrice: "", maxPrice: "" })}
          >
            Изчисти
          </button>
        </div>

        <div className="hr" />

        <div className="row">
          <h1 className="h1" style={{ margin: 0 }}>Продукти</h1>
          <div className="spacer" />
          <span className="badge">Категории: {Math.max(0, categories.length - 1)} | Налични: {products.length}</span>
        </div>

        {promoShowcase.length > 0 && (
          <>
            <div className="row" style={{ alignItems: "baseline" }}>
              <h2 className="h2" style={{ margin: 0, fontWeight: 900 }}>Промоции и оферти</h2>
              <div className="spacer" />
              <span className="badge">{promoShowcase.length}</span>
            </div>

            <div className="promoGrid">
              {promoShowcase.map((p) => {
                const pr = getPriceView(p);
                return (
                  <article key={p.id} className="promoCard">
                    <div className="promoImageWrap">
                      <img
                        src={getImageSrc(p.imageUrl)}
                        alt={p.name}
                        onError={(e) => (e.currentTarget.src = "/promo-fallback.jpg")}
                      />
                      <span className="promoTag">{pr.label || "ПРОМО"}</span>
                    </div>

                    <div className="promoBody">
                      <div style={{ fontWeight: 900, fontSize: 18 }}>{p.name}</div>
                      <div className="h2" style={{ margin: "2px 0 10px" }}>
                        {p.category}{p.subcategory ? ` / ${p.subcategory}` : ""}
                      </div>

                      <div className="row" style={{ gap: 8 }}>
                        {pr.hasPromo && (
                          <span className="badge" style={{ textDecoration: "line-through", opacity: 0.6 }}>
                            {formatMoneyEUR(pr.base)}
                          </span>
                        )}
                        <span className="badge promoPrice">{formatMoneyEUR(pr.final)}</span>
                        <div className="spacer" />
                        <button
                          className="btn btnPrimary"
                          style={{ borderRadius: 12, height: 38 }}
                          onClick={() => {
                            if (!user) {
                              requireAuthThen({ type: "ADD_TO_CART", productId: p.id, qty: 1, redirectTo: "/cart" });
                              return;
                            }
                            add(p, 1);
                            trackEvent("add_to_cart", { productId: p.id, name: p.name, price: p.price, qty: 1, path: "/" }, user);
                          }}
                        >
                          Добави
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hr" />
          </>
        )}

        {bestSellers.length > 0 && (
          <>
            <div className="row" style={{ alignItems: "baseline" }}>
              <h2 className="h2" style={{ margin: 0, fontWeight: 900 }}>Най-продавани</h2>
              <div className="spacer" />
              <span className="badge">Топ {bestSellers.length}</span>
            </div>

            <div className="statsGrid">
              {bestSellers.map((p) => (
                <div key={p.id} className="statCard">
                  <div style={{ fontWeight: 900 }}>{p.name}</div>
                  <div className="h2" style={{ margin: "4px 0 8px" }}>{p.soldQty} продадени</div>
                  <div className="badge">{formatMoneyEUR(p.price)}</div>
                </div>
              ))}
            </div>

            <div className="hr" />
          </>
        )}

        <div className="productGrid">
          {pagedFiltered.map((p) => (
            <article key={p.id} className="productCard">
              <div className="productImageWrap">
                {p.promo?.enabled && (
                  <div style={{ position: "absolute", top: 10, left: 10, zIndex: 2 }}>
                    <span className="badge" style={{ fontWeight: 900 }}>{p.promo.label || "ПРОМО"}</span>
                  </div>
                )}

                <img
                  src={getImageSrc(p.imageUrl)}
                  alt={p.name}
                  onError={(e) => (e.currentTarget.src = "/promo-fallback.jpg")}
                />
              </div>

              <div style={{ marginTop: 12, minHeight: 54 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{p.name}</div>
                <div className="h2" style={{ margin: 0 }}>
                  {p.category}{p.subcategory ? ` / ${p.subcategory}` : ""}
                </div>
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                {(() => {
                  const pr = getPriceView(p);
                  return (
                    <div className="row" style={{ gap: 8, alignItems: "center", width: "100%" }}>
                      {pr.hasPromo ? (
                        <>
                          <span className="badge" style={{ textDecoration: "line-through", opacity: 0.6 }}>{formatMoneyEUR(pr.base)}</span>
                          <span className="badge" style={{ fontWeight: 900 }}>{formatMoneyEUR(pr.final)}</span>
                        </>
                      ) : (
                        <span className="badge">{formatMoneyEUR(pr.final)}</span>
                      )}

                      <div className="spacer" />

                      <button
                        className="btn"
                        style={{
                          borderRadius: 999,
                          width: 44,
                          minWidth: 44,
                          padding: 0,
                          fontSize: 20,
                          lineHeight: 1,
                          color: isFav(p.id) ? "#dc2626" : "#6b7280",
                          borderColor: isFav(p.id) ? "#f1b4b4" : undefined,
                          background: isFav(p.id) ? "#fff1f1" : undefined,
                        }}
                        title={isFav(p.id) ? "Премахни от любими" : "Добави в любими"}
                        onClick={() => {
                          if (!user) {
                            requireAuthThen({ type: "TOGGLE_FAVORITE", productId: p.id, redirectTo: "/" });
                            return;
                          }
                          toggle(p.id);
                          trackEvent("toggle_favorite", { productId: p.id, name: p.name, path: "/" }, user);
                        }}
                      >
                        {isFav(p.id) ? "\u2665" : "\u2661"}
                      </button>
                    </div>
                  );
                })()}
              </div>

              <button
                className="btn btnPrimary"
                style={{ width: "100%", marginTop: 12, borderRadius: 14, height: 46, fontWeight: 900 }}
                onClick={() => {
                  if (!user) {
                    requireAuthThen({ type: "ADD_TO_CART", productId: p.id, qty: 1, redirectTo: "/cart" });
                    return;
                  }
                  add(p, 1);
                  trackEvent("add_to_cart", { productId: p.id, name: p.name, price: p.price, qty: 1, path: "/" }, user);
                }}
              >
                Добави в количката
              </button>
            </article>
          ))}
        </div>

        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />

        {filtered.length === 0 && (
          <p className="h2" style={{ marginTop: 16 }}>
            Няма продукти по зададените филтри.
          </p>
        )}
      </section>
    </div>
  );
}
