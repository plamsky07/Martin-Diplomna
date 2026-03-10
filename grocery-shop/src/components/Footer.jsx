export default function Footer() {
  return (
    <footer className="footerBar">
      <div className="container footerInner">
        <div style={{ fontWeight: 900 }}>ЕзиГруп</div>
        <div style={{ color: "var(--muted)" }}>
          Авторски права {new Date().getFullYear()}. Всички права запазени.
        </div>
        <div className="spacer" />
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Изградено с Firebase</div>
      </div>
    </footer>
  );
}
