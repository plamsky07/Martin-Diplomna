import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "serviceAccountKey.json"), "utf8")
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const PRODUCTS = "products";
const CATEGORIES = "categories";
const SUBCATEGORIES = "subcategories";
const BATCH_LIMIT = 450;

// 🔧 slug/id helper
function slugifyBG(str) {
  return str
    .toLowerCase()
    .replace(/ё/g, "e")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

function imageFor(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/600/400`;
}

// ✅ Твоите категории/подкатегории (BG)
const data = [
  {
    name: "Хранителни продукти",
    subs: [
      "Хлебни изделия",
      "Тестени/Паста",
      "Пакетирани",
      "Млечни продукти",
      "Месо",
      "Замразени",
      "Сладки",
      "Напитки",
      "Алкохолни напитки",
      "Плодове",
      "Зеленчуци",
      "Салати",
      "Тютюнови изделия",
    ],
  },
  {
    name: "Нехранителни продукти",
    subs: ["Битова химия", "Хигиена", "Козметика", "Медицински", "Бебе"],
  },
];

// 10 продукта на подкатегория (ако искаш после ще ги направя “по-умни”)
function build10Products(subName) {
  return Array.from({ length: 10 }, (_, i) => ({
    name: `${subName} продукт ${i + 1}`,
    price: Math.round((1 + Math.random() * 20) * 100) / 100,
    stock: Math.floor(10 + Math.random() * 90),
  }));
}

async function deleteCollection(colName) {
  let deleted = 0;
  while (true) {
    const snap = await db.collection(colName).limit(BATCH_LIMIT).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    deleted += snap.size;
    console.log(`🧹 ${colName}: изтрити ${deleted}`);
  }
}

async function seed() {
  console.log("🧨 Reset: трия старите collections...");
  await deleteCollection(PRODUCTS);
  await deleteCollection(SUBCATEGORIES);
  await deleteCollection(CATEGORIES);

  console.log("✅ Seed: categories + subcategories + products...");

  let batch = db.batch();
  let ops = 0;

  const commitIfNeeded = async () => {
    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  };

  for (const cat of data) {
    const categoryId = slugifyBG(cat.name);

    // categories doc
    const catRef = db.collection(CATEGORIES).doc(categoryId);
    batch.set(catRef, {
      id: categoryId,
      name: cat.name,
      име: cat.name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    ops++;
    await commitIfNeeded();

    for (const subName of cat.subs) {
      const subId = `${categoryId}__${slugifyBG(subName)}`;

      // subcategories doc
      const subRef = db.collection(SUBCATEGORIES).doc(subId);
      batch.set(subRef, {
        id: subId,
        name: subName,
        име: subName,
        categoryId,
        categoryName: cat.name,
        категорияId: categoryId,
        категория: cat.name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      ops++;
      await commitIfNeeded();

      // 10 products for this sub
      const items = build10Products(subName);

      for (const item of items) {
        const pRef = db.collection(PRODUCTS).doc();

        const img = imageFor(`${subName}-${item.name}`);

        // ✅ Пишем максимално съвместимо: EN + BG + id/name
        batch.set(pRef, {
          // EN
          name: item.name,
          price: item.price,
          stock: item.stock,
          category: cat.name,
          subcategory: subName,
          categoryId,
          subcategoryId: subId,
          categoryName: cat.name,
          subcategoryName: subName,
          imageUrl: img,

          // BG
          име: item.name,
          цена: item.price,
          наличност: item.stock,
          категория: cat.name,
          подкатегория: subName,
          категорияId: categoryId,
          подкатегорияId: subId,
          категорияИме: cat.name,
          подкатегорияИме: subName,
          снимка: img,

          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        ops++;
        await commitIfNeeded();
      }
    }
  }

  if (ops > 0) await batch.commit();

  console.log("🎉 Готово: seed завърши успешно.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Грешка:", e);
  process.exit(1);
});
