import fs from 'node:fs/promises';
import { readMembers } from './publications/files.mjs';
import { authorId, normalizeText } from './publications/catalog.mjs';
import { createOpenAlexClient } from './publications/openalex.mjs';

const write = process.argv.includes('--write');
const client = createOpenAlexClient();
for (const member of await readMembers()) {
  if (member.openalex || member.publications === false) continue;
  try {
    const data = await client.searchAuthors(member.name);
    const names = [member.name, ...(member.publicationNames ?? [])].map(normalizeText);
    const matches = data.results.filter(candidate => names.includes(normalizeText(candidate.display_name)) || names.some(name => {
      const parts = name.split(' ');
      const candidateParts = normalizeText(candidate.display_name).split(' ');
      return parts.length > 1 && candidateParts[0] === parts[0] && candidateParts.at(-1) === parts.at(-1) && parts.every(part => candidateParts.includes(part));
    }));
    const edinburgh = matches.filter(candidate => candidate.last_known_institutions?.some(institution => /university of edinburgh/i.test(institution.display_name)));
    const selected = edinburgh.length === 1 ? edinburgh[0] : matches.length === 1 ? matches[0] : null;
    console.log(`${member.id}: ${selected ? `${authorId(selected.id)} — ${selected.display_name} (${selected.works_count} works)` : 'no unambiguous match; add an ID manually'}`);
    if (!selected) for (const candidate of data.results) console.log(`  ${candidate.id} — ${candidate.display_name}; ${(candidate.last_known_institutions ?? []).map(institution => institution.display_name).join(', ')}`);
    if (write) {
      const content = await fs.readFile(member.file, 'utf8');
      const field = `openalex: "${selected ? authorId(selected.id) : ''}"`;
      const updated = /^openalex:.*$/m.test(content) ? content.replace(/^openalex:.*$/m, field) : content.replace(/\r?\n---\s*$/, `\n${field}\n---\n`);
      await fs.writeFile(member.file, updated);
    }
  } catch (error) { console.warn(`${member.id}: ${error.message}`); process.exitCode = 1; }
}
console.log(write ? 'Saved suggested IDs in member profiles. Please review the matches.' : 'Preview only. Use --write to save suggestions in member profiles.');
