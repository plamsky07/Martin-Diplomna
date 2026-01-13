import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    try {
      await resetPassword(email);
      setMsg("Изпратихме линк за смяна на паролата на този email.");
    } catch (error) {
      const code = error.code;

      if (code === "auth/invalid-email") setErr("Невалиден email адрес.");
      else if (code === "auth/user-not-found") setErr("Няма акаунт с този email.");
      else setErr("Грешка при изпращане. Опитай пак.");
      console.log("RESET ERROR:", code, error.message);
    }
  };

  return (
    <AuthShell
      title="Забравена парола"
      subtitle="Ще изпратим линк за промяна на паролата на твоя email."
    >
      <h2 className="h1" style={{ fontSize: 26, marginBottom: 6 }}>Възстановяване</h2>
      <p className="h2">Въведи email адреса си.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {msg && <div className="success">{msg}</div>}
        {err && <div className="error">{err}</div>}

        <button className="btn btnPrimary" type="submit" style={{ width: "100%" }}>
          Изпрати линк
        </button>
      </form>

      <div className="row" style={{ marginTop: 14 }}>
        <Link to="/login" className="badge">Назад към вход</Link>
      </div>
    </AuthShell>
  );
}
