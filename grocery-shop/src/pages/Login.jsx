import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";

import AuthShell from "../components/AuthShell";

import { executePendingAction } from "../utils/executePending";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";

export default function Login() {
  const { login } = useAuth();
  const { add: addToCart } = useCart();
  const { toggle: toggleFav } = useFavorites();
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      await login(email.trim(), pass);
      nav("/");
      // ✅ изпълняваме pending action (ако има)
      const snap = await getDocs(collection(db, "products"));
      const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await executePendingAction({
        products,
        addToCart,
        toggleFav,
        navigate: nav,
      });

      nav("/", { replace: true });
    } catch (error) {
      if (error.message === "EMAIL_NOT_VERIFIED") {
        setErr("Моля, потвърди имейла си. Пратихме нов линк (провери и Spam).");
        return;
      }

      const code = error.code;

      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setErr("Грешна парола.");
      } else if (code === "auth/user-not-found") {
        setErr("Няма такъв потребител.");
      } else if (code === "auth/invalid-email") {
        setErr("Невалиден email адрес.");
      } else if (code === "auth/too-many-requests") {
        setErr("Твърде много опити. Опитай по-късно.");
      } else {
        setErr("Грешка при вход. Провери данните и опитай пак.");
      }

      console.log("LOGIN ERROR:", code, error.message);
    }
  };

  return (
    <AuthShell
      title="Вход"
      subtitle="Влез в профила си, за да добавяш продукти в количка и любими."
    >
      <h2 className="h1" style={{ fontSize: 26, marginBottom: 6 }}>Добре дошъл</h2>
      <p className="h2">Въведи email и парола.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          placeholder="Парола"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />

        {err && <div className="error">{err}</div>}

        <button className="btn btnPrimary" type="submit" style={{ width: "100%" }}>
          Влез
        </button>
      </form>

      <div className="row" style={{ marginTop: 14 }}>
        <Link to="/forgot-password" className="badge">Забравена парола</Link>
        <div className="spacer" />
        <span className="h2" style={{ margin: 0 }}>Нямаш акаунт?</span>
        <Link to="/register" className="badge">Регистрация</Link>
      </div>
    </AuthShell>
  );
}
