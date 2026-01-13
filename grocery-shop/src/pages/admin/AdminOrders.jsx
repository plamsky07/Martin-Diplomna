import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { formatMoneyEUR } from "../../utils/money";

function StatusBadge({ status }) {
  const map = {
    new: { t: "NEW (COD)", bg: "rgba(16,185,129,0.14)", bd: "rgba(16,185,129,0.25)" },
    pending_payment: { t: "PENDING (Stripe)", bg: "rgba(245,158,11,0.16)", bd: "rgba(245,158,11,0.26)" },
    paid: { t: "PAID", bg: "rgba(59,130,246,0.16)", bd: "rgba(59,130,246,0.26)" },
    shipped: { t: "SHIPPED", bg: "rgba(139,92,246,0.16)", bd: "rgba(139,92,246,0.26)" },
    cancelled: { t: "CANCELLED", bg: "rgba(239,68,68,0.14)", bd: "rgba(239,68,68,0.24)" },
  };
  const s = map[status] || { t: status || "—", bg: "rgba(148,163,184,0.18)", bd: "rgba(148,163,184,0.28)" };

  return (
    <span
      className="badge"
      style={{
        background: s.bg,
        border: `1px solid ${s.bd}`,
        fontWeight: 950,
      }}
      title={status}
    >
      {s.t}
    </span>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [qText, setQText] = useState("");

  useEffect(() => {
    const qy = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qy, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    return orders.filter((o) => {
      const okStatus = statusFilter === "all" ? true : (o.status || "new") === statusFilter;

      const hay = [
        o.id,
        o.email,
        o.userId,
        o.paymentMethod,
        o.status,
        ...(o.items || []).map((it) => it.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const okText = !t ? true : hay.includes(t);
      return okStatus && okText;
    });
  }, [orders, statusFilter, qText]);

  const stats = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter((o) => o.status === "paid").length;
    const pending = orders.filter((o) => o.status === "pending_payment").length;
    const codNew = orders.filter((o) => (o.status || "new") === "new" && o.paymentMethod === "cod").length;
    const revenue = orders.reduce((s, o) => s + (o.status === "paid" ? Number(o.total || 0) : 0), 0);
    return { total, paid, pending, codNew, revenue };
  }, [orders]);

  const setStatus = async (orderId, nextStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.log(e);
      alert("Грешка при промяна на статус.");
    }
  };

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
          <h1 className="h1" style={{ margin: 0 }}>Admin • Orders</h1>
          <div className="spacer" />
          <span className="badge">Live</span>
        </div>

        <p className="h2" style={{ marginTop: 8, opacity: 0.85 }}>
          Управление на поръчки: Stripe / Наложен платеж, статуси и търсене.
        </p>

        <div className="hr" />

        {/* TOP STATS */}
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          }}
        >
          <div className="card" style={{ padding: 14, borderRadius: 18, background: "rgba(59,130,246,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Общо поръчки</div>
            <div style={{ fontSize: 28, fontWeight: 980, marginTop: 6 }}>{stats.total}</div>
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 18, background: "rgba(16,185,129,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Оборот (само paid)</div>
            <div style={{ fontSize: 28, fontWeight: 980, marginTop: 6 }}>{formatMoneyEUR(stats.revenue)}</div>
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 18, background: "rgba(245,158,11,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Pending (Stripe)</div>
            <div style={{ fontSize: 28, fontWeight: 980, marginTop: 6 }}>{stats.pending}</div>
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 18, background: "rgba(139,92,246,0.10)" }}>
            <div style={{ fontWeight: 950 }}>Нови COD</div>
            <div style={{ fontSize: 28, fontWeight: 980, marginTop: 6 }}>{stats.codNew}</div>
          </div>
        </div>

        <div className="hr" />

        {/* FILTERS */}
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ width: 220, height: 46 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Всички статуси</option>
            <option value="new">NEW (COD)</option>
            <option value="pending_payment">PENDING (Stripe)</option>
            <option value="paid">PAID</option>
            <option value="shipped">SHIPPED</option>
            <option value="cancelled">CANCELLED</option>
          </select>

          <input
            className="input"
            style={{ flex: 1, minWidth: 260, height: 46 }}
            placeholder="Търси по имейл, orderId, продукт..."
            value={qText}
            onChange={(e) => setQText(e.target.value)}
          />
        </div>

        <div className="hr" />

        {/* LIST */}
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((o) => (
            <div key={o.id} className="card" style={{ padding: 14, borderRadius: 18 }}>
              <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 950 }}>#{o.id}</div>
                <StatusBadge status={o.status || "new"} />
                <span className="badge">{(o.paymentMethod || "—").toUpperCase()}</span>
                <div className="spacer" />
                <span className="badge">{formatMoneyEUR(o.total)}</span>
              </div>

              <div style={{ marginTop: 8, opacity: 0.85 }}>
                <div><b>Email:</b> {o.email || "—"}</div>
                <div><b>UserId:</b> {o.userId || "—"}</div>
              </div>

              <div className="hr" style={{ margin: "12px 0" }} />

              <div style={{ display: "grid", gap: 6 }}>
                {(o.items || []).map((it, idx) => (
                  <div key={idx} className="row" style={{ gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{it.name}</div>
                    <div className="spacer" />
                    <span className="badge">x{it.qty}</span>
                    <span className="badge">{formatMoneyEUR(Number(it.price || 0))}</span>
                  </div>
                ))}
              </div>

              <div className="hr" style={{ margin: "12px 0" }} />

              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => setStatus(o.id, "paid")}>
                  Mark PAID
                </button>
                <button className="btn" onClick={() => setStatus(o.id, "shipped")}>
                  Mark SHIPPED
                </button>
                <button className="btn btnDanger" onClick={() => setStatus(o.id, "cancelled")}>
                  Cancel
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="h2" style={{ margin: 0 }}>
              Няма поръчки по тези филтри.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
