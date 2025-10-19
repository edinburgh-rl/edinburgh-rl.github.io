import { FrontMatterData } from "./parse-front-matter";
import { fromZonedTime, format } from 'date-fns-tz';
import { enGB } from 'date-fns/locale/en-GB';

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
    const timezone = 'Europe/London';
    const dateNow = new Date(Date.now());

    return data.filter((x) => {
        return fromZonedTime(x.datetime, timezone) > dateNow;
    }).sort((x, y) => fromZonedTime(y.datetime, timezone).getTime() - fromZonedTime(x.datetime, timezone).getTime()).map((x) => ({
        ...x,
        datetime: format(x.datetime, 'd MMMM yyyy, HH:mm zzz', {timeZone: timezone, locale: enGB})
    })).pop();
}