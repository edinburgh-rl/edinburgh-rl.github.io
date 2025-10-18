import { FrontMatterData } from "./parse-front-matter";

interface Link {
    name: string,
    href: string
}

export interface ReadingGroupSessionRaw extends FrontMatterData {
    datetime: string,
    speakers: string,
    title: string,
    abstract: string,
    bio: string,
    links: Link[]
}

interface ReadingGroupSession extends FrontMatterData {
    datetime: string,
    speakers: string,
    title: string,
    abstract: string,
    bio: string,
    links: Link[]
}

export function getReadingGroupNextSession(data: ReadingGroupSessionRaw[]): ReadingGroupSession | undefined {
    return data.filter((x) => {
        return Date.parse(x.datetime) > Date.now();
    }).sort((x, y) => Date.parse(y.datetime) - Date.parse(x.datetime)).map((x) => ({
        ...x,
        datetime: new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/London',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
        }).format(Date.parse(x.datetime))
    })).pop();
}