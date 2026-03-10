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

          <div className="card">
            <div className="row">
              <span className="badge">Продукти</span>
              <span className="badge">Любими</span>
              <span className="badge">Количка</span>
              <span className="badge">Админ</span>
            </div>
            <p className="h2" style={{ marginTop: 12 }}>
              Интеграция с Firebase Auth, Firestore и Storage за пазаруване с потребителски профил.
            </p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 520, marginLeft: "auto", width: "100%", boxShadow: "var(--shadow)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
