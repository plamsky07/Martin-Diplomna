import { useEffect, useMemo, useState } from "react";
import { db, storage } from "../../firebase";
import { CATEGORY_TREE } from "../../utils/categories";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

function slugify(name = "") {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "");
}

async function uploadProductImage(file) {
  const safeName = slugify(file.name) || "image";
  const path = `products/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);

  const task = uploadBytesResumable(fileRef, file);

  await new Promise((resolve, reject) => {
    task.on("state_changed", null, reject, resolve);
  });

  return await getDownloadURL(task.snapshot.ref);
}

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoPercent, setPromoPercent] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [promoLabel, setPromoLabel] = useState("PROMO");
  const [promoUntil, setPromoUntil] = useState("");
  // form fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [grams, setGrams] = useState("");
  const [expiryDate, setExpiryDate] = useState(""); // YYYY-MM-DD
  const [file, setFile] = useState(null);

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const mainCats = Object.keys(CATEGORY_TREE);
  const groups = category && CATEGORY_TREE[category] ? Object.keys(CATEGORY_TREE[category]) : [];
  const subcats = category && subcategory && CATEGORY_TREE[category]?.[subcategory] ? CATEGORY_TREE[category][subcategory] : [];

  useEffect(() => {
    const qy = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qy, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setName("");
    setCategory("");
    setSubcategory("");
    setPrice("");
    setGrams("");
    setExpiryDate("");
    setFile(null);

    // reset promo
    setPromoEnabled(false);
    setPromoPercent("");
    setPromoPrice("");
    setPromoLabel("PROMO");
    setPromoUntil("");

    setEditingId(null);
    setMsg("");
    setErr("");

    const input = document.getElementById("productImageInput");
    if (input) input.value = "";
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setName(p.name || "");
    setCategory(p.category || "");
    setSubcategory(p.subcategory || "");
    setPrice(String(p.price ?? ""));
    setGrams(String(p.grams ?? ""));
    setExpiryDate(p.expiryDate || "");
    setFile(null);

    // load promo values
    setPromoEnabled(!!p.promo?.enabled);
    setPromoPercent(p.promo?.percent != null ? String(p.promo.percent) : "");
    setPromoPrice(p.promo?.price != null ? String(p.promo.price) : "");
    setPromoLabel(p.promo?.label || "PROMO");
    setPromoUntil(p.promo?.until || "");

    setMsg("");
    setErr("");

    const input = document.getElementById("productImageInput");
    if (input) input.value = "";
  };
  
  const validate = () => {
    if (!name.trim()) return "Въведи име.";
    if (!category.trim()) return "Въведи категория.";

    const pr = Number(price);
    if (Number.isNaN(pr) || pr < 0) return "Невалидна цена.";

    const gr = Number(grams);
    if (Number.isNaN(gr) || gr <= 0) return "Невалиден грамаж.";

    if (!expiryDate) return "Въведи годност (дата).";

    return "";
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    const v = validate();
    if (v) return setErr(v);

    setSaving(true);
    try {
      let imageUrl = null;
      if (file) imageUrl = await uploadProductImage(file);

      const promo = promoEnabled
        ? {
            enabled: true,
            label: (promoLabel || "PROMO").trim(),
            percent: promoPercent ? Number(promoPercent) : null,
            price: promoPrice ? Number(promoPrice) : null,
            until: promoUntil || null,
          }
        : { enabled: false };

      const payload = {
        name: name.trim(),
        category: category.trim(),
        subcategory: subcategory.trim(),
        price: Number(price),
        grams: Number(grams),
        expiryDate, // "YYYY-MM-DD"
        promo,
        ...(imageUrl ? { imageUrl } : {}),
      };

      if (!editingId) {
        await addDoc(collection(db, "products"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setMsg("Продуктът е добавен ✅");
      } else {
        await updateDoc(doc(db, "products", editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setMsg("Продуктът е обновен ✅");
      }

      resetForm();
    } catch (e2) {
      console.log(e2);
      setErr("Грешка при запис/качване. Провери Storage правилата и пробвай пак.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Сигурен ли си, че искаш да изтриеш продукта?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (e) {
      console.log(e);
      alert("Грешка при изтриване.");
    }
  };

  const count = useMemo(() => items.length, [items]);

  return (
    <div className="card" style={{ maxWidth: 1000 }}>
      <div className="row">
        <h1 className="h1" style={{ margin: 0 }}>Admin → Продукти</h1>
        <div className="spacer" />
        <span className="badge">Общо: {count}</span>
      </div>

      <p className="h2" style={{ marginTop: 8 }}>
        Добавяй/редактирай продукти. Снимките се качват във Firebase Storage и се записват като imageUrl.
      </p>

      <div className="hr" />

      <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <input className="input" placeholder="Име" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }}>
            <option value="">Избери категория</option>
            {mainCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <select
            className="input"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            disabled={!category}
            title={!category ? "Първо избери категория" : ""}
          >
            <option value="">Избери подкатегория</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <input className="input" placeholder="Цена (лв)" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>

        <div className="row" style={{ gap: 12 }}>
          <input className="input" placeholder="Грамаж (напр. 200)" value={grams} onChange={(e) => setGrams(e.target.value)} />
          <input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>

        <div className="card" style={{ padding: 14, borderRadius: 18, background: "rgba(17,24,39,0.02)" }}>
          <div className="row" style={{ gap: 12, alignItems: "center" }}>
            <label className="badge" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={promoEnabled}
                onChange={(e) => setPromoEnabled(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              ✨ Промоция
            </label>

            <input
              className="input"
              placeholder="Етикет (напр. PROMO)"
              value={promoLabel}
              onChange={(e) => setPromoLabel(e.target.value)}
              disabled={!promoEnabled}
            />

            <input
              className="input"
              placeholder="Отстъпка % (напр. 20)"
              value={promoPercent}
              onChange={(e) => setPromoPercent(e.target.value)}
              disabled={!promoEnabled}
            />
          </div>

          <div className="row" style={{ gap: 12, marginTop: 12 }}>
            <input
              className="input"
              placeholder="Промо цена EUR (по избор)"
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
              disabled={!promoEnabled}
            />

            <input
              className="input"
              type="date"
              value={promoUntil}
              onChange={(e) => setPromoUntil(e.target.value)}
              disabled={!promoEnabled}
              title="Край на промоцията (по избор)"
            />
          </div>

          <div className="h2" style={{ marginTop: 10, opacity: 0.7 }}>
            Ако попълниш „Промо цена“, тя има приоритет. Иначе се ползва „Отстъпка %".
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <input
            id="productImageInput"
            className="input"
            style={{ paddingTop: 10 }}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <span className="badge">
            {file ? `Файл: ${file.name}` : "Снимката е по желание"}
          </span>
        </div>

        {err && <div className="error">{err}</div>}
        {msg && <div className="success">{msg}</div>}

        <div className="row">
          <button className="btn btnPrimary" disabled={saving} type="submit">
            {saving ? "Запис..." : editingId ? "Запази промените" : "Добави продукт"}
          </button>

          <button className="btn" type="button" onClick={resetForm} disabled={saving}>
            Изчисти
          </button>

          <div className="spacer" />
          {editingId && <span className="badge">Редакция: {editingId}</span>}
        </div>
      </form>

      <div className="hr" />

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((p) => (
          <div key={p.id} className="card" style={{ padding: 14 }}>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <div
                style={{
                  width: 74,
                  height: 54,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(17,24,39,0.08)",
                  background: "rgba(17,24,39,0.03)",
                  flex: "0 0 auto",
                }}
              >
                <img
                  src={p.imageUrl && p.imageUrl.trim() ? p.imageUrl : "/no-image.png"}
                  alt={p.name}
                  onError={(e) => (e.currentTarget.src = "/no-image.png")}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>

              <div style={{ minWidth: 260 }}>
                <div style={{ fontWeight: 950 }}>{p.name}</div>
                <div className="h2" style={{ margin: 0 }}>
                  {p.category}{p.subcategory ? ` / ${p.subcategory}` : ""} • {Number(p.price || 0).toFixed(2)} лв • {p.grams} g • Годност: {p.expiryDate}
                </div>
              </div>

              <div className="spacer" />
              <button className="btn" onClick={() => startEdit(p)}>Edit</button>
              <button className="btn btnDanger" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <p className="h2">Няма продукти. Добави първия от формата горе.</p>
        )}
      </div>
    </div>
  );
}
