import test from 'node:test';
import assert from 'node:assert/strict';
import { arxivId, buildCatalog, matchesRecord, normalizeWork } from './catalog.mjs';
import { parseBibtex, recordFromFields, staticPublications } from './metadata.mjs';
import { createSecondaryClient, crossrefRecord, enrichBibliography, isPublisherUrl, parseArxivFeed } from './secondary.mjs';
import { collectMemberPages, createCrawler, enrichProjects, parsePage, projectCandidates } from './web.mjs';

const oldTitle = 'Assistax:A hardware-accelerated reinforcement learning benchmark for assistive robotics';
const newTitle = 'Assistax: A Multi-Agent Hardware-Accelerated Reinforcement Learning Benchmark for Assistive Robotics';
const publisherUrl = 'https://rlj.cs.umass.edu/2026/papers/Paper110.html';
const authors = [{ name: 'Leonard Hinckeldey', openalexId: 'A1' }, { name: 'Elliot Fosong', openalexId: 'A2' }, { name: 'Elle Miller', openalexId: 'A3' }];
const base = () => ({ id: 'openalex:W1', ids: ['openalex:W1'], title: oldTitle, authors, memberIds: ['leo'], venue: null, year: 2025, status: 'unknown',
  paperUrl: 'https://hdl.handle.net/example', landingUrls: ['https://hdl.handle.net/example'], sources: ['https://openalex.org/W1'] });
const bibtex = (url = publisherUrl) => `@article{hinckeldey2026assistax,
  title={${newTitle}}, author={Hinckeldey, Leonard and Fosong, Elliot and Miller, Elle},
  journal={Reinforcement Learning Journal}, year={2026}, url={${url}} }`;
const personalPage = () => parsePage(`<pre>${bibtex()}</pre><pre>@misc{old, title={${oldTitle}}, author={Leonard Hinckeldey and Elliot Fosong and Elle Miller}, year={2025}, eprint={2507.21638}, url={https://arxiv.org/abs/2507.21638}}</pre>`, 'https://author.example/publications/');
const preprint = () => recordFromFields({ title: newTitle, authors, arxiv: 'https://arxiv.org/abs/2507.21638', year: 2025 }, 'https://arxiv.org/abs/2507.21638');
const atom = (id = '2507.21638', comment = '') => `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom"><entry>
  <id>http://arxiv.org/abs/${id}v3</id><title>${newTitle}</title><published>2025-07-29T00:00:00Z</published>
  <author><name>Leonard Hinckeldey</name></author><author><name>Elliot Fosong</name></author>
  <arxiv:comment>${comment}</arxiv:comment></entry></feed>`;
const overrides = { exclude: [], overrides: {}, additions: [] };

test('changed ASSISTAX titles match only with compatible authors and years', () => {
  const updated = { ...base(), title: newTitle, year: 2026 };
  assert.equal(matchesRecord(base(), updated), true);
  assert.equal(matchesRecord(base(), { ...updated, authors: [{ name: 'Different Person' }] }), false);
  assert.equal(matchesRecord(base(), { ...updated, year: 2030 }), false);
  assert.equal(matchesRecord(base(), { ...updated, title: 'A different hardware accelerated benchmark for robotics' }), false);
  const indexed = { ...base(), ids: ['arxiv:2507.21638'] };
  assert.equal(matchesRecord(indexed, { ...updated, ids: indexed.ids, year: 2030 }), true);
  assert.equal(matchesRecord(indexed, { ...updated, ids: indexed.ids, year: 2030, title: 'An unrelated article' }), false);
});

test('institutional repository links are not used as canonical paper links', () => {
  const record = normalizeWork({ id: 'https://openalex.org/W1', title: oldTitle, type: 'article', publication_year: 2025,
    authorships: [{ author: { id: 'https://openalex.org/A1', display_name: 'Leonard Hinckeldey' } }],
    primary_location: { landing_page_url: 'https://hdl.handle.net/example', source: { type: 'repository', display_name: 'University of Edinburgh' } } });
  assert.equal(record.paperUrl, null);
  assert.equal(arxivId('https://doi.org/10.48550/arXiv.2507.21638'), '2507.21638');
  assert.equal(arxivId('https://arxiv.org/pdf/2507.21638v3.pdf'), '2507.21638');
  assert.equal(isPublisherUrl('https://doi.org/10.48550/arxiv.2507.21638'), false);
});

