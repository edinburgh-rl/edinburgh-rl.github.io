import { setTimeout as delay } from 'node:timers/promises';
import { authorId, normalizeWork } from './catalog.mjs';

export function createOpenAlexClient({ apiKey = process.env.OPENALEX_API_KEY, fetchImpl = fetch, wait = delay } = {}) {
  async function get(resource, params = {}) {
    const url = new URL(resource, 'https://api.openalex.org/');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    // Keep the key out of URLs, cache files, and logs.
    const headers = { 'User-Agent': 'MARBLE-Publications/1.0 (+https://edinburgh-rl.github.io/)', Accept: 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) };
    for (let attempt = 0; attempt < 3; attempt++) {
      await wait(250);
      try {
        const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(15000) });
        if (response.ok) return await response.json();
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          const seconds = Number(response.headers.get('retry-after'));
          await wait(Math.min(10000, seconds > 0 ? seconds * 1000 : 1000 * 2 ** attempt));
          continue;
        }
        throw new Error(`OpenAlex returned HTTP ${response.status}`);
      } catch (error) {
        if (attempt === 2 || /^OpenAlex returned HTTP/.test(error.message)) throw error;
        await wait(1000 * 2 ** attempt);
      }
    }
  }

  return {
    searchAuthors(name) {
      return get('authors', { search: name, per_page: '5', select: 'id,display_name,orcid,last_known_institutions,works_count' });
    },
    async publications(id) {
      const publications = [];
      const seen = new Set();
      let cursor = '*';
      do {
        if (seen.has(cursor)) throw new Error('OpenAlex repeated a pagination cursor; keeping the previous snapshot.');
        seen.add(cursor);
        const data = await get('works', {
          filter: `authorships.author.id:${authorId(id)}`, per_page: '100', cursor,
          select: 'id,title,authorships,publication_year,type,doi,primary_location,locations',
        });
        if (!Array.isArray(data.results) || !data.meta || !Object.hasOwn(data.meta, 'next_cursor')) throw new Error('Invalid OpenAlex works response.');
        for (const work of data.results) {
          const publication = normalizeWork(work);
          if (publication) publications.push(publication);
        }
        cursor = data.meta.next_cursor;
      } while (cursor);
      return publications;
    },
  };
}
