import { createHash } from 'node:crypto';
import { parse as parseJavaScript } from 'acorn';
import { parseFragment } from 'parse5';
import { arxivId, arxivUrl, httpUrl } from './catalog.mjs';

export function textContent(node) {
  if (['script', 'style', 'nav'].includes(node.tagName)) return '';
  return node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(textContent).join(' ');
}

export function cleanText(value = '') {
  return textContent(parseFragment(String(value))).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

function authorNames(value) {
  if (Array.isArray(value)) return value.map(author => typeof author === 'string' ? { name: cleanText(author) } : { name: cleanText(author?.name ?? '') }).filter(author => author.name);
  const text = cleanText(value);
  const bibtex = /\s+and\s+/i.test(text);
  return text.split(bibtex ? /\s+and\s+/i : /\s*,\s*/).map(name => {
    const parts = name.split(',').map(part => part.trim());
    return { name: bibtex && parts.length === 2 ? `${parts[1]} ${parts[0]}` : name.trim() };
  }).filter(author => author.name);
}

export function recordFromFields(fields, source) {
  const title = cleanText(fields.title ?? fields.headline ?? fields.name);
  const authors = authorNames(fields.authors ?? fields.author ?? '');
  if (!title || !authors.length) return null;
  const doi = String(fields.doi ?? '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim();
  const validDoi = /^10\.\d{4,9}\/\S+$/i.test(doi) ? doi : null;
  const url = httpUrl(fields.url ?? fields.arxiv, source);
  const arxiv = [fields.eprint, fields.arxiv, url, validDoi].map(arxivId).find(Boolean);
  const venue = cleanText(fields.journal ?? fields.booktitle ?? '') || null;
  const year = Number(String(fields.year ?? fields.datePublished ?? '').match(/(?:18|19|20|21)\d{2}/)?.[0]) || null;
  const id = `citation:${createHash('sha256').update(`${source}\n${title}`).digest('hex').slice(0, 20)}`;
  return {
    id, ids: [id, ...(validDoi ? [`doi:${validDoi.toLowerCase()}`] : []), ...(arxiv ? [`arxiv:${arxiv}`] : [])],
    title, authors, memberIds: [], venue, year,
    status: venue && !/arxiv|preprint|^corr$/i.test(venue) ? 'published' : arxiv ? 'preprint' : 'unknown',
    paperUrl: validDoi && !/^10\.48550\/arxiv\./i.test(validDoi) ? `https://doi.org/${validDoi}` : url ?? arxivUrl(arxiv),
    arxivUrl: arxivUrl(arxiv), landingUrls: url ? [url] : [], sources: [source],
    ...(httpUrl(fields.projectUrl ?? fields.project ?? fields.website, source) ? { projectUrl: httpUrl(fields.projectUrl ?? fields.project ?? fields.website, source) } : {}),
  };
}

// BibTeX values may contain nested braces and commas. Read them without evaluating
// TeX commands, rather than using a regex that stops at the first closing brace.
export function parseBibtex(text, source) {
  const records = [];
  const starts = /@(article|inproceedings|misc|techreport|unpublished|incollection)\s*\{/gi;
  for (const match of text.matchAll(starts)) {
    let position = match.index + match[0].length;
    let depth = 1;
    let quoted = false;
    const start = position;
    for (; position < text.length && depth > 0; position++) {
      if (text[position - 1] === '\\') continue;
      if (text[position] === '"') quoted = !quoted;
      if (!quoted && text[position] === '{') depth++;
      if (!quoted && text[position] === '}') depth--;
    }
    if (depth !== 0) continue;
    const body = text.slice(start, position - 1);
    const fields = {};
    let cursor = body.indexOf(',') + 1;
    while (cursor > 0 && cursor < body.length) {
      const key = /^\s*,?\s*([a-z][a-z0-9_-]*)\s*=\s*/i.exec(body.slice(cursor));
      if (!key) break;
      cursor += key[0].length;
      const delimiter = body[cursor];
      let value = '';
      if (delimiter === '{' || delimiter === '"') {
        const end = delimiter === '{' ? '}' : '"';
        let nested = 1;
        const valueStart = ++cursor;
        while (cursor < body.length) {
          if (body[cursor - 1] !== '\\') {
            if (delimiter === '{' && body[cursor] === '{') nested++;
            if (body[cursor] === end && --nested === 0) break;
          }
          cursor++;
        }
        value = body.slice(valueStart, cursor++);
      } else {
        const valueStart = cursor;
        while (cursor < body.length && body[cursor] !== ',') cursor++;
        value = body.slice(valueStart, cursor);
      }
      fields[key[1].toLowerCase()] = value.trim();
      while (/\s|,/.test(body[cursor] ?? '') && cursor < body.length) cursor++;
    }
    const record = recordFromFields(fields, source);
    if (record) records.push(record);
  }
  return records;
}

export function jsonPublications(value, source) {
  const records = [];
  function visit(item, depth = 0) {
    if (depth > 30 || !item || typeof item !== 'object') return;
    if (Array.isArray(item)) { for (const child of item) visit(child, depth + 1); return; }
    if (item.title || item.headline || item['@type'] === 'ScholarlyArticle') {
      const record = recordFromFields({ ...item, journal: item.journal ?? item.isPartOf?.name }, source);
      if (record) records.push(record);
    }
    for (const child of Object.values(item)) if (child && typeof child === 'object') visit(child, depth + 1);
  }
  visit(value);
  return records;
}

// Inspect literal data objects in scripts; never execute a site's JavaScript.
export function staticPublications(script, source) {
  let tree;
  try { tree = parseJavaScript(script, { ecmaVersion: 'latest', sourceType: 'module' }); }
  catch { return []; }
  const records = [];
  function literal(node, depth = 0) {
    if (!node || depth > 20) return undefined;
    if (node.type === 'Literal') return node.value;
    if (node.type === 'TemplateLiteral' && !node.expressions.length) return node.quasis[0].value.cooked;
    if (node.type === 'ArrayExpression') return node.elements.map(item => literal(item, depth + 1));
    if (node.type === 'ObjectExpression') return Object.fromEntries(node.properties.filter(property => property.type === 'Property' && property.kind === 'init' && !property.computed)
      .map(property => [property.key.name ?? property.key.value, literal(property.value, depth + 1)]));
    return undefined;
  }
  let visited = 0;
  function visit(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 100 || ++visited > 100000) return;
    if (node.type === 'ObjectExpression') {
      const item = literal(node);
      if (item?.title && (item.arxiv || item.project || item.projectUrl || item.doi || item.url)) {
        const record = recordFromFields(item, source);
        if (record) records.push(record);
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) { for (const item of child) visit(item, depth + 1); }
      else if (child && typeof child === 'object') visit(child, depth + 1);
    }
  }
  visit(tree);
  return records;
}
