"use client";

import { useEffect, useRef, useState } from 'react';
import type { Publication } from '@/lib/publications-utils';
import { authorTokens, fitAuthorIndices } from '@/lib/publication-authors.mjs';
import styles from './publications.module.scss';

export default function PublicationAuthors({ authors, selectedMemberId }: {
    authors: Publication['authors'];
    selectedMemberId: string;
}) {
    const row = useRef<HTMLDivElement>(null);
    const text = useRef<HTMLParagraphElement>(null);
    const measurement = useRef<HTMLParagraphElement>(null);
    const [visible, setVisible] = useState(() => authors.map((_, index) => index));

    useEffect(() => {
        let frame = 0;
        let disposed = false;
        const measure = () => {
            const container = row.current, paragraph = text.current, probe = measurement.current;
            if (disposed || !container || !paragraph || !probe) return;
            const width = paragraph.getBoundingClientRect().width;
            if (!width) return;
            probe.style.width = `${width}px`;
            const computed = getComputedStyle(paragraph);
            const height = parseFloat(computed.lineHeight) * (Number(computed.getPropertyValue('--author-lines')) || 3);
            const indices = fitAuthorIndices(authors, candidate => {
                const nodes: Node[] = [];
                authorTokens(candidate, authors.length).forEach((index, position) => {
                    if (position) nodes.push(document.createTextNode(', '));
                    if (index === null) nodes.push(document.createTextNode('\u2026'));
                    else {
                        const author = document.createElement(authors[index].memberId ? 'strong' : 'span');
                        author.textContent = authors[index].name;
                        nodes.push(author);
                    }
                });
                probe.replaceChildren(...nodes);
                return probe.getBoundingClientRect().height <= height + 0.5;
            }, selectedMemberId);
            setVisible(previous => previous.length === indices.length && previous.every((value, index) => value === indices[index]) ? previous : indices);
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
        if (row.current) observer?.observe(row.current);
        window.addEventListener('resize', schedule);
        document.fonts?.addEventListener('loadingdone', schedule);
        document.fonts?.ready.then(() => { if (!disposed) schedule(); });
        schedule();
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener('resize', schedule);
            document.fonts?.removeEventListener('loadingdone', schedule);
        };
    }, [authors, selectedMemberId]);

    return <div ref={row} className={styles.authors} role="group" aria-label="Authors">
        <p ref={text} className={styles.authorText}>
            {authorTokens(visible, authors.length).map((index, position) => <span key={index ?? `gap-${position}`}>
                {position > 0 && ', '}
                {index === null ? '\u2026' : authors[index].memberId ? <strong>{authors[index].name}</strong> : authors[index].name}
            </span>)}
        </p>
        <p ref={measurement} className={`${styles.authorText} ${styles.authorMeasure}`} aria-hidden="true" />
    </div>;
}
