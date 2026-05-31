import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function Hero({
  title = "ЕзиГруп",
  subtitle = "Свежи продукти, бърза доставка и лесно плащане.",
  highlight = "Топ оферти и най-продавани",
  imageUrl = "/image.png",
  categories = [],
  selectedCategory = "all",
  onPickCategory,
}) {
  const chips = useMemo(() => {
    const list = (categories || []).filter((c) => c && c !== "all");
    return list.slice(0, 8);
  }, [categories]);

  return (
    <section className="card heroCard">
      <div className="heroGrid">
        <div style={{ padding: 8 }}>
          <div className="badge">{highlight}</div>

          <h1 className="heroTitle">{title}</h1>
          <p className="heroLead">{subtitle}</p>

          <div className="row" style={{ gap: 10, marginTop: 18 }}>
            <button
              className="btn btnPrimary"
              style={{ borderRadius: 999, padding: "0 18px" }}
              onClick={() => {
                const el = document.getElementById("productsList");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Разгледай продукти
            </button>

            <Link
              to="/cart"
              className="btn"
              style={{
                borderRadius: 999,
                padding: "0 18px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Към количката
            </Link>
          </div>

          {chips.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                Бързи категории
              </div>

              <div className="row" style={{ gap: 10 }}>
                <button
                  className={`btn chipBtn${selectedCategory === "all" ? " active" : ""}`}
                  type="button"
                  onClick={() => onPickCategory?.("all")}
                >
                  Всички
                </button>

                {chips.map((c) => (
                  <button
                    key={c}
                    className={`btn chipBtn${selectedCategory === c ? " active" : ""}`}
                    type="button"
                    style={{ background: "#e9f7f5", borderColor: "#b9dfda", color: "#0f5d58" }}
                    onClick={() => onPickCategory?.(c)}
                    title={`Филтрирай по ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="heroImageWrap"
          style={{
            backgroundImage: `linear-gradient(120deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04), rgba(20,38,58,0.08)), url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </div>
    </section>
  );
}
