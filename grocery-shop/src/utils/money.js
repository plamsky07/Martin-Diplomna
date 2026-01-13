export function formatMoneyEUR(x) {
  const n = Number(x || 0);
  return n.toLocaleString("bg-BG", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}