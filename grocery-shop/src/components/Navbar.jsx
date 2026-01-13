import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

const navBtn = ({ isActive }) => ({
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid rgba(17,24,39,0.08)",
  background: isActive ? "rgba(42,157,143,0.10)" : "rgba(17,24,39,0.04)",
  whiteSpace: "nowrap",
  fontWeight: 900,
  fontSize: 14,
});

export default function Navbar({
  categories = [],
  subcategories = [],
  filters,
  onSearchChange,
}) {
  const { user, profile, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { count: favCount } = useFavorites();

  const nav = useNavigate();
  const loc = useLocation();

  const [openAcc, setOpenAcc] = useState(false);
  const accRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!accRef.current) return;
      if (!accRef.current.contains(e.target)) setOpenAcc(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const goAuth = (path) => nav(path, { state: { from: loc.pathname } });

  const doLogout = async () => {
    await logout();
    setOpenAcc(false);
    nav("/login");
  };

  const q = filters?.query ?? "";
  const cat = filters?.category ?? "all";
  const sub = filters?.subcategory ?? "all";
  const minPrice = filters?.minPrice ?? "";
  const maxPrice = filters?.maxPrice ?? "";

  function normalizeSubcategories(subcategories) {
    if (!subcategories) return [];
    if (Array.isArray(subcategories)) {
      // ако е array, но е от типа ["a,b,c"]
      if (subcategories.length === 1 && typeof subcategories[0] === "string" && subcategories[0].includes(",")) {
        return subcategories[0]
          .split(",")
          .map((s) => s.replaceAll('"', "").trim())
          .filter(Boolean);
      }
      // нормален array ["a","b"]
      return subcategories.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean);
    }
    // ако е string "a,b,c"
    if (typeof subcategories === "string") {
      return subcategories
        .split(",")
        .map((s) => s.replaceAll('"', "").trim())
        .filter(Boolean);
    }
    return [];
  }

  const effectiveSubs = useMemo(() => normalizeSubcategories(subcategories), [subcategories]);

  const emit = (next = {}) => {
    onSearchChange?.({
      query: next.query ?? q,
      category: next.category ?? cat,
      subcategory: next.subcategory ?? sub,
      minPrice: next.minPrice ?? minPrice,
      maxPrice: next.maxPrice ?? maxPrice,
    });
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(17,24,39,0.08)",
      }}
    >
      <div className="container" style={{ padding: "14px 0" }}>
        {/* TOP ROW */}
        <div className="row" style={{ gap: 12 }}>
          <Link to="/" style={{ fontWeight: 950, fontSize: 20 }}>
            GroceryShop
          </Link>

          <div className="spacer" />

          <NavLink to="/" style={navBtn}>Продукти</NavLink>
          <NavLink to="/favorites" style={navBtn}>Любими ({favCount})</NavLink>
          <NavLink to="/cart" style={navBtn}>Количка ({cartCount})</NavLink>
          {user && <NavLink to="/orders" style={navBtn}>Поръчки</NavLink>}

            {profile?.role === "admin" && (
            <>
                <NavLink to="/admin" style={navBtn}>Продукти</NavLink>
                <NavLink to="/admin/orders" style={navBtn}>Поръчки</NavLink>
                <NavLink to="/admin/users" style={navBtn}>Потребители</NavLink>
                <NavLink to="/admin/dashboard" style={navBtn}>Статистики</NavLink>
            </>
            )}

          {/* ACCOUNT */}
          {user ? (
            <div ref={accRef} style={{ position: "relative" }}>
              <button
                className="btn"
                onClick={() => setOpenAcc((v) => !v)}
                style={{ borderRadius: 999, height: 46, fontWeight: 950 }}
              >
                Акаунт
              </button>

              {openAcc && (
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 56,
                    width: 320,
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 950, fontSize: 16 }}>Профил</div>
                  <div className="h2" style={{ marginTop: 6 }}>{user.email}</div>

                  <div className="hr" style={{ margin: "12px 0" }} />

                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="badge">👤 {profile?.username || "—"}</span>
                    <span className="badge">🔐 {profile?.role || "user"}</span>
                  </div>

                  <div className="hr" style={{ margin: "12px 0" }} />

                  <div className="row">
                    <button className="btn" onClick={() => { setOpenAcc(false); nav("/account"); }}>
                      Настройки
                    </button>
                    <div className="spacer" />
                    <button className="btn btnDanger" onClick={doLogout}>
                      Изход
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" onClick={() => goAuth("/login")} style={{ borderRadius: 999 }}>
                Вход
              </button>
              <button className="btn btnPrimary" onClick={() => goAuth("/register")} style={{ borderRadius: 999 }}>
                Регистрация
              </button>
            </div>
          )}
        </div>

        {/* FILTER ROW */}
        <div className="row" style={{ gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ width: 220, height: 46 }}
            value={cat}
            onChange={(e) => {
              // при смяна на категория -> рестартирай подкатегорията
              emit({ category: e.target.value, subcategory: "all" });
            }}
          >
            <option value="all">Всички категории</option>
            {categories.filter((c) => c && c !== "all").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="input"
            style={{ width: 220, height: 46 }}
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
            style={{ width: 140, height: 46 }}
            placeholder="Мин. цена"
            inputMode="decimal"
            value={minPrice}
            onChange={(e) => emit({ minPrice: e.target.value })}
          />

          <input
            className="input"
            style={{ width: 140, height: 46 }}
            placeholder="Макс. цена"
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => emit({ maxPrice: e.target.value })}
          />

          <input
            className="input"
            style={{ flex: 1, minWidth: 240, height: 46 }}
            placeholder="Търси продукт..."
            value={q}
            onChange={(e) => emit({ query: e.target.value })}
          />

          <button
            className="btn btnPrimary"
            style={{ height: 46, padding: "0 18px", borderRadius: 999 }}
            onClick={() => emit()}
          >
            Търси
          </button>

          <button
            className="btn"
            style={{ height: 46, borderRadius: 999 }}
            onClick={() => emit({ query: "", category: "all", subcategory: "all", minPrice: "", maxPrice: "" })}
          >
            Изчисти
          </button>
        </div>
      </div>
    </header>
  );
}
