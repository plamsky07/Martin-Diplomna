import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    console.log("REGISTER CLICK ✅");

    if (!username.trim()) return setErr("Въведи потребителско име.");
    if (!email.trim()) return setErr("Въведи email.");
    if (pass.length < 6) return setErr("Паролата трябва да е поне 6 символа.");
    if (pass !== pass2) return setErr("Паролите не съвпадат.");

    setSaving(true);
    try {
      await register(email.trim(), pass, username.trim());
      nav("/"); // или "/login" ако искаш първо да влезе
    } catch (error) {
      console.log("REGISTER ERROR:", error);

      const code = error?.code;

      if (code === "auth/email-already-in-use") setErr("Този email вече е регистриран.");
      else if (code === "auth/invalid-email") setErr("Невалиден email адрес.");
      else if (code === "auth/weak-password") setErr("Паролата е слаба.");
      else if (code === "auth/operation-not-allowed") setErr("В Firebase не е включен Email/Password sign-in.");
      else setErr(error?.message || "Грешка при регистрация. Опитай пак.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell title="Регистрация" subtitle="Създай акаунт, за да ползваш количка и любими.">
      <h2 className="h1" style={{ fontSize: 26, marginBottom: 6 }}>Създай акаунт</h2>
      <p className="h2">Попълни данните си.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          placeholder="Парола (мин. 6 символа)"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        <input
          className="input"
          placeholder="Повтори паролата"
          type="password"
          value={pass2}
          onChange={(e) => setPass2(e.target.value)}
        />

        {err && <div className="error">{err}</div>}

        <button className="btn btnPrimary" type="submit" disabled={saving} style={{ width: "100%" }}>
          {saving ? "Създавам..." : "Създай акаунт"}
        </button>
      </form>

      <div className="row" style={{ marginTop: 14 }}>
        <span className="h2" style={{ margin: 0 }}>Имаш акаунт?</span>
        <Link to="/login" className="badge">Вход</Link>
      </div>
    </AuthShell>
  );
}
