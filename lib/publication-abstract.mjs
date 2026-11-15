import katex from 'katex';

const escapeHtml = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const delimiters = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
  ...['equation', 'equation*', 'align', 'align*', 'gather', 'gather*'].map(name => ({
    left: '\\begin{' + name + '}', right: '\\end{' + name + '}', display: true, environment: true,
  })),
  { left: '$', right: '$', display: false },
];

function findEnd(source, start, closing) {
  let braces = 0;
  for (let index = start; index < source.length; index++) {
    if (!braces && source.startsWith(closing, index)) return index;
    if (source[index] === '\\') index++;
    else if (source[index] === '{') braces++;
    else if (source[index] === '}') braces = Math.max(0, braces - 1);
  }
  return -1;
}

function mathAt(source, start) {
  const delimiter = delimiters.find(item => source.startsWith(item.left, start));
  if (!delimiter) return null;
  const end = findEnd(source, start + delimiter.left.length, delimiter.right);
  if (end < 0) return null;
  const raw = source.slice(start, end + delimiter.right.length);
  const tex = delimiter.environment ? raw : source.slice(start + delimiter.left.length, end);
  // Dollar amounts and escaped dollars remain prose, rather than becoming math.
  if (delimiter.left === '$' && (!tex || /^\s|\s$/.test(tex) || /\d/.test(source[end + 1] ?? ''))) return null;
  let html;
  try {
    html = katex.renderToString(tex, { displayMode: delimiter.display, output: 'htmlAndMathml',
      throwOnError: true, strict: 'ignore', trust: false, maxExpand: 1000, maxSize: 20 });
  } catch {
    html = escapeHtml(raw);
  }
  return { html, end: end + delimiter.right.length };
}

/** Typeset original abstract text without evaluating MDX or accepting raw HTML. */
export function renderAbstract(source, depth = 0) {
  if (depth > 32) return escapeHtml(source);
  let html = '', prose = '', index = 0;
  const flush = () => { html += escapeHtml(prose); prose = ''; };
  while (index < source.length) {
    const character = source[index];
    if (character === '$' || character === '\\') {
      const math = mathAt(source, index);
      if (math) { flush(); html += math.html; index = math.end; continue; }
    }
    if (character === '\\') {
      const remaining = source.slice(index);
      const format = remaining.match(/^\\(textbf|textit|emph|texttt|underline)\s*\{/);
      const citation = remaining.match(/^\\(?:citep|citet|cite)\s*\{/);
      const command = format ?? citation;
      if (command) {
        const opening = index + command[0].length - 1;
        const end = findEnd(source, opening + 1, '}');
        if (end >= 0) {
          flush();
          const content = source.slice(opening + 1, end);
          if (format) {
            const tag = { textbf: 'strong', textit: 'em', emph: 'em', texttt: 'code', underline: 'u' }[format[1]];
            html += '<' + tag + '>' + renderAbstract(content, depth + 1) + '</' + tag + '>';
          } else html += '[' + escapeHtml(content.replace(/\s*,\s*/g, ', ')) + ']';
          index = end + 1;
          continue;
        }
      }
      if (/[$%&#_{}]/.test(source[index + 1] ?? '')) {
        prose += source[index + 1]; index += 2; continue;
      }
      if (/[,;! ]/.test(source[index + 1] ?? '')) {
        prose += source[index + 1] === '!' ? '' : ' '; index += 2; continue;
      }
    }
    prose += character === '~' ? '\u00a0' : character;
    index++;
  }
  flush();
  return html;
}
