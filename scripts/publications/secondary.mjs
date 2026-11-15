import { setTimeout as delay } from 'node:timers/promises';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { arxivId, arxivUrl, httpUrl, matchesRecord, mergeRecord, normalizeText } from './catalog.mjs';
import { cleanText, recordFromFields } from './metadata.mjs';
import { isProjectUrl, matchesPublication } from './web.mjs';

export function parseArxivFeed(xml) {
  if (/<!DOCTYPE/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Invalid arXiv XML response.');
  const document = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false,
    processEntities: false, isArray: name => ['entry', 'author', 'link'].includes(name) }).parse(xml);
  if (!document.feed) throw new Error('Missing arXiv feed.');
  return (document.feed.entry ?? []).flatMap(entry => {
    const url = arxivUrl(entry.id);
    if (!url) return [];
    const record = recordFromFields({ title: entry.title, authors: (entry.author ?? []).map(author => author.name),
      year: entry.published ?? entry.updated, arxiv: url, url }, url);
    if (!record) return [];
    const comment = cleanText(entry.comment ?? '');
    const projectUrls = /project|website|web page/i.test(comment) ? (comment.match(/https?:\/\/[^\s<>"']+/g) ?? []).map(value => httpUrl(value.replace(/[.,;)]+$/, ''))).filter(Boolean) : [];
    return [{ record, projectUrls, publishedDoi: entry.doi ? String(entry.doi).trim() : null }];
  });
}

export function crossrefRecord(item) {
  if (!['journal-article', 'proceedings-article', 'posted-content'].includes(item.type) || !item.DOI) return null;
  const fields = {
    title: item.title?.[0], authors: (item.author ?? []).map(author => ({ name: [author.given, author.family].filter(Boolean).join(' ') })),
    journal: item.type === 'posted-content' ? null : item['container-title']?.[0],
    year: (item['published-print'] ?? item['published-online'] ?? item.published ?? item.issued)?.['date-parts']?.[0]?.[0], doi: item.DOI,
  };
  const record = recordFromFields(fields, `https://api.crossref.org/works/${encodeURIComponent(item.DOI)}`);
  return record && (item.type === 'posted-content' || record.venue) ? record : null;
}

export function createSecondaryClient({ cache = {}, fetchImpl = fetch, wait = delay, now = () => Date.now() } = {}) {
  const lastRequest = new Map();
  const failures = new Map();
  const arxivCache = cache.arxiv ??= {};
  const requestCache = cache.requests ??= {};

  async function request(url, format) {
    const host = new URL(url).hostname;
    const spacing = host === 'export.arxiv.org' ? 3000 : 1000;
    if ((failures.get(host) ?? 0) >= 3) throw new Error(`${host} temporarily unavailable; using saved metadata.`);
    for (let attempt = 0; attempt < 2; attempt++) {
      await wait(Math.max(0, spacing - (now() - (lastRequest.get(host) ?? 0))));
      lastRequest.set(host, now());
      try {
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), headers: {
          'User-Agent': 'MARBLE-Publications/1.0 (+https://edinburgh-rl.github.io/)', Accept: format === 'xml' ? 'application/atom+xml' : 'application/json',
        } });
        if (response.status === 404) { await response.body?.cancel(); return format === 'json' ? null : []; }
        if (!response.ok) {
          const retryAfter = Number(response.headers.get('retry-after'));
          await response.body?.cancel();
          if (response.status === 429 && retryAfter > 0 && attempt === 0) await wait(Math.min(30000, retryAfter * 1000));
          throw new Error(`${host} returned HTTP ${response.status}`);
        }
        const result = format === 'xml' ? parseArxivFeed(await response.text()) : await response.json();
        failures.set(host, 0);
        return result;
      } catch (error) {
        if (attempt === 1) { failures.set(host, (failures.get(host) ?? 0) + 1); throw error; }
        await wait(Math.max(spacing, 1000));
      }
    }
  }

  const fresh = entry => entry && now() - Date.parse(entry.checkedAt) < (entry.error || entry.value == null || (Array.isArray(entry.value) && !entry.value.length) ? 86400000 : 7 * 86400000);
  async function cached(url, format, transform = value => value) {
    const previous = requestCache[url];
    if (fresh(previous)) {
      if (previous.error && previous.value == null) throw new Error(previous.error);
      return previous.value;
    }
    try {
      const value = transform(await request(url, format));
      requestCache[url] = { checkedAt: new Date(now()).toISOString(), value };
      return value;
    } catch (error) {
      requestCache[url] = { checkedAt: new Date(now()).toISOString(), value: previous?.value ?? null, error: error.message };
      if (previous?.value != null) return previous.value;
      throw error;
    }
  }

  return {
    cache,
    async crossref(paper) {
      const doi = paper.ids.find(id => id.startsWith('doi:') && !id.startsWith('doi:10.48550/arxiv.'))?.slice(4);
      if (doi) {
        const exact = await cached(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, 'json', data => data?.message ? crossrefRecord(data.message) : null);
        if (exact && matchesRecord(paper, exact)) return [exact];
      }
      const url = new URL('https://api.crossref.org/works');
      url.searchParams.set('query.bibliographic', paper.title);
      url.searchParams.set('query.author', paper.authors[0].name);
      url.searchParams.set('rows', '5');
      return cached(url.href, 'json', data => {
        if (!Array.isArray(data?.message?.items)) throw new Error('Invalid Crossref response.');
        return data.message.items.map(crossrefRecord).filter(record => record && matchesRecord(paper, record));
      });
    },
    async arxiv(ids) {
      const distinct = [...new Set(ids.map(arxivId).filter(Boolean))];
      const missing = distinct.filter(id => !fresh(arxivCache[id]));
      for (let offset = 0; offset < missing.length; offset += 50) {
        const batch = missing.slice(offset, offset + 50);
        const url = new URL('https://export.arxiv.org/api/query');
        url.searchParams.set('id_list', batch.join(','));
        url.searchParams.set('max_results', String(batch.length));
        try {
          const records = await request(url.href, 'xml');
          for (const id of batch) arxivCache[id] = { checkedAt: new Date(now()).toISOString(), value: records.find(item => arxivId(item.record.arxivUrl) === id) ?? null };
        } catch (error) {
          for (const id of batch) arxivCache[id] = { checkedAt: new Date(now()).toISOString(), value: arxivCache[id]?.value ?? null, error: error.message };
          throw error;
        }
      }
      return distinct.map(id => arxivCache[id]?.value).filter(Boolean);
    },
    async searchArxiv(paper) {
      const words = normalizeText(paper.title).split(' ').filter(word => word.length > 3).slice(0, 3);
      if (!words.length) return [];
      const url = new URL('https://export.arxiv.org/api/query');
      url.searchParams.set('search_query', `${words.map(word => `ti:${word}`).join(' AND ')} AND au:${normalizeText(paper.authors[0].name).split(' ').at(-1)}`);
      url.searchParams.set('max_results', '5');
      return cached(url.href, 'xml', items => items.filter(item => matchesRecord(paper, item.record)));
    },
  };
}

