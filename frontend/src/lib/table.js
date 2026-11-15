const missing = (v, text) => v === null || v === undefined || v === '' || (!text && !(typeof v === 'number' && Number.isFinite(v)));

// Comparator for sortable tables. dir is 1 (ascending) or -1 (descending). Missing values
// always sort last, whichever way the column is sorted; ties fall back to `tiebreak`.
export function makeComparator(get, { text = false, dir = 1, tiebreak } = {}) {
  return (a, b) => {
    const va = get(a);
    const vb = get(b);
    const na = missing(va, text);
    const nb = missing(vb, text);
    if (na || nb) {
      if (na && nb) return tiebreak ? tiebreak(a, b) : 0;
      return na ? 1 : -1;
    }
    const c = text ? String(va).localeCompare(String(vb)) : va - vb;
    return c === 0 ? (tiebreak ? tiebreak(a, b) : 0) : c * dir;
  };
}

// Next sort state when a column header is chosen: same column flips, a new column starts
// ascending for text and descending for numbers.
export const nextSort = (sort, col) =>
  sort.key === col.key ? { key: sort.key, dir: -sort.dir } : { key: col.key, dir: col.text ? 1 : -1 };

export const ariaSort = (sort, key) => (sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none');
