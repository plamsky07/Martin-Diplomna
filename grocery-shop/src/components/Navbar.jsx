import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

const navLinkClass = ({ isActive }) => `navPill${isActive ? " active" : ""}`;

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { count: favCount } = useFavorites();
  const isAdmin = profile?.role === "admin";

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
            <NavLink to="/cart" className={navLinkClass}>Количка ({cartCount})</NavLink>
            {!isAdmin && (
              <>
                <NavLink to="/favorites" className={navLinkClass}>Любими ({favCount})</NavLink>
                {user && <NavLink to="/orders" className={navLinkClass}>Поръчки</NavLink>}
              </>
            )}

            {isAdmin && (
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

      </div>
    </header>
  );
}
