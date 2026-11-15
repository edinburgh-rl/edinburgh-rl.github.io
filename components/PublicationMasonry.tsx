"use client";

import { useLayoutEffect, useRef } from 'react';
import type { Publication } from '@/lib/publications-utils';
import PublicationCard from './PublicationCard';
import styles from './publications.module.scss';

export default function PublicationMasonry({ publications, selectedMemberId }: {
    publications: Publication[];
    selectedMemberId: string;
}) {
    const grid = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const container = grid.current;
        if (!container) return;
        let frame = 0, disposed = false;
        const items = Array.from(container.children) as HTMLElement[];
        const layout = () => {
            if (disposed) return;
            const computed = getComputedStyle(container);
            const row = parseFloat(computed.getPropertyValue('--masonry-row')) || 4;
            const gap = parseFloat(computed.columnGap) || 0;
            const spans = items.map(item => Math.max(1, Math.ceil(((item.firstElementChild?.getBoundingClientRect().height ?? 0) + gap) / row)));
            items.forEach((item, index) => { item.style.gridRowEnd = `span ${spans[index]}`; });
            container.classList.add(styles.masonryReady);
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(layout);
        };
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
        items.forEach(item => { if (item.firstElementChild) observer?.observe(item.firstElementChild); });
        window.addEventListener('resize', schedule);
        document.fonts?.ready.then(() => { if (!disposed) schedule(); });
        layout();
        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [publications]);

    return <div ref={grid} className={styles.grid}>
        {publications.map(paper => <div key={paper.id} className={styles.masonryItem}>
            <PublicationCard publication={paper} selectedMemberId={selectedMemberId} />
        </div>)}
    </div>;
}
