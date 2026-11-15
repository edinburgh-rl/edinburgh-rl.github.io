import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { authorId } from './catalog.mjs';

export const root = process.cwd();
export const snapshotPath = path.join(root, 'data/publications/snapshot.json');
export const overridesPath = path.join(root, 'data/publications/overrides.json');

export async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}

export async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(temporary, file);
}

export async function readMembers() {
  const directory = path.join(root, 'data/people');
  const members = [];
  for (const filename of (await fs.readdir(directory)).filter(name => name.endsWith('.md')).sort()) {
    const file = path.join(directory, filename);
    const { data } = matter(await fs.readFile(file, 'utf8'));
    if (typeof data.name !== 'string') throw new Error(`Missing member name in ${filename}`);
    if (data.openalex) authorId(data.openalex);
    members.push({ ...data, id: filename.slice(0, -3), file });
  }
  return members;
}
