import { FrontMatterData } from "./parse-front-matter";
import path from 'path';
import fs from 'fs';
import matter from "gray-matter";

export interface BlogFrontMatter extends FrontMatterData {
    title: string,
    author: string,
    date: string,
    picture?: string
    description?: string,
    keywords?: string[]
    hide?: boolean 
}

export interface BlogArticle {
    frontMatter: BlogFrontMatter,
    content: string
}

export function getBlogArticles(data: BlogFrontMatter[]): BlogFrontMatter[] {
    return data.filter((x) => x.hide ? false : true).sort((x, y) => Date.parse(y.date) - Date.parse(x.date)).map((x) => ({
        ...x,
        date: new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/London',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(Date.parse(x.date))
    }));
}

export function getBlogArticleData(filePath: string): BlogArticle {
    const file = path.join(process.cwd(), filePath);
    const filename = file.split(path.sep).pop()?.replace(/\.mdx$/, '');
    const content = fs.readFileSync(file, 'utf-8');
    const matterData = matter(content);
    return {frontMatter: {
        ...matterData.data,
        id: filename ?? '',
        date: new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/London',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(Date.parse(matterData.data.date))
        } as BlogFrontMatter,
        content: matterData.content
    }
}