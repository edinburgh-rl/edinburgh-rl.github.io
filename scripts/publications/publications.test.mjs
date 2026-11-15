import test from 'node:test';
import assert from 'node:assert/strict';
import { authorId, buildCatalog, deduplicate, httpUrl, mergeRecord, normalizeWork, validateOverrides, validateSnapshot } from './catalog.mjs';
import { createOpenAlexClient } from './openalex.mjs';
import { assertPublicUrl, createCrawler, matchesPublication, parsePage, projectCandidates } from './web.mjs';
import { refreshResearchers } from '../sync-publications.mjs';

const work = (changes = {}) => ({
  id: 'https://openalex.org/W100', title: 'Learning useful behaviours with reinforcement learning',
  type: 'conference-paper', publication_year: 2025, doi: 'https://doi.org/10.1234/example',
  authorships: [{ author: { id: 'https://openalex.org/A1', display_name: 'Alice Example' } }],
  primary_location: { landing_page_url: 'https://papers.example/paper', source: { type: 'conference', display_name: 'ICML' } },
  locations: [{ landing_page_url: 'https://arxiv.org/abs/2501.12345v2', source: { type: 'repository', display_name: 'arXiv' } }],
  ...changes,
});
const paper = (changes = {}) => ({ ...normalizeWork(work()), ...changes });
const members = [{ id: 'alice', name: 'Alice Example', openalex: 'A1' }, { id: 'bob', name: 'Bob Example', openalex: 'A2' }];
const emptyOverrides = () => ({ exclude: [], overrides: {}, additions: [] });
const source = (id, papers) => ({ openalexId: id, updatedAt: '2026-11-15T00:00:00Z', publications: papers });
const snapshot = () => ({ version: 1, researchers: { alice: source('A1', [paper()]) }, projects: {} });
const noWait = async () => {};
const publicDns = async () => [{ address: '93.184.216.34' }];
const htmlResponse = (body, options = {}) => new Response(body, { headers: { 'content-type': 'text/html' }, ...options });

test('author IDs accept URLs and reject arbitrary filters', () => {
  assert.equal(authorId('https://openalex.org/a123/'), 'A123');
  assert.throws(() => authorId('A123|A456'));
  assert.equal(httpUrl('javascript:alert(1)'), null);
});

test('normalization uses the publication venue and preserves the arXiv identifier', () => {
  const result = normalizeWork(work());
  assert.equal(result.venue, 'ICML');
  assert.equal(result.status, 'published');
  assert.ok(result.ids.includes('arxiv:2501.12345'));
  assert.equal(result.authors[0].openalexId, 'A1');
  for (const type of ['article', 'conference-paper', 'proceedings-article', 'data-paper', 'software-paper']) assert.ok(normalizeWork(work({ type })));
});

test('repository-only papers are preprints with no invented conference', () => {
  const result = normalizeWork(work({ type: 'preprint', primary_location: null }));
  assert.equal(result.venue, null);
  assert.equal(result.status, 'preprint');
  assert.equal(normalizeWork(work({ title: null })), null);
  assert.equal(normalizeWork(work({ type: 'dataset' })), null);
});

test('shared DOI merges coauthored records and keeps every matching member', () => {
  const result = deduplicate([paper({ memberIds: ['alice'] }), paper({ id: 'openalex:W200', ids: ['openalex:W200', 'doi:10.1234/example'], memberIds: ['bob'] })]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].memberIds, ['alice', 'bob']);
});

test('a published version replaces its matching preprint but unrelated titles stay separate', () => {
  const preprint = paper({ id: 'openalex:W200', ids: ['openalex:W200'], status: 'preprint', venue: null, year: 2024 });
  const result = deduplicate([preprint, paper()]);
  assert.equal(result.length, 1);
  assert.equal(result[0].venue, 'ICML');
  assert.equal(result[0].year, 2025);
  assert.equal(deduplicate([preprint, paper({ authors: [{ name: 'Someone Else' }] })]).length, 2);
  assert.equal(deduplicate([paper(), paper({ id: 'openalex:W300', ids: ['openalex:W300'] })]).length, 2);
});

test('incomplete secondary records and duplicates preserve a known publication year', () => {
  const known = paper({ year: 2026 });
  const incomplete = paper({ year: null });
  assert.equal(mergeRecord(known, incomplete).year, 2026);
  assert.equal(mergeRecord(known, paper({ year: undefined })).year, 2026);
  assert.equal(mergeRecord(paper({ year: 2025 }), known).year, 2026);
  for (const records of [[known, incomplete], [incomplete, known]]) {
    assert.equal(deduplicate(records)[0].year, 2026);
  }
});

