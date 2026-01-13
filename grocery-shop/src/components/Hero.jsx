import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function Hero({
  title = "GroceryShop",
  subtitle = "Бързи покупки • Свежи продукти • Доставка до врата",
  highlight = "Нови промоции всяка седмица",
  imageUrl = "/hero.jpg", // сложи снимка в /public/hero.jpg
  categories = [], // масив от имена
  onPickCategory, // (cat) => void
}) {
  const chips = useMemo(() => {
    const list = (categories || []).filter((c) => c && c !== "all");
    return list.slice(0, 8);
  }, [categories]);

  return (
    <section
      className="card"
      style={{
        padding: 18,
        borderRadius: 26,
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(17,24,39,0.06)",
        boxShadow: "0 18px 50px rgba(17,24,39,0.10)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.25fr 0.75fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* LEFT */}
        <div style={{ padding: 8 }}>
          <div className="badge" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            ✨ {highlight}
          </div>

          <h1 style={{ margin: "12px 0 8px", fontSize: 38, lineHeight: 1.05, fontWeight: 980 }}>
            {title}
          </h1>

          <p className="h2" style={{ margin: 0, opacity: 0.78, maxWidth: 520 }}>
            {subtitle}
          </p>

          <div className="row" style={{ gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            <button
              className="btn btnPrimary"
              style={{ borderRadius: 999, height: 46, fontWeight: 950, padding: "0 18px" }}
              onClick={() => {
                // просто скролваме до списъка с продукти
                const el = document.getElementById("productsList");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              🛒 Виж продукти
            </button>

            <Link
              to="/cart"
              className="btn"
              style={{
                borderRadius: 999,
                height: 46,
                fontWeight: 950,
                padding: "0 18px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              💳 Към количката
            </Link>

            <div className="spacer" />
          </div>

          {/* Category chips */}
          {chips.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
                Категории (бърз старт)
              </div>

              <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn"
                  style={{ borderRadius: 999, height: 40, padding: "0 14px", fontWeight: 900 }}
                  onClick={() => onPickCategory?.("all")}
                >
                  🧺 Всички
                </button>

                {chips.map((c) => (
                  <button
                    key={c}
                    className="btn"
                    style={{
                      borderRadius: 999,
                      height: 40,
                      padding: "0 14px",
                      fontWeight: 900,
                      background: "rgba(42,157,143,0.08)",
                      border: "1px solid rgba(42,157,143,0.18)",
                    }}
                    onClick={() => onPickCategory?.(c)}
                    title={`Филтрирай по: ${c}`}
                  >
                    🏷️ {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT image */}
        <div
          style={{
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid rgba(17,24,39,0.08)",
            background: "rgba(17,24,39,0.03)",
            position: "relative",
            minHeight: 220,
          }}
        >
          <img
            src={imageUrl}
            alt="Hero"
            onError={(e) => (e.currentTarget.style.display = "none")}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />

          {/* overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(120deg, rgba(255,255,255,0.85), rgba(255,255,255,0.15), rgba(17,24,39,0.10))",
            }}
          />

          <div style={{ position: "absolute", left: 14, bottom: 14, right: 14 }}>
            <div
              className="card"
              style={{
                padding: 12,
                borderRadius: 18,
                background: "rgba(255,255,255,0.80)",
                border: "1px solid rgba(17,24,39,0.08)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 10px 22px rgba(17,24,39,0.10)",
              }}
            >
              <div style={{ fontWeight: 950 }}>🏪 “Моят магазин” vibe</div>
              <div className="h2" style={{ marginTop: 4, opacity: 0.78 }}>
                Добавяй в количката и плащай лесно (Stripe) или наложен платеж.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <style>{`
        @media (max-width: 920px){
          section.card > div{
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
