import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

const navLinkClass = ({ isActive }) => `navPill${isActive ? " active" : ""}`;

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
    <header className="siteHeader">
      <div className="container">
        <div className="navTop">
          <Link to="/" className="brand">
            <span className="brandMark">Е</span>
            ЕзиГруп
          </Link>

          <div className="spacer" />

          <div className="navLinks">
            <NavLink to="/" className={navLinkClass}>Продукти</NavLink>
            <NavLink to="/favorites" className={navLinkClass}>Любими ({favCount})</NavLink>
            <NavLink to="/cart" className={navLinkClass}>Количка ({cartCount})</NavLink>
            {user && <NavLink to="/orders" className={navLinkClass}>Поръчки</NavLink>}

            {profile?.role === "admin" && (
              <>
                <NavLink to="/admin" className={navLinkClass}>Админ продукти</NavLink>
                <NavLink to="/admin/orders" className={navLinkClass}>Админ поръчки</NavLink>
                <NavLink to="/admin/users" className={navLinkClass}>Потребители</NavLink>
                <NavLink to="/admin/dashboard" className={navLinkClass}>Табло</NavLink>
              </>
            )}
          </div>

          {user ? (
            <div ref={accRef} style={{ position: "relative" }}>
              <button className="btn" onClick={() => setOpenAcc((v) => !v)} style={{ borderRadius: 999 }}>
                Акаунт
              </button>

              {openAcc && (
                <div className="card accountMenu">
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Профил</div>
                  <div className="h2" style={{ marginTop: 6 }}>{user.email}</div>

                  <div className="hr" style={{ margin: "12px 0" }} />

                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge">Потребител: {profile?.username || "-"}</span>
                    <span className="badge">Роля: {profile?.role || "user"}</span>
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
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={() => goAuth("/login")} style={{ borderRadius: 999 }}>
                Вход
              </button>
              <button className="btn btnPrimary" onClick={() => goAuth("/register")} style={{ borderRadius: 999 }}>
                Регистрация
              </button>
            </div>
          )}
        </div>

        <div className="filterBar">
          <select
            className="input"
            value={cat}
            onChange={(e) => emit({ category: e.target.value, subcategory: "all" })}
          >
            <option value="all">Всички категории</option>
            {categories.filter((c) => c && c !== "all").map((c) => (
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
      </div>
    </header>
  );
}
