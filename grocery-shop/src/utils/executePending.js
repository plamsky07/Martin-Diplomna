import { getPendingAction, clearPendingAction } from "./pendingAction";

export async function executePendingAction({ products, addToCart, toggleFav, navigate }) {
  const act = getPendingAction();
  if (!act) return;

  if (act.type === "ADD_TO_CART") {
    const p = products.find((x) => x.id === act.productId);
    if (p) addToCart(p, act.qty || 1);
  }

  if (act.type === "TOGGLE_FAVORITE") {
    toggleFav(act.productId);
  }

  const to = act.redirectTo || "/";
  clearPendingAction();
  navigate(to);
}
