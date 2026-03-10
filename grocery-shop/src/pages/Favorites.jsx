import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import Pagination from "../components/Pagination";

export default function Favorites() {
  const ITEMS_PER_PAGE = 12;

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const { ids, toggle } = useFavorites();
  const { add } = useCart();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const favItems = useMemo(() => products.filter((p) => ids.includes(p.id)), [products, ids]);
  const totalPages = Math.max(1, Math.ceil(favItems.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedFavItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return favItems.slice(start, start + ITEMS_PER_PAGE);
  }, [favItems, currentPage]);

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Любими</h1>
        <div className="hr" />

        {favItems.length === 0 ? (
          <p className="h2">Нямаш добавени любими.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
              {pagedFavItems.map((p) => (
                <div key={p.id} className="card" style={{ background: "rgba(255,255,255,0.05)", padding: 12 }}>
                  <img
                    src={p.imageUrl || "https://via.placeholder.com/600x400?text=No+Image"}
                    alt={p.name}
                    style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 12 }}
                  />
                  <div style={{ marginTop: 10 }}>
                    <b>{p.name}</b>
                    <div style={{ opacity: 0.75, fontSize: 13 }}>{p.category}</div>
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <div className="badge">{Number(p.price).toFixed(2)} лв</div>
                    <div className="spacer" />
                    <button
                      className="btn"
                      style={{ color: "#dc2626", borderColor: "#f1b4b4", background: "#fff1f1" }}
                      onClick={() => toggle(p.id)}
                    >
                      {`\u2665`}
                    </button>
                  </div>
                  <button className="btn btnPrimary" style={{ width: "100%", marginTop: 10 }} onClick={() => add(p, 1)}>
                    Добави в количка
                  </button>
                </div>
              ))}
            </div>

            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
