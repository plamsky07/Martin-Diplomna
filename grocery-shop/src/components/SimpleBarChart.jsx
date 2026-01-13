export default function SimpleBarChart({ title, data = [] }) {
  // data: [{ label: "2026-01-07", value: 12 }, ...]
  const max = Math.max(1, ...data.map(d => Number(d.value || 0)));

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ fontWeight: 950, marginBottom: 10 }}>{title}</div>

      <div style={{ display: "grid", gap: 8 }}>
        {data.map((d) => {
          const v = Number(d.value || 0);
          const w = Math.round((v / max) * 100);

          return (
            <div key={d.label} style={{ display: "grid", gridTemplateColumns: "140px 1fr 70px", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{d.label}</div>

              <div style={{ height: 12, borderRadius: 999, background: "rgba(17,24,39,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${w}%`, height: "100%", borderRadius: 999, background: "rgba(42,157,143,0.55)" }} />
              </div>

              <div style={{ textAlign: "right", fontWeight: 900 }}>{v}</div>
            </div>
          );
        })}
      </div>

      {data.length === 0 && <div className="h2">Няма данни.</div>}
    </div>
  );
}
