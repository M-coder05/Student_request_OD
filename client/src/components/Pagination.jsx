import React from 'react';

export default function Pagination({ page, pages, total, itemLabel = 'items', onPrev, onNext }) {
  const totalPages = Math.max(pages || 1, 1);
  const currentPage = page || 1;

  return (
    <div className="admin-pagination">
      <span>
        Page {currentPage} of {totalPages} ({total || 0} {itemLabel})
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={currentPage <= 1}
        onClick={onPrev}
      >
        Previous
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={currentPage >= totalPages}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  );
}
