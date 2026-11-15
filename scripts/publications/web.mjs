import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { parse } from 'parse5';
import robotsParser from 'robots-parser';
import { arxivId, httpUrl, matchesRecord, normalizeText, titleSimilarity } from './catalog.mjs';
import { jsonPublications, parseBibtex, recordFromFields, staticPublications, textContent } from './metadata.mjs';

const agent = 'MARBLE-Publications';
const maxBytes = 2 * 1024 * 1024;

export function parsePage(html, url) {
  const document = parse(html);
  const elements = [];
  function visit(node) { if (node.tagName) elements.push(node); for (const child of node.childNodes ?? []) visit(child); }
  visit(document);
  const attr = (node, key) => node.attrs?.find(attribute => attribute.name === key)?.value;
  const meta = key => elements.find(node => node.tagName === 'meta' && (attr(node, 'property') ?? attr(node, 'name'))?.toLowerCase() === key);
  const title = attr(meta('og:title') ?? {}, 'content') ?? textContent(elements.find(node => node.tagName === 'title') ?? {});
  const links = elements.filter(node => node.tagName === 'a' && attr(node, 'href')).map(node => {
    let block = node.parentNode;
    // Stop at a compact publication entry, rather than treating a whole page as one paper.
    for (let i = 0; i < 4 && block?.parentNode && textContent(block).length < 250; i++) {
      if (['li', 'tr', 'article'].includes(block.tagName)) break;
      const parent = block.parentNode;
      if (textContent(parent).length > 1800) break;
      block = parent;
    }
    return { url: httpUrl(attr(node, 'href'), url), text: textContent(node).replace(/\s+/g, ' ').trim(), context: textContent(block ?? node).replace(/\s+/g, ' ').trim().slice(0, 1800) };
  }).filter(link => link.url).slice(0, 1200);
  const records = elements.filter(node => ['pre', 'code'].includes(node.tagName)).flatMap(node => parseBibtex(textContent(node), url));
  const content = key => attr(meta(key) ?? {}, 'content');
  const citation = recordFromFields({ title: content('citation_title'), authors: elements.filter(node => node.tagName === 'meta' && attr(node, 'name')?.toLowerCase() === 'citation_author').map(node => attr(node, 'content')),
    journal: content('citation_journal_title') ?? content('citation_conference_title'), year: content('citation_publication_date') ?? content('citation_date'),
    doi: content('citation_doi'), url: content('citation_public_url') ?? content('citation_abstract_html_url') ?? url }, url);
  if (citation) records.push(citation);
  const scripts = [];
  for (const node of elements.filter(node => node.tagName === 'script')) {
    const src = httpUrl(attr(node, 'src'), url);
    if (src && new URL(src).origin === new URL(url).origin) scripts.push(src);
    const body = (node.childNodes ?? []).map(child => child.value ?? '').join('');
    if (/application\/(?:ld\+)?json/i.test(attr(node, 'type') ?? '')) {
      try { records.push(...jsonPublications(JSON.parse(body), url)); } catch { /* Invalid structured data is not publication evidence. */ }
    } else if (body.includes('title')) records.push(...staticPublications(body, url));
  }
  return { url, title: title.trim(), headings: elements.filter(node => ['h1', 'h2'].includes(node.tagName)).map(textContent).slice(0, 30), links,
    text: textContent(document).replace(/\s+/g, ' ').slice(0, 40000), records: [...new Map(records.map(record => [record.id, record])).values()], scripts: [...new Set(scripts)].slice(0, 2) };
}

export function isPrivateAddress(address) {
  const value = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(value) === 4) {
    const [a, b] = value.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18, 19].includes(b));
  }
  // Only global-unicast IPv6 destinations are useful for this crawler. Reject mapped IPv4 too.
  return isIP(value) === 6 ? !/^[23][0-9a-f]{3}:/.test(value) : true;
}

