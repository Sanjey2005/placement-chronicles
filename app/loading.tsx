import GridBackground from '@/components/GridBackground';
import Navbar from '@/components/Navbar';

export default function Loading() {
    return (
        <GridBackground>
            <div className="min-h-screen">
                <Navbar />

                {/* Hero Section Skeleton */}
                <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                    <div className="text-center mb-12 animate-pulse">
                        <div className="h-12 bg-white/10 rounded-lg w-2/3 mx-auto mb-4"></div>
                        <div className="h-6 bg-white/5 rounded-lg w-1/2 mx-auto"></div>
                    </div>

                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                                    <div className="flex-1">
                                        <div className="h-8 bg-white/10 rounded w-20 mb-2"></div>
                                        <div className="h-4 bg-white/5 rounded w-32"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Feed Skeleton */}
                <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 animate-pulse">
                                <div className="h-6 bg-white/10 rounded w-2/3 mb-4"></div>
                                <div className="h-4 bg-white/5 rounded w-full mb-2"></div>
                                <div className="h-4 bg-white/5 rounded w-3/4 mb-4"></div>
                                <div className="flex gap-2">
                                    <div className="h-6 bg-white/10 rounded-full w-16"></div>
                                    <div className="h-6 bg-white/10 rounded-full w-20"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 mt-12 border-t border-white/10">
                    <div className="text-center text-white/50 text-sm">
                        <p>Loading...</p>
                    </div>
                </footer>
            </div>
        </GridBackground>
    );
}
