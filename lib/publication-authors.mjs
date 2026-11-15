/** @param {number[]} indices @param {number} count @returns {(number | null)[]} */
export function authorTokens(indices, count) {
  const tokens = [];
  let previous = -1;
  for (const index of indices) {
    if (index > previous + 1) tokens.push(null);
    tokens.push(index);
    previous = index;
  }
  if (previous < count - 1) tokens.push(null);
  return tokens;
}

/**
 * Remove whole names in their original order, keeping group members first.
 * The caller measures the actual rendered text, including commas and ellipses.
 * @param {{name: string, memberId?: string | null}[]} authors
 * @param {(indices: number[]) => boolean} fits
 * @param {string} [selectedMemberId]
 * @returns {number[]}
 */
export function fitAuthorIndices(authors, fits, selectedMemberId = '') {
  let visible = authors.map((_, index) => index);
  if (fits(visible)) return visible;
  const highlighted = visible.filter(index => authors[index].memberId);
  const protectedIndices = new Set(highlighted.length ? highlighted : [0]);
  for (let index = authors.length - 1; index >= 0; index--) {
    if (protectedIndices.has(index)) continue;
    visible = visible.filter(value => value !== index);
    if (fits(visible)) return visible;
  }
  // If even the highlighted names alone exceed the space, keep the selected
  // member (or first group author) longest; Info opens the full list.
  const selected = selectedMemberId ? authors.findIndex(author => author.memberId === selectedMemberId) : -1;
  const priority = selected >= 0 ? selected : highlighted[0] ?? 0;
  for (const index of [...visible].reverse()) {
    if (index === priority) continue;
    visible = visible.filter(value => value !== index);
    if (fits(visible)) return visible;
  }
  return fits(visible) ? visible : [];
}
