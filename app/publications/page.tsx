import type { Metadata } from 'next';
import PageLayout from '@/components/PageLayout';
import PublicationList from '@/components/PublicationList';
import { getPublications } from '@/lib/publications-utils';

export const metadata: Metadata = {
    title: 'Publications | MARBLE',
    description: 'Research publications by current and past members of the MARBLE group at the University of Edinburgh.',
    keywords: ['publications', 'reinforcement learning', 'multi-agent reinforcement learning', 'MARBLE'],
    alternates: { canonical: 'https://edinburgh-rl.github.io/publications' },
};

export default function Publications() {
    const { publications, members, updatedAt } = getPublications();
    return (
        <PageLayout>
            <div className="hero is-white is-small">
                <div className="hero-body">
                    <div className="container">
                        <h1 className="title is-2">&#128218; Publications</h1>
                        <p className="subtitle is-5">Research by current and past members of MARBLE</p>
                        <p className="is-size-7 has-text-grey">Group members are highlighted in bold.
                            {updatedAt && <> Updated <time dateTime={updatedAt}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(new Date(updatedAt))}</time>.</>}
                        </p>
                    </div>
                </div>
            </div>
            <section className="section p-5" aria-label="Publications">
                <PublicationList publications={publications} members={members} />
            </section>
        </PageLayout>
    );
}