export async function assertPublicUrl(value, resolve = lookup) {
  const normalized = httpUrl(value);
  if (!normalized) throw new Error('Only public HTTP(S) URLs can be crawled.');
  const url = new URL(normalized);
  if ((url.port && !['80', '443'].includes(url.port)) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) throw new Error('Non-public crawl destination.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host }] : await resolve(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('Non-public crawl destination.');
  return url;
}

async function limitedText(response) {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('Page exceeds crawler size limit.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error('Page exceeds crawler size limit.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}

export function createCrawler({ cache = {}, fetchImpl = fetch, resolve = lookup, maxPages = 100, now = () => Date.now(), wait = delay, warn = console.warn } = {}) {
  const rules = new Map();
  const lastRequest = new Map();
  let requests = 0;

  async function request(value, robots = false, redirects = 0, kind = 'page') {
    if (redirects > 4) throw new Error('Too many redirects.');
    const url = await assertPublicUrl(value, resolve);
    let crawlDelay = 500;
    if (!robots) {
      if (!rules.has(url.origin)) {
        const robotsUrl = new URL('/robots.txt', url.origin).href;
        const response = await request(robotsUrl, true);
        // Treat network errors and 5xx as unavailable permission, rather than crawling anyway.
        if (![404, 410].includes(response.status) && response.status !== 200) {
          rules.set(url.origin, robotsParser(robotsUrl, 'User-agent: *\nDisallow: /'));
          throw new Error(`robots.txt returned HTTP ${response.status}`);
        }
        rules.set(url.origin, robotsParser(robotsUrl, response.status === 200 ? response.text : ''));
      }
      const rule = rules.get(url.origin);
      if (rule.isAllowed(url.href, agent) === false) throw new Error('Crawling disallowed by robots.txt.');
      crawlDelay = Math.max(500, (rule.getCrawlDelay(agent) ?? 0) * 1000);
      if (crawlDelay > 10000) throw new Error('Crawl-delay exceeds this build’s crawl budget.');
    }
    await wait(Math.max(0, crawlDelay - (now() - (lastRequest.get(url.origin) ?? 0))));
    lastRequest.set(url.origin, now());
    const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(10000), headers: {
      'User-Agent': `${agent}/1.0 (+https://edinburgh-rl.github.io/)`, Accept: robots ? 'text/plain' : kind === 'page' ? 'text/html,application/xhtml+xml' : 'text/javascript,application/javascript,application/json,text/plain',
    } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = httpUrl(response.headers.get('location'), url.href);
      if (!location) throw new Error('Invalid redirect.');
      // Every redirected page is checked against the destination's robots.txt too.
      return request(location, robots, redirects + 1, kind);
    }
    if (!response.ok) { await response.body?.cancel(); return { status: response.status, url: url.href, text: '' }; }
    const accepted = kind === 'page' ? /text\/html|application\/xhtml\+xml/i : /javascript|ecmascript|application\/json|text\/plain/i;
    if (!robots && !accepted.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel(); throw new Error('Skipping non-HTML resource.');
    }
    return { status: response.status, url: url.href, contentType: response.headers.get('content-type'), text: await limitedText(response) };
  }

  async function cached(value, kind) {
      const url = httpUrl(value);
      if (!url) return null;
      const previous = cache[url];
      const field = kind === 'page' ? 'page' : 'records';
      const ttl = previous?.[field] ? 7 * 86400000 : 86400000;
      if (previous?.parserVersion === 2 && now() - Date.parse(previous.checkedAt) < ttl) return previous[field];
      if (requests >= maxPages) return previous?.[field] ?? null;
      requests++;
      try {
        const result = await request(url, false, 0, kind);
        if (result.status !== 200) throw new Error(`HTTP ${result.status}`);
        const data = kind === 'page' ? parsePage(result.text, result.url) : /application\/json/i.test(result.contentType ?? '') || /\.json(?:$|\?)/i.test(result.url) ? jsonPublications(JSON.parse(result.text), result.url) : staticPublications(result.text, result.url);
        cache[url] = { checkedAt: new Date(now()).toISOString(), parserVersion: 2, [field]: data };
        return data;
      } catch (error) {
        warn(`[publications] Could not inspect ${url}: ${error.message}`);
        // Preserve the last successful page after temporary failures.
        const data = /HTTP (404|410)/.test(error.message) ? null : previous?.[field] ?? null;
        cache[url] = { checkedAt: new Date(now()).toISOString(), parserVersion: 2, [field]: data, error: error.message };
        return data;
      }
  }
  return {
    cache,
    page: value => cached(value, 'page'),
    data: value => cached(value, 'data'),
    failure: value => cache[httpUrl(value)]?.error ?? null,
  };
}

export function isProjectUrl(value) {
  const url = httpUrl(value);
  if (!url) return false;
  const { hostname, pathname } = new URL(url);
  return !/\.(pdf|png|jpe?g|svg|zip)$/i.test(pathname) &&
    !/(^|\.)(arxiv\.org|doi\.org|openalex\.org|scholar\.google\.com|semanticscholar\.org|openreview\.net|github\.com|youtube\.com|twitter\.com|x\.com|linkedin\.com|dblp\.org|proceedings\.mlr\.press|proceedings\.neurips\.cc|aclanthology\.org|joss\.theoj\.org|rlj\.cs\.umass\.edu|dl\.acm\.org|ieeexplore\.ieee\.org|link\.springer\.com|sciencedirect\.com|nature\.com|science\.org|ojs\.aaai\.org)$/.test(hostname);
}

export function projectCandidates(paper, pages) {
  const title = normalizeText(paper.title);
  const candidates = [];
  for (const page of pages.filter(Boolean)) {
    for (const record of page.records ?? []) {
      if (record.projectUrl && matchesRecord(paper, record) && isProjectUrl(record.projectUrl)) candidates.push(record.projectUrl);
    }
    for (const link of page.links) {
      const titles = [title, ...(paper.titles ?? []).map(normalizeText)];
      if (!isProjectUrl(link.url) || paper.landingUrls.includes(link.url) || paper.paperUrl === link.url || !titles.some(value => normalizeText(link.context).includes(value))) continue;
      const label = normalizeText(link.text);
      if (/^(project( page| website)?|website|webpage|web site|demo)$/.test(label) || titles.includes(label)) candidates.push(link.url);
    }
  }
  return [...new Set(candidates)];
}

export function matchesPublication(page, paper) {
  const title = normalizeText(paper.title);
  if ([page.title, ...page.headings].some(value => normalizeText(value).includes(title))) return true;
  if ((page.records ?? []).some(record => matchesRecord(paper, record))) return true;
  if ([page.title, ...page.headings].some(value => titleSimilarity(value, paper.title) >= 0.88) && normalizeText(page.text ?? '').includes(normalizeText(paper.authors[0]?.name))) return true;
  // A project may use a short method name, but link explicitly to this paper's DOI/arXiv ID.
  return page.links.some(link => paper.ids.some(id => id.startsWith('arxiv:') ?
    arxivId(link.url) === id.slice(6) :
    id.startsWith('doi:') && link.url.toLowerCase().includes(`doi.org/${id.slice(4)}`)));
}

export async function collectMemberPages(members, crawler) {
  const pages = [];
  for (const member of members.filter(member => member.publications !== false && member.website)) {
    const page = await crawler.page(member.website);
    if (!page) continue;
    pages.push(page);
    const subpages = [...new Set(page.links.filter(link => /^(publications|research|papers|selected publications)$/i.test(link.text) &&
      new URL(link.url).origin === new URL(page.url).origin && link.url !== page.url).map(link => link.url))].slice(0, 2);
    const collected = [page];
    for (const url of subpages) collected.push(await crawler.page(url));
    for (const item of collected.filter(Boolean)) {
      if (item !== page) pages.push(item);
      if (item.records?.length) continue;
      for (const url of item.scripts ?? []) {
        const records = await crawler.data(url);
        if (records?.length) pages.push({ url, records, links: [], headings: [], title: '', text: '' });
      }
    }
  }
  return pages;
}

export async function enrichProjects(snapshot, members, catalog, crawler, pages = null) {
  pages ??= await collectMemberPages(members, crawler);
  const projects = Object.fromEntries(Object.entries(snapshot.projects ?? {}).filter(([, project]) => isProjectUrl(project.url)));
  for (const paper of catalog) {
    const previous = paper.ids.map(id => projects[id]).find(Boolean);
    const candidates = [...projectCandidates(paper, pages), ...paper.ids.flatMap(id => snapshot.projectCandidates?.[id] ?? []).filter(isProjectUrl)];
    if (paper.projectUrl && isProjectUrl(paper.projectUrl)) candidates.unshift(paper.projectUrl);
    if (previous?.url) candidates.unshift(previous.url);
    // arXiv project links now come from its batched metadata API, not HTML scraping.
    for (const url of [...new Set(candidates)].slice(0, 3)) {
      const page = await crawler.page(url);
      if (!page) {
        if (/HTTP (404|410)/.test(crawler.failure?.(url) ?? '')) for (const [id, project] of Object.entries(projects)) if (project.url === url) delete projects[id];
        continue;
      }
      if (!matchesPublication(page, paper)) continue;
      for (const id of paper.ids) projects[id] = { url };
      break;
    }
  }
  snapshot.projects = projects;
}
