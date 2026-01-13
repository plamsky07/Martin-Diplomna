import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatMoneyEUR } from "../utils/money";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Cart() {
  const { user } = useAuth();
  const { items, total, setQty, remove, clear } = useCart();

  const [method, setMethod] = useState("stripe"); // stripe | cod
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");
  const totalEUR = useMemo(() => Number(total || 0), [total]);

  // 💳 Stripe
  const payWithStripe = async () => {
    setErr("");
    if (!user) return setErr("Трябва да си логнат.");
    if (!items.length) return setErr("Количката е празна.");

    setPaying(true);
    try {
      const res = await fetch(import.meta.env.VITE_STRIPE_CREATE_CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "", // ще се попълни от webhook-а
          items: items.map(i => ({
            productId: i.id,
            name: i.name,
            price: Number(i.price || 0),
            qty: Number(i.qty || 1),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) throw new Error("Stripe error");

      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setErr("Грешка при Stripe плащане.");
      setPaying(false);
    }
  };

  // 💵 Наложен платеж
  const payWithCOD = async () => {
    setErr("");
    if (!user) return setErr("Трябва да си логнат.");
    if (!items.length) return setErr("Количката е празна.");

    setPaying(true);
    try {
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        email: user.email,
        items: items.map(i => ({
          productId: i.id,
          name: i.name,
          price: Number(i.price || 0),
          qty: Number(i.qty || 1),
        })),
        total: totalEUR,
        currency: "EUR",
        paymentMethod: "cod",
        status: "new",
        createdAt: serverTimestamp(),
      });

      clear();
      alert("✅ Поръчката е приета (Наложен платеж)");
    } catch (e) {
      console.error(e);
      setErr("Грешка при създаване на поръчка.");
    } finally {
      setPaying(false);
    }
  };

  const submit = () => {
    if (method === "stripe") return payWithStripe();
    return payWithCOD();
  };

  return (
    <div className="container">
      <div className="card" style={{ padding: 18, borderRadius: 22 }}>
        <h1 className="h1">Количка</h1>
        <div className="hr" />

        {items.length === 0 ? (
          <p className="h2">Количката е празна.</p>
        ) : (
          <>
            {/* 🛒 ITEMS */}
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((x) => (
                <div key={x.id} className="card" style={{ padding: 12 }}>
                  <div className="row" style={{ alignItems: "center", gap: 12 }}>
                    <img
                      src={x.imageUrl || "/no-image.png"}
                      alt={x.name}
                      style={{
                        width: 80,
                        height: 60,
                        objectFit: "cover",
                        borderRadius: 12,
                      }}
                    />

                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 950 }}>{x.name}</div>
                      <div className="h2">{formatMoneyEUR(x.price)}</div>
                    </div>

                    <div className="spacer" />

                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={x.qty}
                      style={{ width: 80 }}
                      onChange={(e) => setQty(x.id, Number(e.target.value))}
                    />

                    <button className="btn btnDanger" onClick={() => remove(x.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hr" />

            {/* 💰 TOTAL */}
            <div className="row">
              <div style={{ fontWeight: 950 }}>Общо:</div>
              <div className="spacer" />
              <div className="badge">{formatMoneyEUR(totalEUR)}</div>
            </div>

            <div className="hr" />

            {/* 💳 PAYMENT METHOD */}
            <div style={{ display: "grid", gap: 10 }}>
              <label className="row" style={{ gap: 10 }}>
                <input
                  type="radio"
                  checked={method === "stripe"}
                  onChange={() => setMethod("stripe")}
                />
                Плащане с карта (Stripe)
              </label>

              <label className="row" style={{ gap: 10 }}>
                <input
                  type="radio"
                  checked={method === "cod"}
                  onChange={() => setMethod("cod")}
                />
                Наложен платеж
              </label>
            </div>

            {err && <div className="error" style={{ marginTop: 10 }}>{err}</div>}

            <button
              className="btn btnPrimary"
              style={{
                width: "100%",
                marginTop: 14,
                borderRadius: 16,
                height: 52,
                fontWeight: 950,
              }}
              onClick={submit}
              disabled={paying}
            >
              {paying
                ? "Обработвам..."
                : method === "stripe"
                ? "Плати със Stripe"
                : "Поръчай (Наложен платеж)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