test('BibTeX parsing handles nested title braces and surname-first authors', () => {
  const records = parseBibtex('@inproceedings{x, title={Probing Dec-{POMDP} Reasoning in Cooperative {MARL}}, author={Tessera, Kale-ab and Hinckeldey, Leonard}, year=2026, booktitle={AAMAS}, url={https://openreview.net/forum?id=example}}', 'https://author.example/');
  assert.equal(records[0].title, 'Probing Dec-POMDP Reasoning in Cooperative MARL');
  assert.equal(records[0].authors[0].name, 'Kale-ab Tessera');
  assert.equal(records[0].venue, 'AAMAS');
  assert.equal(records[0].paperUrl, 'https://openreview.net/forum?id=example');
});

test('literal publication data can be extracted without executing site JavaScript', () => {
  const script = `globalThis.__remoteScriptExecuted = true;
    document.addEventListener('DOMContentLoaded', () => { const publications = [{ title: 'Forgetting is Everywhere',
    authors: '<strong>Ben Sanati</strong>, Thomas L. Lee', arxiv: 'https://arxiv.org/abs/2511.04666',
    project: 'https://ben-sanati.github.io/forgetting-is-everywhere-project/' }]; });`;
  const records = staticPublications(script, 'https://ben-sanati.github.io/script.js');
  assert.equal(globalThis.__remoteScriptExecuted, undefined);
  assert.equal(records[0].authors[0].name, 'Ben Sanati');
  assert.equal(records[0].projectUrl, 'https://ben-sanati.github.io/forgetting-is-everywhere-project/');
  const paper = { ...base(), title: 'Forgetting is Everywhere', authors: [{ name: 'Ben Sanati' }, { name: 'Thomas L. Lee' }] };
  assert.deepEqual(projectCandidates(paper, [{ records, links: [] }]), [records[0].projectUrl]);
});

test('arXiv metadata provides canonical URLs and project references without HTML crawling', () => {
  const entries = parseArxivFeed(atom('2507.21638', 'Project page: https://project.example/?x=1&amp;y=2'));
  assert.equal(entries[0].record.arxivUrl, 'https://arxiv.org/abs/2507.21638');
  assert.deepEqual(entries[0].projectUrls, ['https://project.example/?x=1&y=2']);
  assert.throws(() => parseArxivFeed('<!DOCTYPE feed><feed/>'));
  assert.throws(() => parseArxivFeed('<invalid>'));
});

test('arXiv keeps the first submission date, original abstract and confirmed venue comments', () => {
  const xml = atom('2507.21638', 'To appear in ICML 2026. An earlier version was presented in 2025.')
    .replace('</published>', '</published><updated>2026-06-01T00:00:00Z</updated><summary>We study $x_{t+1}$ &amp; compare two methods.</summary>');
  const [{ record }] = parseArxivFeed(xml);
  assert.equal(record.arxivSubmittedAt, '2025-07-29T00:00:00.000Z');
  assert.equal(record.year, 2026);
  assert.equal(record.venue, 'ICML 2026');
  assert.equal(record.status, 'published');
  assert.equal(record.abstract, 'We study $x_{t+1}$ & compare two methods.');
  for (const comment of ['Submitted to ICML 2026', 'Under review at ICML 2026', 'Not accepted at ICML 2026', 'Not yet accepted at ICML 2026']) {
    assert.equal(parseArxivFeed(atom('2507.21638', comment))[0].record.venue, null);
  }
  assert.equal(parseArxivFeed(atom('2507.21638', 'Published in TMLR'))[0].record.venue, 'Transactions on Machine Learning Research');
  assert.equal(parseArxivFeed(atom('2507.21638', 'Published as a conference paper at ICLR 2026'))[0].record.venue, 'ICLR 2026');
});

test('arXiv journal references provide venue metadata independently of a publisher DOI', () => {
  const xml = atom().replace('</entry>', '<arxiv:journal_ref>Reinforcement Learning Journal, 2026</arxiv:journal_ref></entry>');
  const [{ record, publishedDoi }] = parseArxivFeed(xml);
  assert.equal(record.venue, 'Reinforcement Learning Journal, 2026');
  assert.equal(record.year, 2026);
  assert.equal(publishedDoi, null);
  assert.equal(record.paperUrl, 'https://arxiv.org/abs/2507.21638');
});

