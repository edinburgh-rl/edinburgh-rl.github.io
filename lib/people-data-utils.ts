import _ from 'lodash';
import { FrontMatterData } from "./parse-front-matter";

const membershipIcons: { [key: string]: string} = {
    "Advisors": "📚",
    "Members": "🙌",
    "Associate Members": "🧍",
    "Alumni": "🛫",
    "Alumni Associates": "✈️"
}

export interface PeopleFrontMatter extends FrontMatterData {
    type: string,
    name: string,
    occupation: string,
    photoUrl: string,
    website?: string,
    github?: string,
    x?: string,
    bluesky?: string,
    linkedin?: string,
    scholar?: string,
    openalex?: string,
    publicationNames?: string[],
    publications?: boolean
}

export interface PeopleData {
    type: string,
    icon: string,
    people: PeopleFrontMatter[]
}

const membershipOrder: { [key: string]: number } = {
    "Advisors": 2,
    "Members": 1,
    "Associate Members": 3,
    "Alumni": 4,
    "Alumni Associates": 5
};

export function sortByName(data: PeopleFrontMatter[]): PeopleFrontMatter[] {
    return data.sort((a, b) => {
        return a.name.localeCompare(b.name);
    })
}

export function groupByType(data: PeopleFrontMatter[]): PeopleData[] {
    return _.chain(data)
        .groupBy('type')
        .map((value, key) => ({
            type: key,
            icon: membershipIcons[key],
            people: value
        })).sort((a, b) => membershipOrder[a.type] - membershipOrder[b.type])
        .value();
}
