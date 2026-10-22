import Navbar from '@/components/Navbar';

const bone = 'bg-surface-container-high motion-safe:animate-pulse';

/** Analytics skeleton (visitors and experiences tabs): header, range pills, stat cards, chart, panels. */
export default function Loading() {
    return (
        <div className="min-h-screen bg-background" aria-busy="true">
            <Navbar />
            <span className="sr-only">Loading analytics</span>
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-2">
                        <div className={`${bone} h-8 w-40 rounded-xl`} />
                        <div className={`${bone} h-4 w-96 max-w-full rounded-lg`} />
                    </div>
                    <div className={`${bone} h-11 w-56 rounded-full`} />
                </div>
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`${bone} h-8 w-20 rounded-full`} />
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`${bone} h-28 rounded-3xl`} />
                    ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className={`${bone} h-80 rounded-3xl lg:col-span-2`} />
                    <div className={`${bone} h-80 rounded-3xl`} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className={`${bone} h-64 rounded-3xl`} />
                    <div className={`${bone} h-64 rounded-3xl`} />
                </div>
            </div>
        </div>
    );
}
