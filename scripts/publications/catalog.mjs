// Shared by the importer and the static page. No network requests happen here.
export function normalizeText(value = '') {
  return String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function authorId(value) {
  const match = String(value ?? '').trim().match(/^(?:https?:\/\/openalex\.org\/)?(A\d+)\/?$/i);
  if (!match) throw new Error(`Invalid OpenAlex author ID: ${value}`);
  return match[1].toUpperCase();
}

export function httpUrl(value, base) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value, base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function arxivId(value = '') {
  return String(value).match(/(?:arxiv\.org\/(?:abs|pdf|html)\/|10\.48550\/arxiv\.|arxiv:|^)((?:\d{4}\.\d{4,5}|[a-z.-]+\/\d{7}))(?:v\d+)?(?:\.pdf)?(?:$|[?#\s])/i)?.[1] ?? null;
}

export function arxivUrl(value) {
  const id = arxivId(value);
  return id ? `https://arxiv.org/abs/${id}` : null;
}

export function titleSimilarity(a, b) {
  const words = value => normalizeText(value).replace(/\brl\b/g, 'reinforcement learning').split(' ').filter(Boolean);
  const aa = new Set(words(a));
  const bb = new Set(words(b));
  if (!aa.size || !bb.size) return 0;
  const shared = [...aa].filter(word => bb.has(word)).length;
  return 2 * shared / (aa.size + bb.size);
}

function sameAuthor(a, b) {
  const aa = normalizeText(a).split(' ');
  const bb = normalizeText(b).split(' ');
  return aa.length > 1 && bb.length > 1 && aa.at(-1) === bb.at(-1) &&
    (aa[0] === bb[0] || (Math.min(aa[0].length, bb[0].length) === 1 && aa[0][0] === bb[0][0]));
}

function compatibleAuthorNames(a, b) {
  if (!sameAuthor(a, b)) return false;
  const aa = normalizeText(a).split(' ').slice(1, -1);
  const bb = normalizeText(b).split(' ').slice(1, -1);
  const [shorter, longer] = aa.length <= bb.length ? [aa, bb] : [bb, aa];
  let matched = 0;
  for (const name of longer) {
    const token = shorter[matched];
    if (token && (token === name || (Math.min(token.length, name.length) === 1 && token[0] === name[0]))) matched++;
  }
  return matched === shorter.length;
}

function mergeAuthors(base, incoming) {
  const authors = incoming.map(author => ({ ...author, openalexId: author.openalexId ?? null }));
  const remaining = new Set(authors);
  const available = new Set(base);
  // Match only within this paper, reserving IDs and exact names before variants.
  // Both sides must be unambiguous; an explicit incoming ID is never replaced.
  for (const matches of [
    (a, b) => a.openalexId && a.openalexId === b.openalexId,
    (a, b) => normalizeText(a.name) === normalizeText(b.name),
    (a, b) => compatibleAuthorNames(a.name, b.name),
  ]) {
    const candidates = new Map([...remaining].map(author => [author, [...available].filter(other => matches(author, other))]));
    for (const [author, choices] of candidates) {
      if (choices.length !== 1 || [...candidates.values()].filter(other => other.includes(choices[0])).length !== 1) continue;
      author.openalexId ??= choices[0].openalexId ?? null;
      remaining.delete(author);
      available.delete(choices[0]);
    }
  }
  return authors;
}

export function matchesRecord(a, b) {
  if (!a?.title || !b?.title || !a.authors?.length || !b.authors?.length) return false;
  if (a.year && b.year && Math.abs(a.year - b.year) > 2) return false;
  const overlap = a.authors.filter(author => b.authors.some(other => sameAuthor(author.name, other.name))).length;
  const exact = normalizeText(a.title) === normalizeText(b.title);
  const titleMatch = exact || (Math.min(normalizeText(a.title).split(' ').length, normalizeText(b.title).split(' ').length) >= 5 && titleSimilarity(a.title, b.title) >= 0.88);
  return titleMatch && sameAuthor(a.authors[0].name, b.authors[0].name) && overlap >= (exact ? 1 : Math.min(2, a.authors.length, b.authors.length));
}

export function mergeRecord(base, incoming) {
  return {
    ...base, ...incoming, id: base.id,
    year: incoming.year ?? base.year ?? null,
    ids: [...new Set([...base.ids, ...incoming.ids])],
    titles: [...new Set([base.title, ...(base.titles ?? []), incoming.title, ...(incoming.titles ?? [])])],
    authors: mergeAuthors(base.authors, incoming.authors),
    memberIds: [...new Set([...base.memberIds, ...incoming.memberIds])],
    landingUrls: [...new Set([...base.landingUrls, ...incoming.landingUrls])],
    sources: [...new Set([...base.sources, ...incoming.sources])],
    arxivUrl: incoming.arxivUrl ?? base.arxivUrl ?? null,
  };
}

export function normalizeWork(work) {
  if (!['article', 'conference-paper', 'proceedings-article', 'preprint', 'review', 'data-paper', 'software-paper'].includes(work.type)) return null;
  const title = work.title?.trim();
  const id = work.id?.match(/W\d+$/)?.[0];
  const authors = (work.authorships ?? []).map(({ author }) => ({
    name: author?.display_name?.trim(),
    openalexId: author?.id?.match(/A\d+$/)?.[0] ?? null,
  })).filter(author => author.name);
  if (!title || !id || !authors.length) return null;

  const locations = [work.primary_location, ...(work.locations ?? [])].filter(Boolean);
  const published = locations.find(location => location.source && location.source.type !== 'repository');
  const status = published ? 'published' : work.type === 'preprint' || locations.some(location =>
    /arxiv/i.test(location.source?.display_name ?? '') || arxivId(location.landing_page_url)) ? 'preprint' : 'unknown';
  const urls = [...new Set(locations.map(location => httpUrl(location.landing_page_url)).filter(Boolean))];
  const doi = httpUrl(work.doi);
  const arxiv = [doi, ...urls].map(url => arxivId(url)).find(Boolean);
  return {
    id: `openalex:${id}`, ids: [`openalex:${id}`, ...(doi ? [`doi:${doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').toLowerCase()}`] : []), ...(arxiv ? [`arxiv:${arxiv}`] : [])],
    title, authors, memberIds: [],
    venue: published?.source?.display_name?.trim() ?? null,
    year: Number.isInteger(work.publication_year) ? work.publication_year : null,
    status, paperUrl: status === 'published' ? doi ?? httpUrl(published?.landing_page_url) : arxiv ? arxivUrl(arxiv) : doi,
    arxivUrl: arxiv ? arxivUrl(arxiv) : null,
    landingUrls: urls, sources: [work.id],
  };
}

function sameWork(a, b) {
  if (a.ids.some(id => b.ids.includes(id))) return true;
  // Conservative fallback for separate preprint/published records without shared IDs.
  return (a.status !== 'published' || b.status !== 'published') &&
    normalizeText(a.title).length > 25 && normalizeText(a.title) === normalizeText(b.title) &&
    normalizeText(a.authors[0]?.name) === normalizeText(b.authors[0]?.name) &&
    a.year !== null && b.year !== null && Math.abs(a.year - b.year) <= 2;
}

export function deduplicate(publications) {
  const records = [];
  for (const publication of publications) {
    let merged = { ...publication };
    // Merge all matches, including records that bridge two previously separate IDs.
    for (let i = records.length - 1; i >= 0; i--) {
      if (!sameWork(merged, records[i])) continue;
      const other = records.splice(i, 1)[0];
      const rank = paper => (paper.status === 'published' ? 10 : 0) + (paper.venue ? 2 : 0);
      const preferred = rank(other) > rank(merged) ? other : merged;
      const fallback = preferred === other ? merged : other;
      merged = {
        ...preferred,
        year: preferred.year ?? fallback.year ?? null,
        authors: mergeAuthors(fallback.authors, preferred.authors),
        titles: [...new Set([merged.title, ...(merged.titles ?? []), other.title, ...(other.titles ?? [])])],
        arxivUrl: preferred.arxivUrl ?? merged.arxivUrl ?? other.arxivUrl ?? null,
        ids: [...new Set([...merged.ids, ...other.ids])].sort(),
        memberIds: [...new Set([...merged.memberIds, ...other.memberIds])].sort(),
        landingUrls: [...new Set([...merged.landingUrls, ...other.landingUrls])],
        sources: [...new Set([...merged.sources, ...other.sources])].sort(),
      };
    }
    records.push(merged);
  }
  return records.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
}

export function validateSnapshot(snapshot) {
  if (snapshot?.version !== 1 || !snapshot.researchers || typeof snapshot.researchers !== 'object' || Array.isArray(snapshot.researchers)) {
    throw new Error('Invalid publication snapshot. Expected version 1 and a researchers object.');
  }
  for (const [member, source] of Object.entries(snapshot.researchers)) {
    authorId(source.openalexId);
    if (!Array.isArray(source.publications) || typeof source.updatedAt !== 'string') throw new Error(`Invalid cached researcher: ${member}`);
    for (const paper of source.publications) validatePaper(paper);
  }
  for (const record of Object.values(snapshot.bibliography ?? {})) validatePaper(record);
  return snapshot;
}

function validatePatch(patch, label) {
  const allowed = ['title', 'authors', 'memberIds', 'venue', 'year', 'status', 'paperUrl', 'arxivUrl', 'projectUrl'];
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error(`Invalid ${label}`);
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.includes(key)) throw new Error(`Unknown field ${key} in ${label}`);
    if (['paperUrl', 'arxivUrl', 'projectUrl'].includes(key) && value !== null && !httpUrl(value)) throw new Error(`Invalid ${key} in ${label}`);
    if (key === 'title' && (typeof value !== 'string' || !value.trim())) throw new Error(`Invalid title in ${label}`);
    if (key === 'venue' && value !== null && typeof value !== 'string') throw new Error(`Invalid venue in ${label}`);
    if (key === 'year' && value !== null && (!Number.isInteger(value) || value < 1800 || value > 2200)) throw new Error(`Invalid year in ${label}`);
    if (key === 'status' && !['published', 'preprint', 'unknown'].includes(value)) throw new Error(`Invalid status in ${label}`);
    if (key === 'memberIds' && (!Array.isArray(value) || value.some(id => typeof id !== 'string'))) throw new Error(`Invalid memberIds in ${label}`);
    if (key === 'authors' && (!Array.isArray(value) || !value.length || value.some(author => typeof author?.name !== 'string' || !author.name.trim()))) throw new Error(`Invalid authors in ${label}`);
  }
}

function validatePaper(paper) {
  if (typeof paper?.id !== 'string' || !paper.id || !paper.title || !Array.isArray(paper.authors) || !paper.authors.length ||
    !Array.isArray(paper.ids) || !paper.ids.includes(paper.id) || !Array.isArray(paper.memberIds) || !Array.isArray(paper.landingUrls) || !Array.isArray(paper.sources)) {
    throw new Error(`Invalid publication: ${paper?.id ?? '(missing ID)'}`);
  }
  // Older saved snapshots may contain preview fields; ignore them during migration.
  validatePatch(Object.fromEntries(Object.entries(paper).filter(([key]) => !['id', 'ids', 'titles', 'landingUrls', 'sources', 'imageUrl', 'imageAlt'].includes(key))), paper.id);
}

export function validateOverrides(overrides) {
  if (!overrides || !Array.isArray(overrides.exclude) || !Array.isArray(overrides.additions) || !overrides.overrides || typeof overrides.overrides !== 'object' || Array.isArray(overrides.overrides)) {
    throw new Error('Publication overrides must contain exclude, overrides, and additions.');
  }
  if (overrides.exclude.some(id => typeof id !== 'string')) throw new Error('Excluded publication IDs must be strings.');
  for (const [id, patch] of Object.entries(overrides.overrides)) validatePatch(patch, `override ${id}`);
  for (const addition of overrides.additions) {
    const { id, ...patch } = addition;
    validatePatch(patch, `addition ${id}`);
    validatePaper({ venue: null, year: null, status: 'unknown', paperUrl: null, ...addition,
      ids: [id], memberIds: addition.memberIds ?? [], landingUrls: [], sources: [] });
    if (!id.startsWith('manual:')) throw new Error(`Manual publication IDs must start with manual: (${id})`);
  }
  return overrides;
}

export function buildCatalog(snapshot, members, overrides) {
  validateSnapshot(snapshot);
  validateOverrides(overrides);
  const eligible = members.filter(member => member.publications !== false);
  const byAuthor = new Map(eligible.filter(member => member.openalex).map(member => [authorId(member.openalex), member.id]));
  const publications = [];
  for (const member of eligible) {
    const cached = snapshot.researchers[member.id];
    if (!member.openalex || !cached || cached.openalexId !== authorId(member.openalex)) continue;
    for (const paper of cached.publications) {
      publications.push({ ...paper, memberIds: [...new Set([member.id, ...paper.authors.map(author => byAuthor.get(author.openalexId)).filter(Boolean)])] });
    }
  }
  publications.push(...overrides.additions.map(paper => ({ venue: null, year: null, status: 'unknown', paperUrl: null,
    ...paper, ids: [paper.id], memberIds: paper.memberIds ?? [], landingUrls: [], sources: [] })));

  const resolved = deduplicate(publications).map(paper => {
    const evidence = paper.ids.map(id => snapshot.bibliography?.[id]).filter(Boolean).find(record => matchesRecord(paper, record));
    if (evidence) return mergeRecord(paper, evidence);
    // Institutional homepages and arbitrary repository URLs are not paper links.
    const trustedUrl = /^https?:\/\/(?:dx\.)?doi\.org\//i.test(paper.paperUrl ?? '') ? paper.paperUrl : arxivUrl(paper.paperUrl);
    return { ...paper, paperUrl: trustedUrl, arxivUrl: paper.arxivUrl ?? paper.ids.map(arxivUrl).find(Boolean) ?? null };
  });
  return deduplicate(resolved).filter(paper => !paper.ids.some(id => overrides.exclude.includes(id))).map(paper => {
    const patches = paper.ids.map(id => overrides.overrides[id]).filter(Boolean);
    const patched = Object.assign({}, paper, ...patches);
    const project = paper.ids.map(id => snapshot.projects?.[id]).find(Boolean);
    const projectUrl = patches.some(patch => Object.hasOwn(patch, 'projectUrl')) || Object.hasOwn(paper, 'projectUrl') ? patched.projectUrl : project?.url;
    delete patched.imageUrl;
    delete patched.imageAlt;
    return {
      ...patched, projectUrl: httpUrl(projectUrl),
      authors: patched.authors.map(author => ({ ...author, memberId: author.memberId ?? byAuthor.get(author.openalexId) ?? null })),
      memberIds: patched.memberIds.filter(id => eligible.some(member => member.id === id)),
    };
  }).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
}
