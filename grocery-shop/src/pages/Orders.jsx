import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { formatMoneyEUR } from "../utils/money";

function statusBadge(status) {
  const s = (status || "new").toLowerCase();
  const map = {
    new: { label: "new", bg: "rgba(59,130,246,0.12)", br: "rgba(59,130,246,0.20)" },
    paid: { label: "paid", bg: "rgba(16,185,129,0.14)", br: "rgba(16,185,129,0.22)" },
    canceled: { label: "canceled", bg: "rgba(239,68,68,0.12)", br: "rgba(239,68,68,0.20)" },
    cash_on_delivery: { label: "cash on delivery", bg: "rgba(245,158,11,0.14)", br: "rgba(245,158,11,0.22)" },
  };
  return map[s] || map.new;
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    const qy = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(qy, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user?.uid]);

  const totalSpent = useMemo(
    () => orders.reduce((s, o) => s + Number(o.total || 0), 0),
    [orders]
  );

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
          <h1 className="h1" style={{ margin: 0 }}>Поръчки</h1>
          <div className="spacer" />
          <span className="badge">Общо: {orders.length}</span>
          <span className="badge">Похарчено: {formatMoneyEUR(totalSpent)}</span>
        </div>

        <p className="h2" style={{ marginTop: 8 }}>
          История на всички твои поръчки (последните са най-отгоре).
        </p>

        <div className="hr" />

        {orders.length === 0 ? (
          <div className="h2" style={{ opacity: 0.8 }}>
            Нямаш поръчки още. (Спокойно — магазинът не е обиден.)
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {orders.map((o) => {
              const st = statusBadge(o.status);
              const isOpen = openId === o.id;
              const createdAt =
                o.createdAt?.toDate?.()?.toLocaleString("bg-BG") ||
                (o.createdAt ? String(o.createdAt) : "—");

              return (
                <div key={o.id} className="card" style={{ padding: 14, borderRadius: 22 }}>
                  <div className="row" style={{ alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 950 }}>
                      Поръчка #{o.id.slice(0, 8)}
                    </div>

                    <span
                      className="badge"
                      style={{ background: st.bg, border: `1px solid ${st.br}` }}
                    >
                      {st.label}
                    </span>

                    <div className="spacer" />

                    <div className="badge">{formatMoneyEUR(Number(o.total || 0))}</div>

                    <button
                      className="btn"
                      style={{ borderRadius: 999 }}
                      onClick={() => setOpenId(isOpen ? null : o.id)}
                    >
                      {isOpen ? "Скрий" : "Детайли"}
                    </button>
                  </div>

                  <div className="h2" style={{ marginTop: 8, opacity: 0.8 }}>
                    Дата: {createdAt} • Продукти: {(o.items?.length || 0)}
                  </div>

                  {isOpen && (
                    <>
                      <div className="hr" style={{ margin: "12px 0" }} />
                      <div style={{ display: "grid", gap: 10 }}>
                        {(o.items || []).map((it, idx) => (
                          <div key={idx} className="row" style={{ gap: 12, alignItems: "center" }}>
                            <div style={{ fontWeight: 900, minWidth: 220 }}>
                              {it.name || "Product"}
                            </div>
                            <span className="badge">x{Number(it.qty || 1)}</span>
                            <div className="spacer" />
                            <div className="badge">
                              {formatMoneyEUR(Number(it.price || 0))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {o.paymentMethod && (
                        <div className="h2" style={{ marginTop: 12, opacity: 0.8 }}>
                          Плащане: {o.paymentMethod}
                        </div>
                      )}
                      {o.stripeSessionId && (
                        <div className="h2" style={{ marginTop: 6, opacity: 0.8 }}>
                          Stripe Session: {o.stripeSessionId}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
