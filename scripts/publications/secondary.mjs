import { setTimeout as delay } from 'node:timers/promises';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { arxivId, arxivUrl, httpUrl, matchesRecord, mergeRecord, normalizeDate, normalizeText, titleSimilarity } from './catalog.mjs';
import { cleanText, recordFromFields } from './metadata.mjs';
import { isProjectUrl, matchesPublication } from './web.mjs';

const parserVersion = 2;
const arxivParserVersion = 3;

function arxivVenue(entry) {
  const journal = cleanText(entry.journal_ref ?? '');
  if (journal && !/arxiv|preprint|^corr\b/i.test(journal)) return journal;
  const comment = cleanText(entry.comment ?? '');
  const match = comment.match(/\b(?:accepted|published|to appear|to be published)(?:\s+(?:for|as)\s+(?:an?\s+)?(?:(?:conference|workshop|journal|short|full)\s+)?(?:publication|presentation|paper|poster|oral|spotlight))?\s+(?:at|in|to|by)\s+(.+?)(?=[.;!]|https?:\/\/|$)/i);
  if (!match || /\b(?:not(?:\s+yet)?|never|no longer)\s*$/i.test(comment.slice(Math.max(0, match.index - 20), match.index))) return null;
  const venue = match[1].replace(/^the\s+/i, '').trim();
  if (!/\b(?:ICML|ICLR|NeurIPS|NIPS|AAAI|AAMAS|IJCAI|ECAI|AISTATS|COLT|UAI|CoRL|ICRA|IROS|RSS|CVPR|ICCV|ECCV|CHI|TMLR|RLJ|journal|transactions|conference|workshop|symposium|proceedings)\b/i.test(venue)) return null;
  return venue.replace(/^TMLR\b/i, 'Transactions on Machine Learning Research');
}

