import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export default function AdminUsers() {
  const { user, profile, resetPassword } = useAuth();

  const [users, setUsers] = useState([]);
  const [qText, setQText] = useState("");
  const [onlyAdmins, setOnlyAdmins] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const qy = query(collection(db, "users"));
    const unsub = onSnapshot(
      qy,
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => {
        console.log(e);
        setErr("Нямаш права да четеш users. Провери Firestore Rules.");
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    return users.filter((u) => {
      if (onlyAdmins && u.role !== "admin") return false;
      if (!t) return true;
      return (
        (u.email || "").toLowerCase().includes(t) ||
        (u.username || "").toLowerCase().includes(t)
      );
    });
  }, [users, qText, onlyAdmins]);

  const setAdmin = async (uid, makeAdmin) => {
    setMsg(""); setErr("");
    if (profile?.role !== "admin") return setErr("Само админ може да прави админи.");

    if (uid === user?.uid) return setErr("Не можеш да променяш собствената си роля (за да не се самоубиеш административно 😄).");

    const ok = confirm(makeAdmin ? "Да направя този потребител ADMIN?" : "Да сваля ADMIN правата?");
    if (!ok) return;

    try {
      await updateDoc(doc(db, "users", uid), { role: makeAdmin ? "admin" : "user" });
      setMsg(makeAdmin ? "Потребителят е направен admin ✅" : "Admin правата са махнати ✅");
    } catch (e) {
      console.log(e);
      setErr("Грешка при промяна на role. Провери Firestore Rules.");
    }
  };

  const resetUserPassword = async (email) => {
    setMsg(""); setErr("");
    const cleanEmail = (email || "").trim();
    if (!cleanEmail) return setErr("Няма email за този потребител.");

    const ok = confirm(`Да изпратя линк за смяна на парола на:\n${cleanEmail} ?`);
    if (!ok) return;

    try {
      await resetPassword(cleanEmail);
      setMsg(`Reset email е изпратен до ${cleanEmail} ✅ Провери и Spam/Promotions.`);
    } catch (e) {
      console.log(e);
      const code = e?.code || "";
      if (code === "auth/invalid-email") setErr("Невалиден email адрес.");
      else if (code === "auth/user-not-found") setErr("Няма Firebase Auth акаунт с този email.");
      else if (code === "auth/unauthorized-continue-uri") setErr("Reset домейнът не е разрешен във Firebase Authentication.");
      else if (code === "auth/too-many-requests") setErr("Твърде много опити. Опитай пак след малко.");
      else setErr(`Не успях да изпратя reset email${code ? ` (${code})` : ""}.`);
    }
  };

  if (profile?.role !== "admin") {
    return (
      <div className="container">
        <div className="card" style={{ padding: 16 }}>
          <b>Нямаш достъп.</b>
        </div>
      </div>
    );
  }
const setBan = async (uid, banned) => {
  setMsg(""); setErr("");
  if (profile?.role !== "admin") return setErr("Само админ може да банва.");
  if (uid === user?.uid) return setErr("Не можеш да баннеш себе си.");

  const ok = confirm(banned ? "Да BAN-на този потребител?" : "Да махна BAN-а?");
  if (!ok) return;

  try {
    await updateDoc(doc(db, "users", uid), { banned });
    setMsg(banned ? "Потребителят е BAN-нат ✅" : "BAN-ът е махнат ✅");
  } catch (e) {
    console.log(e);
    setErr("Грешка при BAN. Провери Firestore Rules.");
  }
};
  return (
    <div className="container">
      <div className="card" style={{ padding: 16, borderRadius: 22 }}>
        <div className="row" style={{ alignItems: "baseline" }}>
          <h1 className="h1" style={{ margin: 0 }}>Admin • Потребители</h1>
          <div className="spacer" />
          <span className="badge">Общо: {users.length}</span>
        </div>

        <div className="hr" />

        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 260 }}
            placeholder="Търси по имейл или username…"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
          />

          <button
            className={"btn " + (onlyAdmins ? "btnPrimary" : "")}
            onClick={() => setOnlyAdmins(v => !v)}
          >
            {onlyAdmins ? "Само админи ✓" : "Само админи"}
          </button>
        </div>

        {err && <div className="error" style={{ marginTop: 10 }}>{err}</div>}
        {msg && <div className="success" style={{ marginTop: 10 }}>{msg}</div>}

        <div className="hr" />

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((u) => (
            <div key={u.id} className="card" style={{ padding: 14, borderRadius: 18 }}>
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 260 }}>
                  <div style={{ fontWeight: 950 }}>
                    {u.username || "—"}{" "}
                    <span className="badge" style={{ marginLeft: 8 }}>
                      {u.role || "user"}
                    </span>
                    {u.id === user?.uid ? (
                      <span className="badge" style={{ marginLeft: 8 }}>ти</span>
                    ) : null}
                  </div>
                  <div className="h2" style={{ margin: 0, opacity: 0.8 }}>
                    {u.email || "—"}
                  </div>
                </div>

                <div className="spacer" />

                <button
                  className="btn"
                  onClick={() => resetUserPassword(u.email)}
                  title="Изпраща email за смяна на парола"
                >
                  Reset password
                </button>

                <button
                  className={u.role === "admin" ? "btn" : "btn btnPrimary"}
                  onClick={() => setAdmin(u.id, u.role !== "admin")}
                  disabled={u.id === user?.uid}
                  title="Промени ролята"
                >
                  {u.role === "admin" ? "Свали admin" : "Направи admin"}
                </button>
                <button
                className={u.banned ? "btn btnPrimary" : "btn btnDanger"}
                onClick={() => setBan(u.id, !u.banned)}
                disabled={u.id === user?.uid}
                title="Бан / Unban"
                >
                {u.banned ? "Unban" : "Ban"}
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="h2">Няма намерени потребители.</p>
          )}
        </div>
      </div>
    </div>
  );
}
