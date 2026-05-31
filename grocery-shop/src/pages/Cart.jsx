import { useMemo, useState } from "react";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../firebase";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatMoneyEUR } from "../utils/money";

const STRIPE_ENABLED = import.meta.env.VITE_STRIPE_ENABLED === "true";
const CHECKOUT_PATH = import.meta.env.VITE_STRIPE_CREATE_CHECKOUT_URL || "/api/create-checkout-session";

function getCheckoutUrl() {
  if (/^https?:\/\//i.test(CHECKOUT_PATH)) return CHECKOUT_PATH;

  const canonicalOrigin =
    window.location.hostname === "ezirup.vercel.app"
      ? "https://ezigrup.vercel.app"
      : window.location.origin;

  return `${canonicalOrigin}${CHECKOUT_PATH.startsWith("/") ? "" : "/"}${CHECKOUT_PATH}`;
}

export default function Cart() {
  const { user } = useAuth();
  const { items, total, setQty, remove, clear } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [method, setMethod] = useState(STRIPE_ENABLED ? "stripe" : "cod"); // stripe | cod
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const totalEUR = useMemo(() => Number(total || 0), [total]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    if (searchParams.get("paid") === "1") {
      clear();
      showToast("Плащането е успешно. Поръчката е приета.");
      navigate("/cart", { replace: true });
    }

    if (searchParams.get("canceled") === "1") {
      setErr("Плащането е отказано. Количката е запазена.");
      navigate("/cart", { replace: true });
    }
  }, [clear, navigate, searchParams]);

  const orderItems = () =>
    items.map((i) => ({
      productId: i.id,
      name: i.name,
      price: Number(i.price || 0),
      qty: Number(i.qty || 1),
      imageUrl: i.imageUrl || "",
    }));

  // Stripe
  const payWithStripe = async () => {
    setErr("");
    if (!STRIPE_ENABLED) {
      return setErr("Stripe checkout още не е активиран в .env. Сложи VITE_STRIPE_ENABLED=true и рестартирай dev server-а.");
    }
    if (!user) return setErr("Трябва да си логнат.");
    if (!items.length) return setErr("Количката е празна.");

    setPaying(true);
    let orderRef = null;
    try {
      orderRef = await addDoc(collection(db, "orders"), {
        userId: user.uid,
        email: user.email,
        items: orderItems(),
        total: totalEUR,
        currency: "EUR",
        paymentMethod: "stripe",
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });

      const res = await fetch(getCheckoutUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderRef.id,
          items: orderItems(),
          clientUrl: window.location.origin,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Stripe error");

      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      if (orderRef?.id) {
        await deleteDoc(doc(db, "orders", orderRef.id)).catch(() => {});
      }
      setErr(e.message || "Stripe checkout не е активен в момента. Опитай пак след малко.");
      setPaying(false);
    }
  };

  // Наложен платеж
  const payWithCOD = async () => {
    setErr("");
    if (!user) return setErr("Трябва да си логнат.");
    if (!items.length) return setErr("Количката е празна.");

    setPaying(true);
    try {
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        email: user.email,
        items: items.map((i) => ({
          productId: i.id,
          name: i.name,
          price: Number(i.price || 0),
          qty: Number(i.qty || 1),
          imageUrl: i.imageUrl || "",
        })),
        total: totalEUR,
        currency: "EUR",
        paymentMethod: "cod",
        status: "new",
        createdAt: serverTimestamp(),
      });

      clear();
      showToast("Поръчката е приета успешно.");
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
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((x) => (
                <div key={x.id} className="card" style={{ padding: 12 }}>
                  <div className="row" style={{ alignItems: "center", gap: 12 }}>
                    <img
                      src={x.imageUrl || "/promo-fallback.jpg"}
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
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hr" />

            <div className="row">
              <div style={{ fontWeight: 950 }}>Общо:</div>
              <div className="spacer" />
              <div className="badge">{formatMoneyEUR(totalEUR)}</div>
            </div>

            <div className="hr" />

            <div style={{ display: "grid", gap: 10 }}>
              <label className="row" style={{ gap: 10 }}>
                <input type="radio" checked={method === "stripe"} onChange={() => setMethod("stripe")} />
                Плащане с карта (Stripe)
              </label>

              <label className="row" style={{ gap: 10 }}>
                <input type="radio" checked={method === "cod"} onChange={() => setMethod("cod")} />
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

      {toast && (
        <div className="toastOrder" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
