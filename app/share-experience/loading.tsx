import Navbar from '@/components/Navbar';

const bone = 'bg-surface-container-high motion-safe:animate-pulse';

/** Share-experience skeleton: title, PDF upload strip, three-step progress, form card. */
export default function Loading() {
    return (
        <div className="min-h-screen bg-background" aria-busy="true">
            <Navbar />
            <span className="sr-only">Loading the share form</span>
            <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
                <div className="flex flex-col items-center gap-3">
                    <div className={`${bone} h-9 w-80 max-w-full rounded-xl`} />
                    <div className={`${bone} h-4 w-96 max-w-full rounded-lg`} />
                </div>
                <div className={`${bone} mx-auto h-24 max-w-3xl rounded-3xl`} />
                <div className="mx-auto flex max-w-xl items-center gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-1 items-center gap-3">
                            <div className={`${bone} h-9 w-9 shrink-0 rounded-full`} />
                            <div className={`${bone} h-1.5 flex-1 rounded-full`} />
                        </div>
                    ))}
                </div>
                <div className="space-y-5 rounded-3xl border border-outline-variant bg-card p-6 sm:p-8">
                    <div className="grid gap-5 sm:grid-cols-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="space-y-2">
                                <div className={`${bone} h-4 w-28 rounded-md`} />
                                <div className={`${bone} h-12 rounded-xl`} />
                            </div>
                        ))}
                    </div>
                    <div className={`${bone} ml-auto h-12 w-36 rounded-full`} />
                </div>
            </div>
        </div>
    );
}