test('Crossref skips empty dates and retains abstract text without JATS markup', () => {
  const record = crossrefRecord({ DOI: '10.1234/example', type: 'journal-article', title: [newTitle],
    author: [{ given: 'Leonard', family: 'Hinckeldey' }], 'container-title': ['Reinforcement Learning Journal'],
    'published-print': { 'date-parts': [[]] }, 'published-online': { 'date-parts': [[2026, 5, 24]] },
    abstract: '<jats:p>We compare $x_{t}$ and $y_{t}$.</jats:p>' });
  assert.equal(record.publicationDate, '2026-05-24');
  assert.equal(record.year, 2026);
  assert.equal(record.abstract, 'We compare $x_{t}$ and $y_{t}$.');
});

test('arXiv requests batch IDs and reuse cached metadata', async () => {
  const requests = [];
  const client = createSecondaryClient({ wait: async () => {}, fetchImpl: async value => {
    const url = new URL(value);
    requests.push(url);
    return new Response(atom());
  } });
  const result = await client.arxiv(['arxiv:2507.21638', 'https://arxiv.org/abs/2507.21638v3']);
  assert.equal(result.length, 1);
  assert.equal(requests[0].searchParams.get('id_list'), '2507.21638');
  await client.arxiv(['2507.21638']);
  assert.equal(requests.length, 1);
});

test('old arXiv cache records refresh to obtain newly retained fields', async () => {
  const cache = { arxiv: { '2507.21638': { checkedAt: new Date().toISOString(), value: { record: preprint(), projectUrls: [] } } } };
  let requests = 0;
  const client = createSecondaryClient({ cache, wait: async () => {}, fetchImpl: async () => {
    requests++;
    return new Response(atom().replace('</entry>', '<summary>The original abstract.</summary></entry>'));
  } });
  const [result] = await client.arxiv(['2507.21638']);
  assert.equal(result.record.abstract, 'The original abstract.');
  assert.equal(result.record.arxivSubmittedAt, '2025-07-29T00:00:00.000Z');
  await client.arxiv(['2507.21638']);
  assert.equal(requests, 1);
});

test('arXiv batch failures return saved records instead of discarding cached metadata', async () => {
  const saved = { record: { ...preprint(), arxivSubmittedAt: '2025-07-29T00:00:00.000Z', abstract: 'The original abstract.' }, projectUrls: [] };
  const cache = { arxiv: { '2507.21638': { checkedAt: '2000-01-01T00:00:00Z', value: saved } } };
  const client = createSecondaryClient({ cache, wait: async () => {}, warn() {}, fetchImpl: async () => { throw new Error('Timeout'); } });
  const results = await client.arxiv(['2507.21638']);
  assert.deepEqual(results, [saved]);
});

test('Crossref rejects title-only matches belonging to another author', async () => {
  const client = createSecondaryClient({ wait: async () => {}, fetchImpl: async value => {
    assert.ok(new URL(value).searchParams.has('query.bibliographic'));
    return Response.json({ message: { items: [{ DOI: '10.1234/wrong', type: 'journal-article', title: [oldTitle],
      author: [{ given: 'Someone', family: 'Else' }], 'container-title': ['Unrelated Journal'], issued: { 'date-parts': [[2026]] } }] } });
  } });
  assert.deepEqual(await client.crossref(base()), []);
});

test('publisher evidence corrects ASSISTAX venue, year, title and paper link while keeping arXiv', async () => {
  const snapshot = { version: 1, researchers: { leo: { openalexId: 'A1', updatedAt: '2026-11-15T00:00:00Z', publications: [base()] } } };
  const client = { arxiv: async ids => { assert.ok(ids.includes('arxiv:2507.21638')); return [{ record: preprint(), projectUrls: [] }]; }, crossref: async () => [], searchArxiv: async () => [] };
  const crawler = { page: async url => url === publisherUrl ? parsePage(`<h1>${newTitle}</h1><pre>${bibtex()}</pre>`, publisherUrl) : null };
  await enrichBibliography(snapshot, [base()], [personalPage()], client, crawler);
  const result = buildCatalog(snapshot, [{ id: 'leo', openalex: 'A1' }], overrides)[0];
  assert.equal(result.venue, 'Reinforcement Learning Journal');
  assert.equal(result.year, 2026);
  assert.equal(result.status, 'published');
  assert.equal(result.title, newTitle);
  assert.equal(result.paperUrl, publisherUrl);
  assert.equal(result.arxivUrl, 'https://arxiv.org/abs/2507.21638');
  assert.equal(result.authors[0].memberId, 'leo');
  assert.ok(result.sources.includes(publisherUrl));
});

