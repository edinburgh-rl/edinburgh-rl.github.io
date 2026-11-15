"use client";

import { useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines } from '@fortawesome/free-regular-svg-icons';
import { faCircleInfo, faHouseChimney } from '@fortawesome/free-solid-svg-icons';
import type { Publication } from '@/lib/publications-utils';
import PublicationAuthors from './PublicationAuthors';
import styles from './publications.module.scss';

const PublicationAbstract = dynamic(() => import('./PublicationAbstract'), { loading: () => <p>Loading abstract…</p> });

export default function PublicationCard({ publication: paper, selectedMemberId = '' }: {
    publication: Publication;
    selectedMemberId?: string;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const [showDetails, setShowDetails] = useState(false);
    const paperUrl = paper.paperUrl ?? paper.arxivUrl ?? null;
    const titleUrl = paperUrl ?? paper.projectUrl;
    const openDetail = () => {
        setShowDetails(true);
        dialog.current?.showModal();
    };
    return (
        <article className={`card ${styles.card}`}>
            <div className={`card-content ${styles.cardContent}`}>
                <div className={styles.details}>
                    <span>{paper.year ?? 'Year unavailable'}</span>
                    {paper.status === 'preprint' && <span className="tag is-light">Preprint</span>}
                </div>
                <h3 className={`title is-5 ${styles.paperTitle}`}>
                    {titleUrl ? <a href={titleUrl} title={paper.title}>{paper.title}</a> : paper.title}
                </h3>
                <PublicationAuthors authors={paper.authors} selectedMemberId={selectedMemberId} />
                <p className={styles.venue} title={paper.venue ?? undefined}>{paper.venue ?? (paper.status === 'preprint' ? 'Preprint' : 'Venue unavailable')}</p>
            </div>
            <footer className={`card-footer is-size-4 ${styles.footer}`}>
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
                <button type="button" className={`card-footer-item social-media-link ${styles.infoButton}`} title="Publication information"
                    aria-label={`Information about ${paper.title}`} aria-haspopup="dialog" aria-controls={dialogId} onClick={openDetail}>
                    <FontAwesomeIcon icon={faCircleInfo} />
                </button>
            </footer>
            <dialog ref={dialog} id={dialogId} className={styles.dialog} aria-labelledby={`${dialogId}-heading`}
                aria-describedby={`${dialogId}-paper`} onClick={event => {
                    if (event.target !== event.currentTarget) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
                }}>
                <div className={styles.dialogHeader}>
                    <h2 id={`${dialogId}-heading`} className="title is-4">Publication details</h2>
                    <button type="button" className="button is-small is-light" onClick={() => dialog.current?.close()}>Close</button>
                </div>
                <h3 id={`${dialogId}-paper`} className={`title is-5 ${styles.dialogTitle}`}>{paper.title}</h3>
                <p className={styles.allAuthors}>
                    {paper.authors.map((author, index) => <span key={index}>
                        {index > 0 && ', '}
                        {author.memberId ? <strong>{author.name}</strong> : author.name}
                    </span>)}
                </p>
                <h4 className={`title is-6 ${styles.abstractHeading}`}>Abstract</h4>
                {showDetails && (paper.abstract ? <PublicationAbstract text={paper.abstract} /> : <p>No abstract is available.</p>)}
            </dialog>
        </article>
    );
}
