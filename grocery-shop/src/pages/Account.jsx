import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where, deleteDoc, doc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatMoneyEUR } from "../utils/money"; 

export default function Account() {
  const { user, profile, updateUsername, resendVerification } = useAuth();

  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [orders, setOrders] = useState([]);
  const nav = useNavigate();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setUsername(profile?.username || "");
  }, [profile?.username]);

  // ✅ My orders (последни 5)
  useEffect(() => {
    if (!user?.uid) return;
    if (profile?.role === "admin") {
      setOrders([]);
      return;
    }

    const qy = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(qy, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(all.slice(0, 5));
    });
    return () => unsub();
  }, [profile?.role, user?.uid]);

  const save = async () => {
    setMsg(""); setErr("");
    if (!username.trim()) return setErr("Username не може да е празен.");
    setSaving(true);
    try {
      await updateUsername(username.trim());
      setMsg("Запазено ✅");
    } catch (e) {
      console.log(e);
      setErr("Грешка при запис.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    const ok = confirm("Сигурен ли си? Това ще изтрие профила ти и данните му.");
    if (!ok) return;

    setDeleting(true);
    try {
      // 1) трием профилния документ
      await deleteDoc(doc(db, "users", auth.currentUser.uid));

      // 2) трием auth акаунта
      await deleteUser(auth.currentUser);

      // 3) редирект
      nav("/register");
    } catch (e) {
      console.log(e);
      if (e?.code === "auth/requires-recent-login") {
        alert("За изтриване трябва да влезеш отново (security). Излез и влез пак, после пробвай пак.");
      } else {
        alert("Грешка при изтриване.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const emailVerified = !!user?.emailVerified; 

  const roleLabel = useMemo(() => {
    const r = profile?.role || "user";
    return r === "admin" ? "admin" : "user";
  }, [profile?.role]);
  const isAdmin = roleLabel === "admin";

  return (
    <div className="container">
      <div
        className="card"
        style={{
          padding: 18,
          borderRadius: 22,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(17,24,39,0.06)",
          boxShadow: "0 16px 40px rgba(17,24,39,0.08)",
        }}
      >
        <div className="row" style={{ alignItems: "baseline" }}>
          <h1 className="h1" style={{ margin: 0 }}>Акаунт</h1>
          <div className="spacer" />
          <span className="badge">👤 {roleLabel}</span>
          <span className="badge">{emailVerified ? "✅ Verified" : "⚠️ Not verified"}</span>
        </div>

        <p className="h2" style={{ marginTop: 8 }}>
          Управлявай профила си, сигурността и поръчките.
        </p>

        <div className="hr" />

        {/* 3 cards */}
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: isAdmin ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))" }}>
          {/* Profile */}
          {!isAdmin && <div className="card" style={{ padding: 16, borderRadius: 22, background: "rgba(17,24,39,0.02)", border: "1px solid rgba(17,24,39,0.06)" }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>🧾 Профил</div>

            <div className="h2" style={{ margin: "6px 0" }}>Имейл</div>
            <div className="badge" style={{ width: "fit-content" }}>{user?.email}</div>

            <div className="h2" style={{ margin: "14px 0 6px" }}>Username</div>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              style={{ height: 46 }}
            />

            <button
              className="btn btnPrimary"
              style={{ width: "100%", marginTop: 12, borderRadius: 16, height: 48, fontWeight: 950 }}
              onClick={save}
              disabled={saving}
            >
              {saving ? "Запис..." : "Запази"}
            </button>

            {msg ? <div className="success" style={{ marginTop: 10 }}>{msg}</div> : null}
            {err ? <div className="error" style={{ marginTop: 10 }}>{err}</div> : null}
          </div>}

          {/* Security */}
          <div className="card" style={{ padding: 16, borderRadius: 22, background: "rgba(17,24,39,0.02)", border: "1px solid rgba(17,24,39,0.06)" }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>🔐 Сигурност</div>

            {!emailVerified ? (
              <>
                <div className="h2" style={{ marginBottom: 10 }}>
                  Имейлът ти не е потвърден. Потвърди го, за да няма блокажи по плащане/поръчки.
                </div>
                <button
                  className="btn"
                  style={{ width: "100%", borderRadius: 16, height: 48, fontWeight: 950 }}
                  onClick={resendVerification}
                >
                  Изпрати имейл за потвърждение
                </button>
              </>
            ) : (
              <div className="h2">Имейлът е потвърден ✅</div>
            )}

            <div className="hr" style={{ margin: "14px 0" }} />

            <div className="h2" style={{ marginBottom: 10 }}>
              Смяна на парола (ще ти е готово от Forgot Password).
            </div>

            <a className="btn btnPrimary" href="/forgot-password" style={{ width: "100%", borderRadius: 16, height: 48, fontWeight: 950, display: "grid", placeItems: "center" }}>
              Смени парола
            </a>

            <button
              className="btn btnDanger"
              style={{ width: "100%", marginTop: 12, borderRadius: 16, height: 48, fontWeight: 950 }}
              onClick={deleteAccount}
              disabled={deleting}
            >
              {deleting ? "Трия..." : "Изтрий акаунт"}
            </button>
          </div>

          {/* Orders */}
          <div className="card" style={{ padding: 16, borderRadius: 22, background: "rgba(17,24,39,0.02)", border: "1px solid rgba(17,24,39,0.06)" }}>
            <div className="row" style={{ alignItems: "center" }}>
              <div style={{ fontWeight: 950 }}>📦 Моите поръчки</div>
              <div className="spacer" />
              <span className="badge">{orders.length}</span>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {orders.map((o) => (
                <div key={o.id} className="card" style={{ padding: 12, borderRadius: 18 }}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <div style={{ fontWeight: 950 }}>#{o.id.slice(0, 6)}</div>
                    <div className="spacer" />
                    <span className="badge">{o.status || "new"}</span>
                  </div>

                  <div className="row" style={{ marginTop: 8, alignItems: "center" }}>
                    <div className="h2" style={{ margin: 0 }}>
                      {(o.items?.length || 0)} продукта
                    </div>
                    <div className="spacer" />
                    <div className="badge">{formatMoneyEUR(Number(o.total || 0))}</div>
                  </div>
                </div>
              ))}

              {orders.length === 0 ? (
                <div className="h2" style={{ opacity: 0.8 }}>
                  Още нямаш поръчки.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* mobile responsive */}
        <style>{`
          @media (max-width: 980px){
            .container > .card > div[style*="grid-template-columns: repeat(3"]{
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
