function buildPages(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis-left");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis-right");

  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);

  return (
    <div className="paginationWrap">
      <button className="pageNavBtn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        « Предишна
      </button>

      <div className="paginationPages">
        {pages.map((p, idx) =>
          typeof p === "string" ? (
            <span key={`${p}-${idx}`} className="pageDots">…</span>
          ) : (
            <button
              key={p}
              className={`pageBtn${p === page ? " active" : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button className="pageNavBtn" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
        Следваща »
      </button>
    </div>
  );
}
