"use client";

import { useMemo } from 'react';
import { renderAbstract } from '@/lib/publication-abstract.mjs';
import styles from './publications.module.scss';

export default function PublicationAbstract({ text }: { text: string }) {
    const html = useMemo(() => renderAbstract(text), [text]);
    return <div className={styles.abstract} dangerouslySetInnerHTML={{ __html: html }} />;
}
