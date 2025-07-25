import _ from 'lodash';
import { FrontMatterData } from "./parse-front-matter";

export interface PeopleFrontMatter extends FrontMatterData {
    type: string,
    name: string,
    occupation: string,
    photoUrl: string,
    website?: string,
    github?: string,
    x?: string,
    bluesky?: string,
    linkedin?: string
}

export interface PeopleData {
    type: string,
    people: PeopleFrontMatter[]
}

const membershipOrder: { [key: string]: number } = {
    "📚 Group Leads": 1,
    "🙌 Members": 2,
    "🧍 Associate Members": 3,
    "🛫 Alumni": 4
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
            people: value
        })).sort((a, b) => membershipOrder[a.type] - membershipOrder[b.type])
        .value();
}