test('an author-reported venue is kept when its publisher URL is missing', async () => {
  const snapshot = {};
  const reported = recordFromFields({ title: newTitle, authors, journal: 'ICML', year: 2026 }, 'https://author.example/');
  assert.equal(reported.paperUrl, null);
  const client = { arxiv: async () => [{ record: preprint(), projectUrls: [] }], crossref: async () => [], searchArxiv: async () => [] };
  await enrichBibliography(snapshot, [base()], [{ records: [reported], links: [] }], client, { page: async () => null });
  const result = snapshot.bibliography[base().id];
  assert.equal(result.venue, 'ICML');
  assert.equal(result.year, 2026);
  assert.equal(result.status, 'published');
  assert.equal(result.paperUrl, 'https://arxiv.org/abs/2507.21638');
  assert.equal(result.authors[0].openalexId, 'A1');
});

test('HTML bibliography venues require both the paper title and a matching arXiv identifier', async () => {
  const paper = { ...base(), ids: [...base().ids, 'arxiv:2507.21638'] };
  const html = id => `<ul><li><div class="title">${paper.title}</div><div class="author">Leonard Hinckeldey and colleagues</div>
    <div class="periodical"><em>Explainable AI Workshop @ AAAI</em>, Feb 2026</div><a href="https://arxiv.org/abs/${id}">arXiv</a></li>
    <li><div class="title">An unrelated paper</div><div class="periodical"><em>A Different Journal</em>, 2025</div><a href="https://arxiv.org/abs/2507.21638">arXiv</a></li></ul>`;
  const client = { arxiv: async () => [{ record: preprint(), projectUrls: [] }], crossref: async () => [], searchArxiv: async () => [] };
  for (const [id, expected] of [['2507.21638', 'Explainable AI Workshop @ AAAI'], ['2507.99999', null]]) {
    const page = parsePage(html(id), 'https://author.example/publications/');
    assert.equal(page.venueHints.length, 2);
    const snapshot = {};
    await enrichBibliography(snapshot, [paper], [page], client, { page: async () => null });
    assert.equal(snapshot.bibliography[paper.id].venue, expected);
    if (expected) assert.equal(snapshot.bibliography[paper.id].year, 2026);
  }
  const submitted = parsePage(`<li><div class="title">${paper.title}</div><div class="periodical"><em>Under review at ICML</em>, 2026</div></li>`, 'https://author.example/');
  assert.deepEqual(submitted.venueHints, []);
});

test('HTML bibliography metadata can refine a cached author-reported venue', async () => {
  const paper = { ...base(), ids: [...base().ids, 'arxiv:2507.21638'] };
  const snapshot = { bibliography: { [paper.id]: { ...paper, venue: 'A Workshop', status: 'published', year: 2025,
    sources: ['https://author.example/'], paperUrl: 'https://arxiv.org/abs/2507.21638' } } };
  const page = parsePage(`<li><div class="title">${paper.title}</div><div class="periodical"><em>ICML</em>, 2026</div>
    <a href="https://arxiv.org/abs/2507.21638">arXiv</a></li>`, 'https://author.example/');
  const client = { arxiv: async () => [{ record: preprint(), projectUrls: [] }], crossref: async () => [], searchArxiv: async () => [] };
  await enrichBibliography(snapshot, [paper], [page], client, { page: async () => null });
  assert.equal(snapshot.bibliography[paper.id].venue, 'ICML');
  assert.equal(snapshot.bibliography[paper.id].year, 2026);
});

