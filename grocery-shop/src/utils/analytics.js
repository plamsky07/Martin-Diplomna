import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

function getVisitorId() {
  const key = "gs_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function trackEvent(type, payload = {}) {
  try {
    await addDoc(collection(db, "events"), {
      type,
      visitorId: getVisitorId(),   // ✅ уникален за браузъра
      path: window.location.pathname,
      createdAt: serverTimestamp(),
      ...payload,
    });
  } catch (e) {
    // тихо – analytics не трябва да чупи сайта
    console.log("trackEvent error:", e?.message || e);
  }
}