import React from 'react';

export default function Skeleton({ variant = 'card', count = 1, columns = 1 }) {
  if (variant === 'table-row') {
    return Array.from({ length: count }, (_, rowIndex) => (
      <tr className="skeleton-table-row" key={rowIndex} aria-hidden="true">
        {Array.from({ length: columns }, (_, columnIndex) => (
          <td key={columnIndex}>
            <span className={`skeleton-line skeleton-line-${(columnIndex % 3) + 1}`} />
          </td>
        ))}
      </tr>
    ));
  }

  if (variant === 'list-item') {
    return Array.from({ length: count }, (_, index) => (
      <div className="skeleton skeleton-list-item" key={index} aria-hidden="true">
        <span className="skeleton-avatar" />
        <span className="skeleton-list-copy">
          <span className="skeleton-line skeleton-line-2" />
          <span className="skeleton-line skeleton-line-3" />
        </span>
      </div>
    ));
  }

  return Array.from({ length: count }, (_, index) => (
    <div className="skeleton skeleton-card" key={index} aria-hidden="true">
      <span className="skeleton-line skeleton-line-2" />
      <span className="skeleton-line skeleton-line-3" />
    </div>
  ));
}
