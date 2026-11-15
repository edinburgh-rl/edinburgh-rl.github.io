import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { authorId, buildCatalog, validateOverrides, validateSnapshot } from './publications/catalog.mjs';
import { readJson, readMembers, writeJson, snapshotPath, overridesPath, root } from './publications/files.mjs';
import { createOpenAlexClient } from './publications/openalex.mjs';
import { collectMemberPages, createCrawler, enrichProjects } from './publications/web.mjs';
import { createSecondaryClient, enrichBibliography } from './publications/secondary.mjs';

export async function refreshResearchers(previous, members, client, { offline = false, warn = console.warn } = {}) {
  const researchers = {};
  const fetched = new Map();
  let failures = 0;
  for (const member of members.filter(member => member.publications !== false && member.openalex)) {
    const id = authorId(member.openalex);
    const cached = previous.researchers[member.id];
    if (offline) {
      if (cached?.openalexId === id) researchers[member.id] = cached;
      else { failures++; warn(`[publications] No matching snapshot for ${member.name} (${id}).`); }
      continue;
    }
    try {
      if (!fetched.has(id)) fetched.set(id, await client.publications(id));
      researchers[member.id] = { openalexId: id, updatedAt: new Date().toISOString(), publications: fetched.get(id) };
      console.log(`[publications] ${member.name}: ${researchers[member.id].publications.length} publications`);
    } catch (error) {
      failures++;
      if (cached?.openalexId === id) researchers[member.id] = cached;
      warn(`[publications] ${member.name}: ${error.message}. ${researchers[member.id] ? 'Using the saved snapshot.' : 'No matching saved data.'}`);
    }
  }
  return { researchers, failures };
}

async function main() {
  const offline = process.env.PUBLICATIONS_OFFLINE === '1' || process.argv.includes('--offline');
  const previous = validateSnapshot(await readJson(snapshotPath));
  const overrides = validateOverrides(await readJson(overridesPath));
  const members = await readMembers();
  const { researchers, failures } = await refreshResearchers(previous, members, createOpenAlexClient(), { offline });
  if (failures && !Object.keys(researchers).length && !overrides.additions.length) throw new Error('Publication refresh failed and no matching snapshot is available. Keeping the existing file.');
  const snapshot = { ...previous, researchers, generatedAt: offline ? previous.generatedAt : new Date().toISOString() };
  delete snapshot.previews;
  for (const record of [...Object.values(researchers).flatMap(source => source.publications), ...Object.values(snapshot.bibliography ?? {})]) {
    delete record.imageUrl;
    delete record.imageAlt;
  }
  if (!offline) {
    const cachePath = path.join(root, '.cache/publications/web.json');
    const cache = await readJson(cachePath, {});
    const crawler = createCrawler({ cache });
    const pages = process.env.PUBLICATIONS_ENRICH !== '0' ? await collectMemberPages(members, crawler) : [];
    if (process.env.PUBLICATIONS_METADATA !== '0') {
      const metadataPath = path.join(root, '.cache/publications/metadata.json');
      const client = createSecondaryClient({ cache: await readJson(metadataPath, {}) });
      await enrichBibliography(snapshot, buildCatalog({ ...snapshot, bibliography: {} }, members, overrides), pages, client, crawler);
      await writeJson(metadataPath, client.cache);
    }
    if (process.env.PUBLICATIONS_ENRICH !== '0') await enrichProjects(snapshot, members, buildCatalog(snapshot, members, overrides), crawler, pages);
    await writeJson(cachePath, cache);
  }
  const catalog = buildCatalog(snapshot, members, overrides);
  await writeJson(snapshotPath, snapshot);
  const missing = members.filter(member => member.publications !== false && !member.openalex);
  if (missing.length) console.warn(`[publications] No OpenAlex ID for: ${missing.map(member => member.name).join(', ')}. Run npm run publications:discover or edit their profiles.`);
  console.log(`[publications] ${catalog.length} unique publications, ${Object.keys(researchers).length} researcher snapshots${offline ? ' (offline)' : ''}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(`[publications] ${error.message}`); process.exitCode = 1; });
}
