import fs from 'node:fs';
import path from 'node:path';
import { buildCatalog } from '../scripts/publications/catalog.mjs';
import { getFrontMatterData } from './parse-front-matter';
import { PeopleFrontMatter } from './people-data-utils';

export interface Publication {
    id: string;
    title: string;
    authors: { name: string; memberId?: string | null }[];
    memberIds: string[];
    venue: string | null;
    year: number | null;
    status: 'published' | 'preprint' | 'unknown';
    paperUrl: string | null;
    arxivUrl?: string | null;
    projectUrl: string | null;
}

export function getPublications() {
    const read = (name: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/publications', name), 'utf8'));
    const snapshot = read('snapshot.json');
    const overrides = read('overrides.json');
    const members = getFrontMatterData('data/people') as PeopleFrontMatter[];
    const publications = buildCatalog(snapshot, members, overrides) as Publication[];
    const dates = Object.values(snapshot.researchers as Record<string, { updatedAt: string }>).map(source => source.updatedAt).sort();
    return {
        publications,
        members: members.filter(member => publications.some(paper => paper.memberIds.includes(member.id)))
            .map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        updatedAt: dates.at(-1) ?? null,
    };
}
