import GridBackground from '@/components/GridBackground';
import Navbar from '@/components/Navbar';

export default function Loading() {
    return (
        <GridBackground>
            <div className="min-h-screen">
                <Navbar />

                {/* Hero Section Skeleton */}
                <section className="relative z-10 max-w-3xl mx-auto px-6 pt-14 pb-6 motion-safe:animate-pulse">
                    <div className="h-12 bg-surface-container-high rounded-full w-2/3 mx-auto mb-4"></div>
                    <div className="h-6 bg-surface-container rounded-full w-1/2 mx-auto mb-6"></div>
                    <div className="h-12 bg-surface-container-high rounded-full w-56 mx-auto mb-8"></div>
                    <div className="flex justify-center gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-8 w-32 bg-surface-container rounded-full"></div>
                        ))}
                    </div>
                </section>

                {/* Search bar skeleton */}
                <div className="relative z-10 max-w-7xl mx-auto px-6 py-4">
                    <div className="bg-card border border-outline-variant rounded-3xl p-4 shadow-m3 motion-safe:animate-pulse mb-6">
                        <div className="h-12 bg-surface-container rounded-full w-full max-w-2xl mx-auto"></div>
                    </div>

                    {/* Feed Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-card border border-outline-variant rounded-3xl p-6 shadow-m3 motion-safe:animate-pulse">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-surface-container-high rounded-full"></div>
                                    <div className="h-6 bg-surface-container-high rounded-full w-2/3"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="h-16 bg-surface-container rounded-2xl"></div>
                                    <div className="h-16 bg-surface-container rounded-2xl"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 mt-12 border-t border-outline-variant">
                    <div className="text-center text-muted-foreground text-sm">
                        <p>Loading...</p>
                    </div>
                </footer>
            </div>
        </GridBackground>
    );
}
