export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 40,
        padding: "22px 0",
        borderTop: "1px solid rgba(17,24,39,0.08)",
        background: "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="container" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>GroceryShop</div>
        <div style={{ opacity: 0.7 }}>© {new Date().getFullYear()} • Всички права запазени</div>
        <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 13 }}>
          Made with ☕ + Firebase
        </div>
      </div>
    </footer>
  );
}
