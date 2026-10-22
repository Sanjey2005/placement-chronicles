import GridBackground from '@/components/GridBackground';
import Navbar from '@/components/Navbar';

const bone = 'bg-surface-container-high motion-safe:animate-pulse';

/** About page skeleton: left-aligned hero, then a two-column block of cards. */
export default function Loading() {
    return (
        <GridBackground>
            <div className="min-h-screen" aria-busy="true">
                <Navbar />
                <span className="sr-only">Loading</span>
                <div className="mx-auto max-w-6xl space-y-24 px-6 py-16">
                    <div className="space-y-6">
                        <div className={`${bone} h-4 w-64 rounded-md`} />
                        <div className={`${bone} h-16 w-full max-w-3xl rounded-2xl md:h-20`} />
                        <div className={`${bone} h-16 w-4/5 max-w-2xl rounded-2xl md:h-20`} />
                        <div className={`${bone} h-6 w-full max-w-xl rounded-lg`} />
                        <div className={`${bone} h-12 w-40 rounded-lg`} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`${bone} h-36 rounded-2xl`} />
                        ))}
                    </div>
                </div>
            </div>
        </GridBackground>
    );
}