export function isPublisherUrl(value) {
  const url = httpUrl(value);
  if (!url || arxivId(url)) return false;
  const parsed = new URL(url);
  return /(^|\.)(doi\.org|proceedings\.mlr\.press|proceedings\.neurips\.cc|rlj\.cs\.umass\.edu|openreview\.net|dl\.acm\.org|ieeexplore\.ieee\.org|link\.springer\.com|sciencedirect\.com|nature\.com|science\.org|ojs\.aaai\.org|joss\.theoj\.org|aclanthology\.org)$/.test(parsed.hostname) && parsed.pathname !== '/';
}

export async function enrichBibliography(snapshot, catalog, pages, client, crawler, { warn = console.warn } = {}) {
  const bibliography = { ...snapshot.bibliography };
  const projectCandidates = { ...snapshot.projectCandidates };
  const authorRecords = pages.flatMap(page => page?.records ?? []);
  const related = new Map(catalog.map(paper => [paper.id, authorRecords.filter(record => matchesRecord(paper, record))]));
  const allIds = catalog.flatMap(paper => [paper, ...related.get(paper.id)].flatMap(record => record.ids.filter(id => id.startsWith('arxiv:'))));
  let arxiv = [];
  try { arxiv = await client.arxiv(allIds); }
  catch (error) { warn(`[publications] arXiv metadata: ${error.message}`); }
  const warned = new Set();

  for (const paper of catalog) {
    if (paper.id.startsWith('manual:')) continue;
    const personal = related.get(paper.id);
    let arxivMatches = arxiv.filter(item => matchesRecord(paper, item.record));
    if (!arxivMatches.length && !paper.ids.some(id => id.startsWith('arxiv:'))) {
      try { arxivMatches = await client.searchArxiv(paper); }
      catch (error) { if (!warned.has('arxiv')) { warn(`[publications] arXiv search: ${error.message}`); warned.add('arxiv'); } }
    }
    const urls = [...new Set([...personal.filter(record => record.status === 'published').map(record => record.paperUrl),
      ...paper.landingUrls, paper.paperUrl, ...arxivMatches.map(item => item.publishedDoi ? `https://doi.org/${item.publishedDoi}` : null)].filter(isPublisherUrl))];
    const publisherRecords = [];
    for (const url of urls.slice(0, 3)) {
      const page = await crawler.page(url);
      if (!page || !isPublisherUrl(page.url)) continue;
      const citations = (page.records ?? []).filter(record => record.status === 'published' && matchesRecord(paper, record));
      for (const record of citations) publisherRecords.push({ ...record, paperUrl: /^https?:\/\/(?:dx\.)?doi\.org\//i.test(url) ? url : page.url });
      if (!citations.length && paper.status === 'published' && paper.venue && matchesPublication(page, paper) &&
        normalizeText(page.text ?? '').includes(normalizeText(paper.authors[0].name))) publisherRecords.push({ ...paper, paperUrl: url, sources: [...paper.sources, page.url] });
    }

    let registered = [];
    if (!publisherRecords.length) {
      try { registered = await client.crossref(paper); }
      catch (error) { if (!warned.has('crossref')) { warn(`[publications] Crossref: ${error.message}`); warned.add('crossref'); } }
    }

    const published = [...publisherRecords, ...registered.filter(record => record.status === 'published')].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const fallback = arxivMatches[0]?.record;
    let selected = published[0] ?? fallback;
    if (!published.length && fallback && paper.status === 'published' && paper.venue) {
      // A missing secondary record must not erase an already known publication.
      // Its verified arXiv copy remains a usable link if the publisher is blocked.
      selected = { ...paper, paperUrl: fallback.arxivUrl, arxivUrl: fallback.arxivUrl };
    }
    const previous = paper.ids.map(id => bibliography[id]).find(record => record && matchesRecord(paper, record));
    if (previous?.status === 'published' && !published.length && !/HTTP (404|410)/.test(crawler.failure?.(previous.paperUrl) ?? '')) selected = previous;
    if (selected) {
      let record = mergeRecord(paper, selected);
      if (fallback) {
        record.ids = [...new Set([...record.ids, ...fallback.ids])];
        record.arxivUrl = fallback.arxivUrl;
        record.sources = [...new Set([...record.sources, ...fallback.sources])];
      }
      bibliography[paper.id] = record;
    } else warn(`[publications] Could not verify a publisher or arXiv link for: ${paper.title}`);

    const candidates = [...personal.map(record => record.projectUrl), ...arxivMatches.flatMap(item => item.projectUrls)].filter(url => url && isProjectUrl(url));
    projectCandidates[paper.id] = [...new Set(candidates)];
  }
  snapshot.bibliography = bibliography;
  snapshot.projectCandidates = projectCandidates;
}
