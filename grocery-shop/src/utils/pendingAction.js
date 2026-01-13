const KEY = "pending_action";

export function setPendingAction(action) {
  localStorage.setItem(KEY, JSON.stringify(action));
}

export function getPendingAction() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearPendingAction() {
  localStorage.removeItem(KEY);
}