test('a renamed workshop paper can supply its venue through a matching arXiv link', async () => {
  const title = 'Selective Reincarnation: Offline-to-Online Multi-Agent Reinforcement Learning';
  const alternate = 'Reduce, Reuse, Recycle: Selective Reincarnation in Multi-Agent Reinforcement Learning';
  const paper = { ...base(), title, ids: [...base().ids, 'arxiv:2304.00977'], year: 2023 };
  const page = parsePage(`<li><div class="title">${alternate}</div><div class="periodical"><em>Reincarnating Reinforcement Learning Workshop at ICLR</em>, 2023</div>
    <a href="https://arxiv.org/abs/2304.00977">arXiv</a></li>`, 'https://author.example/');
  const client = { arxiv: async () => [], crossref: async () => [], searchArxiv: async () => [] };
  const snapshot = {};
  await enrichBibliography(snapshot, [paper], [page], client, { page: async () => null });
  const result = snapshot.bibliography[paper.id];
  assert.equal(result.venue, 'Reincarnating Reinforcement Learning Workshop at ICLR');
  assert.equal(result.title, title);
  assert.ok(result.titles.includes(alternate));
});

test('new venue evidence preserves saved submission dates and abstracts during an arXiv outage', async () => {
  const paper = { ...base(), ids: [...base().ids, 'arxiv:2507.21638'] };
  const previous = { ...paper, arxivSubmittedAt: '2025-07-29T00:00:00.000Z', abstract: 'The original abstract.',
    arxivUrl: 'https://arxiv.org/abs/2507.21638', venue: null, status: 'preprint' };
  const snapshot = { bibliography: { [paper.id]: previous } };
  const reported = recordFromFields({ title: paper.title, authors, journal: 'ICML', year: 2026 }, 'https://author.example/');
  const client = { arxiv: async () => { throw new Error('Timeout'); }, crossref: async () => [], searchArxiv: async () => [] };
  await enrichBibliography(snapshot, [paper], [{ records: [reported], links: [] }], client, { page: async () => null }, { warn() {} });
  const result = snapshot.bibliography[paper.id];
  assert.equal(result.year, 2026);
  assert.equal(result.venue, 'ICML');
  assert.equal(result.arxivSubmittedAt, previous.arxivSubmittedAt);
  assert.equal(result.abstract, previous.abstract);
});

test('publisher links beside an author-page title are followed and OpenReview PDFs become forum pages', async () => {
  const forum = 'https://openreview.net/forum?id=published';
  const page = parsePage(`<ul><li>${newTitle}<a href="https://openreview.net/pdf?id=published">PDF</a></li>
    <li>Different paper<a href="https://openreview.net/forum?id=wrong">Paper</a></li></ul>`, 'https://author.example/');
  const requested = [];
  const crawler = { page: async url => {
    requested.push(url);
    return url === forum ? parsePage(`<pre>${bibtex(forum)}</pre>`, forum) : null;
  } };
  const client = { arxiv: async () => [], crossref: async () => [], searchArxiv: async () => [] };
  const snapshot = {};
  await enrichBibliography(snapshot, [{ ...base(), title: newTitle }], [page], client, crawler);
  assert.deepEqual(requested, [forum]);
  assert.equal(snapshot.bibliography[base().id].paperUrl, forum);
  assert.equal(snapshot.bibliography[base().id].year, 2026);
});

test('Crossref records without dates retain the OpenAlex year and author identity when saved', async () => {
  const paper = { ...base(), title: 'Probing Dec-POMDP Reasoning in Cooperative MARL', year: 2026,
    authors: [{ name: 'Kale-ab Tessera', openalexId: 'A5048679971' }] };
  const registered = crossrefRecord({ DOI: '10.65109/eccj1033', type: 'proceedings-article', title: [paper.title],
    author: [{ given: 'Kale-ab Abebe', family: 'Tessera' }], 'container-title': ['Proceedings of AAMAS'] });
  assert.equal(registered.year, null);
  const snapshot = {};
  const client = { arxiv: async () => [], crossref: async () => [registered], searchArxiv: async () => [] };
  await enrichBibliography(snapshot, [paper], [], client, { page: async () => null });
  const result = snapshot.bibliography[paper.id];
  assert.equal(result.year, 2026);
  assert.equal(result.paperUrl, 'https://doi.org/10.65109/eccj1033');
  assert.deepEqual(result.authors, [{ name: 'Kale-ab Abebe Tessera', openalexId: 'A5048679971' }]);
});

