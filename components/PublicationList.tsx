"use client";

import { useState } from 'react';
import type { Publication } from '@/lib/publications-utils';
import PublicationCard from './PublicationCard';
import styles from './publications.module.scss';

export default function PublicationList({ publications, members }: {
    publications: Publication[];
    members: { id: string; name: string }[];
}) {
    const [query, setQuery] = useState('');
    const [member, setMember] = useState('');
    const [year, setYear] = useState('');
    const years = [...new Set(publications.map(paper => paper.year))].sort((a, b) => (b ?? 0) - (a ?? 0));
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const filtered = publications.filter(paper => (!member || paper.memberIds.includes(member)) && (!year || String(paper.year ?? 'unknown') === year) &&
        terms.every(term => `${paper.title} ${paper.authors.map(author => author.name).join(' ')} ${paper.venue ?? ''}`.toLocaleLowerCase().includes(term)));
    const grouped = new Map<number | null, Publication[]>();
    for (const paper of filtered) {
        const group = grouped.get(paper.year) ?? [];
        group.push(paper);
        grouped.set(paper.year, group);
    }
    const groups = [...grouped].sort(([a], [b]) => (b ?? 0) - (a ?? 0));

    if (!publications.length) return <p>No publications are listed yet. Please check again later.</p>;
    return (
        <>
            <div className={styles.filters} role="search" aria-label="Filter publications">
                <div className={styles.search}>
                    <label className="label" htmlFor="publication-search">Search publications</label>
                    <input id="publication-search" type="search" className="input" placeholder="Title, author or venue" value={query} onChange={event => setQuery(event.target.value)} />
                </div>
                <div>
                    <label className="label" htmlFor="publication-member">Group member</label>
                    <div className="select is-fullwidth"><select id="publication-member" value={member} onChange={event => setMember(event.target.value)}>
                        <option value="">All members</option>
                        {members.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select></div>
                </div>
                <div>
                    <label className="label" htmlFor="publication-year">Year</label>
                    <div className="select is-fullwidth"><select id="publication-year" value={year} onChange={event => setYear(event.target.value)}>
                        <option value="">All years</option>
                        {years.map(value => <option key={value ?? 'unknown'} value={String(value ?? 'unknown')}>{value ?? 'Year unavailable'}</option>)}
                    </select></div>
                </div>
            </div>
            <div className={styles.results}>
                <p role="status">{filtered.length} {filtered.length === 1 ? 'publication' : 'publications'}{filtered.length !== publications.length ? ` of ${publications.length}` : ''}</p>
                {(query || member || year) && <button type="button" className="button is-small is-text" onClick={() => { setQuery(''); setMember(''); setYear(''); }}>Clear filters</button>}
            </div>
            {filtered.length ? (
                groups.map(([groupYear, papers]) => (
                    <section key={groupYear ?? 'unknown'} className={styles.yearGroup} aria-labelledby={`publication-year-${groupYear ?? 'unknown'}`}>
                        <h2 id={`publication-year-${groupYear ?? 'unknown'}`} className={`title is-4 ${styles.yearHeading}`}>{groupYear ?? 'Year unavailable'}</h2>
                        <div className={styles.grid}>
                            {papers.map(paper => <PublicationCard key={paper.id} publication={paper} />)}
                        </div>
                    </section>
                ))
            ) : <p>No publications match these filters.</p>}
        </>
    );
}
