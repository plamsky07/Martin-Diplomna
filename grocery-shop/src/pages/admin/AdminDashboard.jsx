import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import { doc, getDocs,  where, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { formatMoneyEUR } from "../../utils/money";
import { CATEGORY_TREE } from "../../utils/categories";
function AdminRoleManager({ orders }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const { profile } = useAuth();
  const paidRevenue = (orders || [])
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const makeAdmin = async () => {
    setMsg(""); setErr("");
    if (profile?.role !== "admin") return setErr("Нямаш права.");

    const e = email.trim().toLowerCase();
    if (!e) return setErr("Въведи имейл.");

    // намираме users документ по email
    const qs = await getDocs(query(collection(db, "users"), where("email", "==", e)));
    if (qs.empty) return setErr("Няма такъв потребител в users.");

    const userDoc = qs.docs[0];
    await updateDoc(doc(db, "users", userDoc.id), { role: "admin" });

    setMsg(`✅ ${e} вече е admin`);
    setEmail("");
  };

  return (
    <div className="card" style={{ padding: 16, borderRadius: 18 }}>
      <div style={{ fontWeight: 950, fontSize: 16 }}>Админ права</div>
      <div className="h2" style={{ marginTop: 6, opacity: 0.8 }}>
        Въведи имейл на потребител, за да го направиш admin.
      </div>

      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" />
        <button className="btn btnPrimary" type="button" onClick={makeAdmin}>Направи admin</button>
      </div>

      {err && <div className="error" style={{ marginTop: 10 }}>{err}</div>}
      {msg && <div className="success" style={{ marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

function StatCard({ title, value, subtitle, emoji, accent = "a" }) {
  const accents = {
    a: { bg: "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.10))", border: "rgba(59,130,246,0.22)" },
    b: { bg: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(34,197,94,0.10))", border: "rgba(16,185,129,0.22)" },
    c: { bg: "linear-gradient(135deg, rgba(245,158,11,0.20), rgba(251,191,36,0.10))", border: "rgba(245,158,11,0.24)" },
    d: { bg: "linear-gradient(135deg, rgba(236,72,153,0.18), rgba(244,114,182,0.10))", border: "rgba(236,72,153,0.22)" },
    e: { bg: "linear-gradient(135deg, rgba(148,163,184,0.22), rgba(203,213,225,0.10))", border: "rgba(148,163,184,0.28)" },
    f: { bg: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(167,139,250,0.10))", border: "rgba(139,92,246,0.22)" },
  };

  const s = accents[accent] || accents.a;

  return (
    <div
      className="card"
      style={{
        padding: 18,
        borderRadius: 22,
        background: s.bg,
        border: `1px solid ${s.border}`,
        boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
        position: "relative",
        overflow: "hidden",
        minHeight: 130,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -10,
          top: -10,
          fontSize: 68,
          opacity: 0.14,
          transform: "rotate(12deg)",
          userSelect: "none",
        }}
      >
        {emoji}
      </div>

      <div style={{ fontWeight: 950, fontSize: 14, letterSpacing: 0.3, opacity: 0.85 }}>
        {title}
      </div>

      <div style={{ marginTop: 10, fontWeight: 980, fontSize: 34, lineHeight: 1.05 }}>
        {value}
      </div>

      {subtitle ? (
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function formatMoneyBGN(x) {
  const n = Number(x || 0);
  return n.toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " лв";
}
function TrafficChart({ data, max, summary }) {
  const w = 860, h = 220, pad = 18;

  const points = data.map((x, i) => {
    const xPos = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
    const yPos = h - pad - (x.count / Math.max(1, max)) * (h - pad * 2);
    return { ...x, xPos, yPos };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.xPos.toFixed(2)} ${p.yPos.toFixed(2)}`).join(" ");
  const areaD = `${pathD} L ${points.at(-1).xPos.toFixed(2)} ${(h - pad).toFixed(2)} L ${points[0].xPos.toFixed(2)} ${(h - pad).toFixed(2)} Z`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="row" style={{ alignItems: "baseline" }}>
        <div style={{ fontWeight: 950, fontSize: 16 }}>Трафик</div>
        <div className="spacer" />
        <span className="badge">Views + Uniques • 14 дни</span>
      </div>

      {/* mini stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        <div className="card" style={{ padding: 12, borderRadius: 16, background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.18)" }}>
          <div style={{ fontWeight: 900, opacity: 0.85 }}>Днес</div>
          <div style={{ fontSize: 18, fontWeight: 980 }}>
            {summary.today} <span style={{ opacity: 0.6, fontWeight: 900 }}>• {summary.uniqueToday} uniq</span>
          </div>
        </div>

        <div className="card" style={{ padding: 12, borderRadius: 16, background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.18)" }}>
          <div style={{ fontWeight: 900, opacity: 0.85 }}>7 дни</div>
          <div style={{ fontSize: 18, fontWeight: 980 }}>
            {summary.total7} <span style={{ opacity: 0.6, fontWeight: 900 }}>• {summary.unique7} uniq</span>
          </div>
        </div>

        <div className="card" style={{ padding: 12, borderRadius: 16, background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.18)" }}>
          <div style={{ fontWeight: 900, opacity: 0.85 }}>14 дни</div>
          <div style={{ fontSize: 18, fontWeight: 980 }}>
            {summary.total14} <span style={{ opacity: 0.6, fontWeight: 900 }}>• {summary.unique14} uniq</span>
          </div>
        </div>

        <div className="card" style={{ padding: 12, borderRadius: 16, background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.18)" }}>
          <div style={{ fontWeight: 900, opacity: 0.85 }}>Пик</div>
          <div style={{ fontSize: 16, fontWeight: 980 }}>
            {summary.peak.count} <span style={{ opacity: 0.65, fontWeight: 900 }}>({summary.peak.day.slice(5)})</span>
          </div>
        </div>
      </div>

      {/* chart */}
      <div className="card" style={{ padding: 14, borderRadius: 18, background: "rgba(17,24,39,0.03)", border: "1px solid rgba(17,24,39,0.06)" }}>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="240" style={{ display: "block" }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59,130,246,0.95)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.75)" />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59,130,246,0.22)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((t) => {
            const y = h - pad - t * (h - pad * 2);
            return <line key={t} x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(17,24,39,0.08)" strokeDasharray="6 6" />;
          })}

          <path d={areaD} fill="url(#areaGrad)" />
          <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" />

          {points.map((p) => (
            <g key={p.day}>
              <circle cx={p.xPos} cy={p.yPos} r="6" fill="rgba(255,255,255,0.95)" stroke="rgba(59,130,246,0.55)" strokeWidth="2" />
              <title>{`${p.day}: ${p.count} views • ${p.uniques} unique`}</title>
            </g>
          ))}

          {points.map((p, i) => (i % 2 ? null : (
            <text key={p.day} x={p.xPos} y={h - 2} textAnchor="middle" fontSize="12" fill="rgba(17,24,39,0.55)">
              {p.day.slice(5)}
            </text>
          )))}
        </svg>
      </div>
    </div>
  );
}

function RealtimeMini({ buckets, max, activeUsers, total }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="row" style={{ alignItems: "baseline" }}>
        <div style={{ fontWeight: 950, fontSize: 16 }}>Real-time</div>
        <div className="spacer" />
        <span className="badge">последни 5 мин</span>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <span className="badge">Събития: <b>{total}</b></span>
        <span className="badge">Активни потребители: <b>{activeUsers}</b></span>
      </div>

      <div
        className="card"
        style={{
          padding: 14,
          borderRadius: 18,
          background: "rgba(17,24,39,0.03)",
          border: "1px solid rgba(17,24,39,0.06)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, alignItems: "end", height: 120 }}>
          {buckets.map((b) => {
            const h = Math.round((b.count / Math.max(1, max)) * 100);
            return (
              <div key={b.label} style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                <div
                  title={`${b.label}: ${b.count}`}
                  style={{
                    width: "100%",
                    height: `${Math.max(8, h)}%`,
                    borderRadius: 999,
                    background: "linear-gradient(180deg, rgba(16,185,129,0.30), rgba(34,197,94,0.14))",
                    border: "1px solid rgba(16,185,129,0.22)",
                    boxShadow: "0 10px 18px rgba(17,24,39,0.08)",
                  }}
                />
                <div style={{ fontSize: 12, opacity: 0.7 }}>{b.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniBars({ title, badge, data, max, accent = "blue", footerLeft, footerRight }) {
  const theme = {
    blue: {
      bar: "linear-gradient(180deg, rgba(59,130,246,0.40), rgba(99,102,241,0.18))",
      border: "rgba(59,130,246,0.22)",
      bg: "rgba(59,130,246,0.06)",
    },
    green: {
      bar: "linear-gradient(180deg, rgba(16,185,129,0.42), rgba(34,197,94,0.18))",
      border: "rgba(16,185,129,0.22)",
      bg: "rgba(16,185,129,0.06)",
    },
    amber: {
      bar: "linear-gradient(180deg, rgba(245,158,11,0.44), rgba(251,191,36,0.18))",
      border: "rgba(245,158,11,0.24)",
      bg: "rgba(245,158,11,0.07)",
    },
    violet: {
      bar: "linear-gradient(180deg, rgba(139,92,246,0.44), rgba(167,139,250,0.18))",
      border: "rgba(139,92,246,0.24)",
      bg: "rgba(139,92,246,0.07)",
    },
  };
  const t = theme[accent] || theme.blue;

  return (
    <div className="card" style={{ padding: 16, borderRadius: 22, background: "rgba(255,255,255,0.88)" }}>
      <div className="row" style={{ alignItems: "baseline" }}>
        <div style={{ fontWeight: 950 }}>{title}</div>
        <div className="spacer" />
        <span className="badge">{badge}</span>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          gap: 8,
          alignItems: "end",
          height: 170,
          padding: 12,
          borderRadius: 18,
          background: t.bg,
          border: `1px solid ${t.border}`,
        }}
      >
        {data.map((x) => {
          const h = Math.round((x.value / max) * 100);
          return (
            <div key={x.day} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
              <div
                title={`${x.day}: ${x.value}`}
                style={{
                  width: "100%",
                  height: `${Math.max(6, h)}%`,
                  borderRadius: 999,
                  background: t.bar,
                  border: `1px solid ${t.border}`,
                  boxShadow: "0 10px 18px rgba(17,24,39,0.08)",
                }}
              />
              <div style={{ fontSize: 11, opacity: 0.65 }}>{x.day.slice(5)}</div>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 12, opacity: 0.85 }}>
        <div className="badge">{footerLeft}</div>
        <div className="spacer" />
        <div className="badge">{footerRight}</div>
      </div>
    </div>
  );
}

function OrdersBars({ days, max, total }) {
  return (
    <MiniBars
      title="Поръчки"
      badge="Orders / 14 дни"
      data={days.map((d) => ({ day: d.day, value: d.count }))}
      max={max}
      accent="violet"
      footerLeft={`Общо (14 дни): ${total}`}
      footerRight={`Макс/ден: ${max}`}
    />
  );
}

function RevenueBars({ days, max, totalEUR, formatMoneyEUR }) {
  return (
    <MiniBars
      title="Оборот"
      badge="Paid revenue / 14 дни"
      data={days.map((d) => ({ day: d.day, value: d.sumEUR }))}
      max={max}
      accent="green"
      footerLeft={`Общо: ${formatMoneyEUR(totalEUR)}`}
      footerRight={`Пик/ден: ${formatMoneyEUR(max)}`}
    />
  );
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [events, setEvents] = useState([]);
    
    useEffect(() => {
    const ue = onSnapshot(query(collection(db, "events")), (s) =>
        setEvents(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => ue();
    }, []);
  useEffect(() => {
    const up = onSnapshot(query(collection(db, "products")), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const uo = onSnapshot(query(collection(db, "orders")), (s) =>
      setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => { up(); uo(); };
  }, []);
const traffic = useMemo(() => {
  const views = events.filter(e => e.type === "page_view" && e.createdAt);

  const toDayKey = (dt) => dt.toISOString().slice(0, 10);

  // map: YYYY-MM-DD -> {count, visitors:Set}
  const map = new Map();

  views.forEach(e => {
    const dt = e.createdAt?.toDate?.() || null;
    if (!dt) return;
    const key = toDayKey(dt);
    if (!map.has(key)) map.set(key, { count: 0, visitors: new Set() });
    const obj = map.get(key);
    obj.count += 1;
    obj.visitors.add(e.visitorId || e.userId || "anon");
  });

  // последни 14 дни
  const days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = toDayKey(d);
    const obj = map.get(key);
    days.push({
      day: key,
      count: obj?.count || 0,
      uniques: obj ? obj.visitors.size : 0,
    });
  }

  const max = Math.max(1, ...days.map(x => x.count));

  const total14 = days.reduce((s, x) => s + x.count, 0);
  const unique14 = new Set(views.map(v => v.visitorId || v.userId || "anon")).size;

  const last7 = days.slice(-7);
  const total7 = last7.reduce((s, x) => s + x.count, 0);
  const unique7 = new Set(last7.flatMap(x => Array(x.uniques ? [] : []))).size; // не ползваме така
  // по-точно unique7 от суровите events:
  const since7 = new Date(now); since7.setDate(since7.getDate() - 6);
  const unique7Real = new Set(
    views
      .map(e => ({ e, dt: e.createdAt?.toDate?.() }))
      .filter(x => x.dt && x.dt >= new Date(since7.toDateString()))
      .map(x => x.e.visitorId || x.e.userId || "anon")
  ).size;

  const today = days[days.length - 1]?.count || 0;
  const uniqueToday = days[days.length - 1]?.uniques || 0;

  const peak = days.reduce((best, x) => (x.count > best.count ? x : best), { day: "—", count: 0, uniques: 0 });

  // ✅ real-time: последни 5 мин (по минути)
  const nowMs = Date.now();
  const fromMs = nowMs - 5 * 60 * 1000;

  // 5 buckets (minute)
  const buckets = [];
  for (let i = 4; i >= 0; i--) {
    const start = new Date(nowMs - i * 60 * 1000);
    start.setSeconds(0, 0);
    const key = start.toISOString().slice(11, 16); // HH:MM
    buckets.push({ key, startMs: start.getTime(), count: 0, visitors: new Set() });
  }

  views.forEach(e => {
    const dt = e.createdAt?.toDate?.() || null;
    if (!dt) return;
    const t = dt.getTime();
    if (t < fromMs) return;

    const vid = e.visitorId || e.userId || "anon";
    // намираме bucket
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      const endMs = b.startMs + 60 * 1000;
      if (t >= b.startMs && t < endMs) {
        b.count += 1;
        b.visitors.add(vid);
        break;
      }
    }
  });

  const rtMax = Math.max(1, ...buckets.map(b => b.count));
  const rtActiveUsers = new Set(buckets.flatMap(b => Array.from(b.visitors))).size;
  const rtTotal = buckets.reduce((s, b) => s + b.count, 0);

  return {
    days,
    max,
    summary: {
      today,
      total7,
      total14,
      uniqueToday,
      unique7: unique7Real,
      unique14,
      peak,
    },
    realtime: {
      buckets: buckets.map(b => ({ label: b.key, count: b.count })),
      max: rtMax,
      activeUsers: rtActiveUsers,
      total: rtTotal,
    },
  };
}, [events]);

  const orders14 = useMemo(() => {
    // YYYY-MM-DD -> count
    const map = new Map();

    orders.forEach((o) => {
      const dt = o.createdAt?.toDate?.() || null;
      if (!dt) return;
      const key = dt.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });

    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, count: map.get(key) || 0 });
    }

    const max = Math.max(1, ...days.map((x) => x.count));
    const total = days.reduce((s, x) => s + x.count, 0);
    return { days, max, total };
  }, [orders]);

  const revenue14 = useMemo(() => {
    // само paid
    const paid = orders.filter((o) => o.status === "paid" && o.createdAt);

    // YYYY-MM-DD -> sumEUR
    const map = new Map();

    paid.forEach((o) => {
      const dt = o.createdAt?.toDate?.() || null;
      if (!dt) return;
      const key = dt.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + Number(o.total || 0));
    });

    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key, sumEUR: Number(map.get(key) || 0) });
    }

    const max = Math.max(1, ...days.map((x) => x.sumEUR));
    const totalEUR = days.reduce((s, x) => s + x.sumEUR, 0);
    return { days, max, totalEUR };
  }, [orders]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const newOrders = orders.filter((o) => (o.status || "new") === "new").length;

    const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

    // топ продукт по qty
    const map = new Map();
    orders.forEach((o) =>
      (o.items || []).forEach((it) => {
        const key = it.name || it.productId || "Unknown";
        map.set(key, (map.get(key) || 0) + Number(it.qty || 0));
      })
    );

    let topProduct = "—";
    let topQty = 0;
    for (const [name, qty] of map.entries()) {
      if (qty > topQty) {
        topQty = qty;
        topProduct = name;
      }
    }

    // “продукти с изтичаща годност” (до 7 дни)
    const now = new Date();
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);

    const expiringSoon = products.filter((p) => {
      if (!p.expiryDate) return false;
      const d = new Date(p.expiryDate);
      return d.toString() !== "Invalid Date" && d >= now && d <= in7;
    }).length;

    return {
      totalOrders,
      totalRevenue,
      newOrders,
      avgOrder,
      topProduct,
      topQty,
      productsCount: products.length,
      expiringSoon,
    };
  }, [orders, products]);

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
          <h1 className="h1" style={{ margin: 0 }}>Admin • Статистики</h1>
          <div className="spacer" />
          <span className="badge">Live</span>
        </div>

        <p className="h2" style={{ marginTop: 8 }}>
          Преглед на магазина: поръчки, оборот, топ продукт и още.
        </p>

        <div className="hr" />
        <div className="hr" />
<AdminRoleManager orders={orders} />
        {/* GRID: 2 по 2 */}
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          }}
        >
        <StatCard
        title="Оборот"
        value={formatMoneyEUR(stats.totalRevenue)}
        subtitle="Сума от всички поръчки"
        emoji="💰"
        accent="b"
        />

          <StatCard
            title="Общо поръчки"
            value={stats.totalOrders}
            subtitle={`Нови: ${stats.newOrders}`}
            emoji="📦"
            accent="a"
          />

        <StatCard
        title="Средна поръчка"
        value={formatMoneyEUR(stats.avgOrder)}
        subtitle="Оборот / брой поръчки"
        emoji="🧾"
        accent="c"
        />

          <StatCard
            title="Топ продукт"
            value={stats.topProduct}
            subtitle={stats.topQty ? `Купен: ${stats.topQty} бр.` : "Няма данни още"}
            emoji="🏆"
            accent="f"
          />

          <StatCard
            title="Продукти в каталога"
            value={stats.productsCount}
            subtitle="Налични артикули в Firestore"
            emoji="🛒"
            accent="e"
          />

          <StatCard
            title="Изтичат скоро"
            value={stats.expiringSoon}
            subtitle="Годност до 7 дни"
            emoji="⏳"
            accent="d"
          />
          
        </div>
                    <div className="hr" />

                    <div
                      style={{
                        display: "grid",
                        gap: 14,
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      }}
                    >
                      <RevenueBars
                        days={revenue14.days}
                        max={revenue14.max}
                        totalEUR={revenue14.totalEUR}
                        formatMoneyEUR={formatMoneyEUR}
                      />

                      <OrdersBars days={orders14.days} max={orders14.max} total={orders14.total} />

                      {/* Трафик да заеме цял ред (по-красиво) */}
                      <div style={{ gridColumn: "1 / -1" }}>
                        <TrafficChart data={traffic.days} max={traffic.max} summary={traffic.summary} />
                      </div>
                    </div>

                    <div style={{ height: 12 }} />

                    <RealtimeMini
                      buckets={traffic.realtime.buckets}
                      max={traffic.realtime.max}
                      activeUsers={traffic.realtime.activeUsers}
                      total={traffic.realtime.total}
                    />
        {/* mobile fix: ако искаш 1 колона на малки екрани, добави CSS долу */}
      </div>
    </div>
  );
}
