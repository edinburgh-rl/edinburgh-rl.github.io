import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface FrontMatterData {
    id: string,
    [key: string]: string | object | undefined
}

export function getFrontMatterData(folder: string): FrontMatterData[] {
    const dir = path.join(process.cwd(), folder);

    const fileNames = fs.readdirSync(dir);
    return fileNames.map((filename: string) => {
        const id = filename.replace(/\.md$/, '');
        const fullPath = path.join(dir, filename);
        const contents = fs.readFileSync(fullPath, 'utf-8');
        const matterData = matter(contents);
        return {
            id,
            ...matterData.data
        }
    })
}