export function parseArxivFeed(xml) {
  if (/<!DOCTYPE/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Invalid arXiv XML response.');
  const document = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false,
    processEntities: false, isArray: name => ['entry', 'author', 'link'].includes(name) }).parse(xml);
  if (!document.feed) throw new Error('Missing arXiv feed.');
  return (document.feed.entry ?? []).flatMap(entry => {
    const url = arxivUrl(entry.id);
    if (!url) return [];
    const venue = arxivVenue(entry);
    const publicationYear = venue?.match(/\b(?:19|20|21)\d{2}\b/)?.[0];
    const record = recordFromFields({ title: entry.title, authors: (entry.author ?? []).map(author => author.name),
      journal: venue, year: publicationYear ?? entry.published ?? entry.updated, arxiv: url, url,
      arxivSubmittedAt: entry.published, abstract: entry.summary }, url);
    if (!record) return [];
    const comment = cleanText(entry.comment ?? '');
    const projectUrls = /project|website|web page/i.test(comment) ? (comment.match(/https?:\/\/[^\s<>"']+/g) ?? []).map(value => httpUrl(value.replace(/[.,;)]+$/, ''))).filter(Boolean) : [];
    return [{ record, projectUrls, publishedDoi: entry.doi ? String(entry.doi).trim() : null }];
  });
}

export function crossrefRecord(item) {
  if (!['journal-article', 'proceedings-article', 'posted-content'].includes(item.type) || !item.DOI) return null;
  const publicationDate = [item['published-print'], item['published-online'], item.published, item.issued]
    .map(date => date?.['date-parts']?.[0]).filter(Array.isArray)
    .map(parts => normalizeDate(parts.slice(0, 3).join('-'))).find(Boolean) ?? null;
  const fields = {
    title: item.title?.[0], authors: (item.author ?? []).map(author => ({ name: [author.given, author.family].filter(Boolean).join(' ') })),
    journal: item.type === 'posted-content' ? null : item['container-title']?.[0],
    year: publicationDate, publicationDate, abstract: item.abstract, doi: item.DOI,
  };
  const record = recordFromFields(fields, `https://api.crossref.org/works/${encodeURIComponent(item.DOI)}`);
  return record && (item.type === 'posted-content' || record.venue) ? record : null;
}

export function createSecondaryClient({ cache = {}, fetchImpl = fetch, wait = delay, now = () => Date.now(), warn = console.warn } = {}) {
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
    const version = format === 'xml' ? arxivParserVersion : parserVersion;
    if (fresh(previous) && (previous.parserVersion === version || previous.error)) {
      if (previous.error && previous.value == null) throw new Error(previous.error);
      return previous.value;
    }
    try {
      const value = transform(await request(url, format));
      requestCache[url] = { checkedAt: new Date(now()).toISOString(), parserVersion: version, value };
      return value;
    } catch (error) {
      requestCache[url] = { ...previous, checkedAt: new Date(now()).toISOString(), value: previous?.value ?? null, error: error.message };
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
      const missing = distinct.filter(id => !fresh(arxivCache[id]) || (arxivCache[id].parserVersion !== arxivParserVersion && !arxivCache[id].error));
      for (let offset = 0; offset < missing.length; offset += 50) {
        const batch = missing.slice(offset, offset + 50);
        const url = new URL('https://export.arxiv.org/api/query');
        url.searchParams.set('id_list', batch.join(','));
        url.searchParams.set('max_results', String(batch.length));
        try {
          const records = await request(url.href, 'xml');
          for (const id of batch) arxivCache[id] = { checkedAt: new Date(now()).toISOString(), parserVersion: arxivParserVersion, value: records.find(item => arxivId(item.record.arxivUrl) === id) ?? null };
        } catch (error) {
          for (const id of batch) arxivCache[id] = { ...arxivCache[id], checkedAt: new Date(now()).toISOString(), value: arxivCache[id]?.value ?? null, error: error.message };
          warn(`[publications] arXiv metadata: ${error.message}. Using saved records for this batch.`);
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

function publisherPageUrl(value) {
  if (!isPublisherUrl(value)) return null;
  const url = new URL(value);
  if (url.hostname === 'openreview.net' && url.pathname === '/pdf' && url.searchParams.has('id')) url.pathname = '/forum';
  if (url.hostname === 'proceedings.mlr.press' && /\.pdf$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/([^/]+)\/\1\.pdf$/, '/$1.html');
  }
  return url.href;
}

function authorPublisherUrls(paper, pages) {
  const titles = [paper.title, ...(paper.titles ?? [])].map(normalizeText);
  return pages.flatMap(page => (page.links ?? []).filter(link =>
    titles.some(title => normalizeText(link.context).includes(title))).map(link => publisherPageUrl(link.url))).filter(Boolean);
}

function authorVenueRecords(paper, pages) {
  return pages.flatMap(page => (page.venueHints ?? []).flatMap(hint => {
    const exact = normalizeText(hint.title) === normalizeText(paper.title);
    // Venue-only hints may use an alternate workshop title. A shared DOI/arXiv
    // identifier is still mandatory, and the canonical paper title is retained.
    if (!exact && (Math.min(normalizeText(hint.title).split(' ').length, normalizeText(paper.title).split(' ').length) < 5 || titleSimilarity(hint.title, paper.title) < 0.6)) return [];
    const identified = hint.urls.some(url => paper.ids.some(id => id.startsWith('arxiv:') ? arxivId(url) === id.slice(6) :
      id.startsWith('doi:') && url.toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '') === id.slice(4)));
    if (!identified) return [];
    const record = recordFromFields({ title: paper.title, authors: paper.authors, journal: hint.venue, year: hint.year,
      arxiv: hint.urls.map(arxivUrl).find(Boolean) }, page.url);
    if (record && !exact) record.titles = [hint.title];
    return record ? [record] : [];
  }));
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
    const personal = [...related.get(paper.id), ...authorVenueRecords(paper, pages)];
    const previous = paper.ids.map(id => bibliography[id]).find(record => record && matchesRecord(paper, record));
    let arxivMatches = arxiv.filter(item => matchesRecord(paper, item.record));
    if (!arxivMatches.length && !paper.ids.some(id => id.startsWith('arxiv:'))) {
      try { arxivMatches = await client.searchArxiv(paper); }
      catch (error) { if (!warned.has('arxiv')) { warn(`[publications] arXiv search: ${error.message}`); warned.add('arxiv'); } }
    }
    const urls = [...new Set([...personal.filter(record => record.status === 'published').map(record => record.paperUrl),
      ...authorPublisherUrls(paper, pages), previous?.paperUrl, ...paper.landingUrls, paper.paperUrl,
      ...arxivMatches.map(item => item.publishedDoi ? `https://doi.org/${item.publishedDoi}` : null)].map(publisherPageUrl).filter(Boolean))];
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
      const dois = arxivMatches.map(item => item.publishedDoi ? `doi:${item.publishedDoi.toLowerCase()}` : null).filter(Boolean);
      try { registered = await client.crossref({ ...paper, ids: [...dois, ...paper.ids] }); }
      catch (error) { if (!warned.has('crossref')) { warn(`[publications] Crossref: ${error.message}`); warned.add('crossref'); } }
    }

    const published = [...publisherRecords, ...registered.filter(record => record.status === 'published')].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const fallback = arxivMatches[0]?.record;
    const saved = previous?.status === 'published' && !/HTTP (404|410)/.test(crawler.failure?.(previous.paperUrl) ?? '') ? previous : null;
    const verifiedSaved = saved?.sources.some(source => isPublisherUrl(source) || /^https:\/\/api\.crossref\.org\/works\//.test(source)) ? saved : null;
    const reported = [...personal, ...arxivMatches.map(item => item.record)].filter(record => record.status === 'published' && record.venue)
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const selected = published[0] ?? (paper.status === 'published' && paper.venue ? paper : null) ?? verifiedSaved ?? reported[0] ?? saved ?? fallback;
    if (selected) {
      let record = mergeRecord(paper, selected);
      if (previous) record = mergeRecord({ ...previous, id: paper.id }, record);
      // A venue can be known even when only the arXiv copy has a usable URL.
      // Author-page URLs are candidates, not verified paper links.
      const links = [published[0]?.paperUrl, saved?.paperUrl, paper.paperUrl];
      record.paperUrl = links.find(url => isPublisherUrl(url) && !/HTTP (404|410)/.test(crawler.failure?.(url) ?? '')) ??
        fallback?.arxivUrl ?? record.arxivUrl ?? personal.map(item => item.arxivUrl).find(Boolean) ?? null;
      if (fallback) {
        record = mergeRecord({ ...fallback, id: paper.id, ids: [...new Set([paper.id, ...fallback.ids])] }, record);
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
