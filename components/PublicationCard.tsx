"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines } from '@fortawesome/free-regular-svg-icons';
import { faHouseChimney } from '@fortawesome/free-solid-svg-icons';
import type { Publication } from '@/lib/publications-utils';
import styles from './publications.module.scss';

export default function PublicationCard({ publication: paper }: { publication: Publication }) {
    const paperUrl = paper.paperUrl ?? paper.arxivUrl ?? null;
    const titleUrl = paperUrl ?? paper.projectUrl;
    return (
        <article className={`card ${styles.card}`}>
            <div className={`card-content ${styles.cardContent}`}>
                <div className={styles.details}>
                    <span>{paper.year ?? 'Year unavailable'}</span>
                    {paper.status === 'preprint' && <span className="tag is-light">Preprint</span>}
                </div>
                <h3 className={`title is-5 ${styles.paperTitle}`}>
                    {titleUrl ? <a href={titleUrl}>{paper.title}</a> : paper.title}
                </h3>
                <p className={styles.authors}>
                    {paper.authors.map((author, index) => (
                        <span key={`${author.name}-${index}`}>
                            {index > 0 && ', '}
                            {author.memberId ? <strong>{author.name}</strong> : author.name}
                        </span>
                    ))}
                </p>
                <p className={styles.venue}>{paper.venue ?? (paper.status === 'preprint' ? 'Preprint' : 'Venue unavailable')}</p>
            </div>
            {(paperUrl || paper.projectUrl) && (
                <footer className="card-footer is-size-4">
                    {paperUrl && (
                        <a href={paperUrl} title="Paper" className="card-footer-item social-media-link" aria-label={`Read ${paper.title}`}>
                            <FontAwesomeIcon icon={faFileLines} />
                        </a>
                    )}
                    {paper.projectUrl && (
                        <a href={paper.projectUrl} title="Project website" className="card-footer-item social-media-link" aria-label={`Project website for ${paper.title}`}>
                            <FontAwesomeIcon icon={faHouseChimney} />
                        </a>
                    )}
                </footer>
            )}
        </article>
    );
}
