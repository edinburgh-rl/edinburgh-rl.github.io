import { FrontMatterData } from "./parse-front-matter";

export interface BlogFrontMatter extends FrontMatterData {
    title: string,
    author: string,
    date: string,
    picture?: string
}

export function getBlogArticles(data: BlogFrontMatter[]): BlogFrontMatter[] {
    return data.sort((x, y) => Date.parse(y.date) - Date.parse(x.date)).map((x) => ({
        ...x,
        date: new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/London',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(Date.parse(x.date))
    }));
}