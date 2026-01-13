export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="container">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 18,
          alignItems: "center",
          minHeight: "calc(100vh - 110px)",
          paddingTop: 10,
        }}
      >
        <div style={{ padding: 10 }}>
          <h1 className="h1">{title}</h1>
          <p className="h2">{subtitle}</p>

          <div className="card" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="row">
              <span className="badge">🛒 Продукти</span>
              <span className="badge">♥ Любими</span>
              <span className="badge">🧾 Количка</span>
              <span className="badge">🔐 Admin</span>
            </div>
            <p className="h2" style={{ marginTop: 12 }}>
              Firebase Auth + Firestore + Storage. Гост разглежда, акаунт за добавяне.
            </p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 520, marginLeft: "auto", width: "100%" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
