import Navbar from '@/components/Navbar';

const bone = 'bg-surface-container-high motion-safe:animate-pulse';

/** Admin dashboard skeleton: title, four stat cards, tab row, table. */
export default function Loading() {
    return (
        <div className="min-h-screen bg-background" aria-busy="true">
            <Navbar />
            <span className="sr-only">Loading the admin dashboard</span>
            <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
                <div className="space-y-2">
                    <div className={`${bone} h-8 w-60 rounded-xl`} />
                    <div className={`${bone} h-4 w-80 max-w-full rounded-lg`} />
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`${bone} h-28 rounded-2xl`} />
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`${bone} h-10 w-28 rounded-lg`} />
                    ))}
                </div>
                <div className="space-y-2 rounded-2xl border border-outline-variant p-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className={`${bone} h-12 rounded-lg`} />
                    ))}
                </div>
            </div>
        </div>
    );
}