test('a publisher URL that redirects to a university homepage falls back to arXiv', async () => {
  const snapshot = {};
  const client = { arxiv: async () => [{ record: preprint(), projectUrls: [] }], crossref: async () => [], searchArxiv: async () => [] };
  const crawler = { page: async () => parsePage('<h1>The University of Edinburgh</h1>', 'https://www.ed.ac.uk/') };
  await enrichBibliography(snapshot, [base()], [personalPage()], client, crawler);
  assert.equal(snapshot.bibliography[base().id].paperUrl, 'https://arxiv.org/abs/2507.21638');
});

test('secondary outages preserve a known venue and year while using a verified arXiv copy', async () => {
  const snapshot = {};
  const paper = { ...base(), status: 'published', venue: 'A Known Conference', year: 2026 };
  const client = { arxiv: async () => [{ record: preprint(), projectUrls: [] }], crossref: async () => { throw new Error('HTTP 429'); }, searchArxiv: async () => [] };
  await enrichBibliography(snapshot, [paper], [], client, { page: async () => null }, { warn() {} });
  assert.equal(snapshot.bibliography[paper.id].venue, 'A Known Conference');
  assert.equal(snapshot.bibliography[paper.id].year, 2026);
  assert.equal(snapshot.bibliography[paper.id].paperUrl, 'https://arxiv.org/abs/2507.21638');
});

test('saved published metadata and abstracts survive a blocked publisher and an older arXiv record', async () => {
  const published = { ...base(), status: 'published', venue: 'TMLR', year: 2026, publicationDate: '2026-05',
    abstract: 'The original published abstract.', paperUrl: 'https://openreview.net/forum?id=published' };
  const snapshot = { bibliography: { [base().id]: published } };
  const client = { arxiv: async () => [{ record: preprint(), projectUrls: [] }], crossref: async () => [], searchArxiv: async () => [] };
  await enrichBibliography(snapshot, [base()], [], client, { page: async () => null, failure: () => 'HTTP 403' });
  const result = snapshot.bibliography[base().id];
  assert.equal(result.year, 2026);
  assert.equal(result.publicationDate, '2026-05');
  assert.equal(result.venue, 'TMLR');
  assert.equal(result.abstract, published.abstract);
  assert.equal(result.paperUrl, published.paperUrl);
});

test('literal data discovery still rejects a project returning 404', async () => {
  const source = 'https://ben-sanati.github.io/';
  const url = `${source}forgetting-is-everywhere-project/`;
  const record = recordFromFields({ title: 'Forgetting is Everywhere', authors: 'Ben Sanati', arxiv: 'https://arxiv.org/abs/2511.04666', project: url, year: 2025 }, source);
  const page = parsePage('<div id="pub-list"></div><script src="script.js"></script>', source);
  const crawler = { page: async value => value === source ? page : null, data: async () => [record], failure: () => 'HTTP 404' };
  const pages = await collectMemberPages([{ website: source }], crawler);
  assert.equal(pages[1].records[0].projectUrl, url);
  const snapshot = { projects: { [record.id]: { url } } };
  await enrichProjects(snapshot, [], [record], crawler, pages);
  assert.deepEqual(snapshot.projects, {});
});

test('crawler caches structured script data and never requests third-party scripts', async () => {
  const requests = [];
  const crawler = createCrawler({ resolve: async () => [{ address: '93.184.216.34' }], wait: async () => {}, warn() {}, fetchImpl: async url => {
    requests.push(url.href);
    if (url.pathname === '/robots.txt') return new Response('', { status: 404 });
    if (url.pathname === '/script.js') return new Response(`const publications=[{title:'Forgetting is Everywhere',authors:'Ben Sanati',arxiv:'https://arxiv.org/abs/2511.04666'}];`, { headers: { 'content-type': 'text/javascript' } });
    return new Response('<script src="script.js"></script><script src="https://third-party.example/track.js"></script>', { headers: { 'content-type': 'text/html' } });
  } });
  await collectMemberPages([{ website: 'https://author.example/' }], crawler);
  await collectMemberPages([{ website: 'https://author.example/' }], crawler);
  assert.equal(requests.filter(url => url.endsWith('/script.js')).length, 1);
  assert.ok(requests.every(url => !url.includes('third-party')));
});
