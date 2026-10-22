'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CompanyLogo from '@/components/CompanyLogo';
import ExperienceReader from './ExperienceReader';
import PrepGuide from './PrepGuide';
import { buildGuide, GUIDE_MIN } from '@/lib/guide';
import { cn, replaceSearchParams } from '@/lib/utils';
import type { IExperience } from '@/models/Experience';

// The feed's experiences are lean, serialised rows: no Document methods, and
// `_id` is an ObjectId on the server but a string once it reaches the client.
export type ExperienceItem = Pick<
    IExperience,
    | 'company' | 'role' | 'ctc' | 'studentName' | 'courseBranch' | 'batch' | 'year'
    | 'roleType' | 'placementType' | 'verdict' | 'finalVerdict' | 'minCGPA'
    | 'historyOfBacklogs' | 'standingBacklogs' | 'resumeShortlisting'
    | 'rounds' | 'tags' | 'overallExperience' | 'tipsForJuniors' | 'createdAt'
> & { _id?: { toString(): string } };

export type CompanyExperience = ExperienceItem & { id: string };

const segment = (on: boolean) =>
    cn(
        'min-h-10 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        on ? 'bg-primary-fixed text-primary' : 'text-muted-foreground hover:text-foreground'
    );

/**
 * One company: the prep guide (5+ experiences) and the reader. The view and the
 * open experience live in the URL (?view=all&exp=…), so links can be shared.
 */
export default function CompanyView({
    companyName,
    experiences,
    logoUrl,
    onBack,
}: {
    companyName: string;
    experiences: ExperienceItem[];
    logoUrl?: string;
    onBack: () => void;
}) {
    const params = useSearchParams();
    const rootRef = useRef<HTMLDivElement>(null);
    const items = useMemo<CompanyExperience[]>(
        () => experiences.map((e, i) => ({ ...e, id: e._id?.toString() ?? `${companyName}-${i}` })),
        [experiences, companyName]
    );
    const hasGuide = items.length >= GUIDE_MIN;
    const [view, setView] = useState<'guide' | 'all'>(() => (hasGuide && params.get('view') !== 'all' ? 'guide' : 'all'));
    const [selectedId, setSelectedId] = useState<string | null>(() => params.get('exp'));

    const guide = useMemo(() => (hasGuide ? buildGuide(items, companyName) : null), [hasGuide, items, companyName]);

    const batches = [...new Set(items.map((e) => e.batch).filter(Boolean))].sort();
    const batchText = batches.length === 0 ? '' : batches.length === 1 ? ` · Batch ${batches[0]}` : ` · Batches ${batches[0]} to ${batches[batches.length - 1]}`;

    // Syncing to the address bar (an external system), so an effect is the right tool here.
    useEffect(() => {
        replaceSearchParams({ view: hasGuide && view === 'all' ? 'all' : null, exp: view === 'all' ? selectedId : null });
    }, [hasGuide, view, selectedId]);

    const showReader = (id: string | null) => {
        if (id) setSelectedId(id);
        setView('all');
        rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };

    return (
        <div ref={rootRef} className="scroll-mt-24 space-y-5">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                All companies
            </button>

            <header className="glass flex flex-wrap items-center gap-4 rounded-[28px] p-5 sm:p-6">
                <CompanyLogo logoUrl={logoUrl} size="lg" />
                <div className="min-w-[200px] flex-1">
                    <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{companyName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {view === 'guide' && guide ? `A prep guide built from ${items.length} students' experiences` : `${items.length} ${items.length === 1 ? 'experience' : 'experiences'}`}
                        {batchText}
                    </p>
                </div>
                {hasGuide ? (
                    <div role="group" aria-label="View" className="inline-flex rounded-full border border-hairline p-1">
                        <button type="button" aria-pressed={view === 'guide'} onClick={() => setView('guide')} className={segment(view === 'guide')}>
                            Prep guide
                        </button>
                        <button type="button" aria-pressed={view === 'all'} onClick={() => setView('all')} className={segment(view === 'all')}>
                            All {items.length} experiences
                        </button>
                    </div>
                ) : (
                    <p className="max-w-[280px] text-sm text-outline">
                        A prep guide appears once {GUIDE_MIN} students have shared. {items.length} so far.
                    </p>
                )}
            </header>

            {view === 'guide' && guide ? (
                <PrepGuide guide={guide} items={items} onOpen={showReader} onShowAll={() => showReader(null)} />
            ) : (
                <ExperienceReader items={items} selectedId={selectedId} onSelect={setSelectedId} />
            )}
        </div>
    );
}