test('cached Probing metadata keeps its OpenAlex year and highlights Kale-ab with his middle name', () => {
  const known = paper({ title: 'Probing Dec-POMDP Reasoning in Cooperative MARL', year: 2026,
    authors: [{ name: 'Kale-ab Tessera', openalexId: 'A5048679971' }] });
  const saved = { version: 1, researchers: { kaleab: source('A5048679971', [known]) },
    bibliography: { [known.id]: { ...known, year: null, venue: 'Proceedings of AAMAS',
      authors: [{ name: 'Kale-ab Abebe Tessera', openalexId: null }] } } };
  const [result] = buildCatalog(saved, [{ id: 'kaleab', openalex: 'A5048679971' }], emptyOverrides());
  assert.equal(result.year, 2026);
  assert.equal(result.venue, 'Proceedings of AAMAS');
  assert.deepEqual(result.authors, [{ name: 'Kale-ab Abebe Tessera', openalexId: 'A5048679971', memberId: 'kaleab' }]);
  assert.deepEqual(result.memberIds, ['kaleab']);
  assert.equal(saved.bibliography[known.id].year, null);
});

test('author identity survives middle-name variants and duplicate records', () => {
  const known = paper({ authors: [{ name: 'Kale-ab Tessera', openalexId: 'A5048679971' }, { name: 'Alice Jane Example', openalexId: 'A1' }] });
  const secondary = paper({ authors: [{ name: 'Alice J. Example', openalexId: null }, { name: 'Kale-ab Abebe Tessera', openalexId: null }] });
  for (const result of [mergeRecord(known, secondary), deduplicate([known, secondary])[0]]) {
    assert.deepEqual(result.authors, [{ name: 'Alice J. Example', openalexId: 'A1' }, { name: 'Kale-ab Abebe Tessera', openalexId: 'A5048679971' }]);
  }
});

test('author matching respects explicit IDs, conflicting middle names and ambiguous coauthors', () => {
  const known = paper({ authors: [{ name: 'Alice Jane Example', openalexId: 'A1' }] });
  const mergeAuthors = authors => mergeRecord(known, paper({ authors })).authors;
  assert.equal(mergeAuthors([{ name: 'Alice Jane Example', openalexId: 'A99' }])[0].openalexId, 'A99');
  assert.equal(mergeAuthors([{ name: 'Alice Mary Example', openalexId: null }])[0].openalexId, null);
  assert.deepEqual(mergeAuthors([{ name: 'Alice Example' }, { name: 'Alice J. Example' }]).map(a => a.openalexId), [null, null]);
  const ambiguous = paper({ authors: [...known.authors, { name: 'Alice Mary Example', openalexId: 'A2' }] });
  assert.equal(mergeRecord(ambiguous, paper({ authors: [{ name: 'Alice Example' }] })).authors[0].openalexId, null);
  const exact = mergeRecord(ambiguous, paper({ authors: [{ name: 'Alice Jane Example' }, { name: 'Alice Example' }] }));
  assert.deepEqual(exact.authors.map(a => a.openalexId), ['A1', 'A2']);
});

test('catalog applies corrections, exclusions and manual additions while ignoring legacy previews', () => {
  const saved = snapshot();
  saved.projects['openalex:W100'] = { url: 'https://project.example/' };
  saved.previews = { 'https://project.example/': { imageUrl: 'https://project.example/preview.png' } };
  saved.researchers.alice.publications[0].imageUrl = 'https://project.example/preview.png';
  const overrides = emptyOverrides();
  overrides.overrides['doi:10.1234/example'] = { venue: 'ICLR', year: 2026 };
  let result = buildCatalog(saved, members, overrides);
  assert.equal(result[0].venue, 'ICLR');
  assert.equal(result[0].authors[0].memberId, 'alice');
  assert.equal(Object.hasOwn(result[0], 'imageUrl'), false);
  overrides.overrides['doi:10.1234/example'].projectUrl = null;
  assert.equal(buildCatalog(saved, members, overrides)[0].projectUrl, null);
  overrides.exclude.push('openalex:W100');
  overrides.additions.push({ id: 'manual:example', title: 'An unindexed paper', authors: [{ name: 'Bob Example' }], memberIds: ['bob'], venue: 'RLC', year: 2026, status: 'published' });
  result = buildCatalog(saved, members, overrides);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'manual:example');
});

test('changed IDs, removed members, and opt-outs cannot retain old papers', () => {
  assert.equal(buildCatalog(snapshot(), [{ ...members[0], openalex: 'A99' }], emptyOverrides()).length, 0);
  assert.equal(buildCatalog(snapshot(), [{ ...members[0], publications: false }], emptyOverrides()).length, 0);
  assert.equal(buildCatalog(snapshot(), [], emptyOverrides()).length, 0);
});

test('invalid snapshot and overrides fail instead of silently erasing data', () => {
  assert.throws(() => validateSnapshot({ version: 2, researchers: {} }));
  assert.throws(() => validateOverrides({ ...emptyOverrides(), overrides: { example: { projectUrl: 'javascript:alert(1)' } } }));
  assert.throws(() => validateOverrides({ ...emptyOverrides(), additions: [{ id: 'manual:bad' }] }));
});

test('OpenAlex follows every cursor and retries rate limits without placing API keys in URLs', async () => {
  const urls = [];
  const responses = [new Response('', { status: 429, headers: { 'retry-after': '1' } }),
    Response.json({ meta: { next_cursor: 'next' }, results: [work()] }), Response.json({ meta: { next_cursor: null }, results: [work({ id: 'https://openalex.org/W200' })] })];
  const client = createOpenAlexClient({ apiKey: 'private-test-key', wait: noWait, fetchImpl: async (url, options) => {
    urls.push(new URL(url));
    assert.equal(options.headers.Authorization, 'Bearer private-test-key');
    return responses.shift();
  } });
  const results = await client.publications('A1');
  assert.equal(results.length, 2);
  assert.equal(urls[2].searchParams.get('cursor'), 'next');
  assert.ok(urls.every(url => !url.href.includes('private-test-key')));
});

test('failed later pages preserve the whole old researcher snapshot', async () => {
  let requests = 0;
  const client = createOpenAlexClient({ wait: noWait, fetchImpl: async () => ++requests === 1 ?
    Response.json({ meta: { next_cursor: 'next' }, results: [work({ id: 'https://openalex.org/W999' })] }) : new Response('', { status: 403 }) });
  const previous = snapshot();
  const result = await refreshResearchers(previous, members, client, { warn() {} });
  assert.equal(result.researchers.alice, previous.researchers.alice);
  assert.equal(result.researchers.bob, undefined);
  const changed = await refreshResearchers(previous, [{ ...members[0], openalex: 'A99' }], client, { warn() {} });
  assert.equal(changed.researchers.alice, undefined);
});

test('offline refresh performs no requests and still respects researcher ID changes', async () => {
  const client = { publications() { throw new Error('Unexpected network request'); } };
  const result = await refreshResearchers(snapshot(), members, client, { offline: true, warn() {} });
  assert.equal(result.researchers.alice.publications.length, 1);
  assert.equal(result.researchers.bob, undefined);
});

test('HTML parsing associates project links with one publication without collecting preview images', () => {
  const page = parsePage(`<title>Publications &amp; projects</title><meta content='/preview.png' property='og:image'><ul>
    <li>${work().title}<a href='https://project.example/'>Project website</a></li>
    <li>Unrelated work<a href='https://wrong.example/'>Website</a></li></ul>`, 'https://author.example/');
  assert.equal(Object.hasOwn(page, 'imageUrl'), false);
  assert.equal(page.title, 'Publications & projects');
  assert.deepEqual(projectCandidates(paper(), [page]), ['https://project.example/']);
  assert.equal(matchesPublication(parsePage(`<h1>${work().title}</h1>`, 'https://project.example/'), paper()), true);
  assert.equal(matchesPublication(parsePage('<h1>Unrelated project</h1>', 'https://wrong.example/'), paper()), false);
  const publisher = parsePage(`<li>${work().title}<a href="https://joss.theoj.org/papers/10.21105/joss.12345">Website</a><a href="https://papers.example/paper">${work().title}</a></li>`, 'https://author.example/');
  assert.deepEqual(projectCandidates(paper(), [publisher]), []);
});

test('crawler honors robots.txt and does not fetch a forbidden page', async () => {
  const requests = [];
  const crawler = createCrawler({ resolve: publicDns, wait: noWait, warn() {}, fetchImpl: async url => {
    requests.push(url.href);
    return new Response('User-agent: *\nDisallow: /private', { headers: { 'content-type': 'text/plain' } });
  } });
  assert.equal(await crawler.page('https://author.example/private'), null);
  assert.deepEqual(requests, ['https://author.example/robots.txt']);
});

test('crawler rejects private DNS results, IPv6 local addresses and redirects to localhost', async () => {
  await assert.rejects(assertPublicUrl('http://localhost/'));
  await assert.rejects(assertPublicUrl('http://[::1]/'));
  await assert.rejects(assertPublicUrl('http://[::ffff:127.0.0.1]/'));
  await assert.rejects(assertPublicUrl('https://author.example/', async () => [{ address: '192.168.1.2' }]));
  const requests = [];
  const crawler = createCrawler({ resolve: publicDns, wait: noWait, warn() {}, fetchImpl: async url => {
    requests.push(url.href);
    return url.pathname === '/robots.txt' ? new Response('', { status: 404 }) : new Response('', { status: 302, headers: { location: 'http://127.0.0.1/internal' } });
  } });
  assert.equal(await crawler.page('https://author.example/'), null);
  assert.equal(requests.length, 2);
});

test('crawler caches successful metadata and keeps it after transient failures', async () => {
  let requests = 0;
  let current = Date.parse('2026-11-01T00:00:00Z');
  let fail = false;
  const crawler = createCrawler({ resolve: publicDns, wait: noWait, now: () => current, warn() {}, fetchImpl: async url => {
    requests++;
    if (fail) throw new Error('Temporary outage');
    return url.pathname === '/robots.txt' ? new Response('', { status: 404 }) : htmlResponse('<title>Research</title>');
  } });
  assert.equal((await crawler.page('https://author.example/')).title, 'Research');
  await crawler.page('https://author.example/');
  assert.equal(requests, 2);
  current += 8 * 86400000;
  fail = true;
  assert.equal((await crawler.page('https://author.example/')).title, 'Research');
});
