import FeedGrid from '@/components/FeedGrid';
import { getAllExperiences } from '@/actions/experience';
import { BookOpen, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import GridBackground from '@/components/GridBackground';
import Navbar from '@/components/Navbar';

// Dynamic page - needs DB data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const result = await getAllExperiences();
  const experiences = result.success ? result.data || [] : [];

  // Extract unique companies and batches for filters
  const companies = Array.from(new Set(experiences.map(e => e.company))).sort();
  const batches = Array.from(new Set(experiences.map(e => e.batch).filter((b): b is string => !!b))).sort().reverse();

  return (
    <GridBackground>
      <div className="min-h-screen">
        {/* Navigation Header */}
        <Navbar />

        {/* Hero Section */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Real Interview Experiences
            </h2>
            <p className="text-white/70 text-xl">
              Learn from students who've been there, done that
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 hover:border-white/30 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all">
                  <BookOpen className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{experiences.length}</p>
                  <p className="text-white/70 text-sm">Total Experiences</p>
                </div>
              </div>
            </div>

            <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 hover:border-white/30 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-all">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {new Set(experiences.map(e => e.company)).size}
                  </p>
                  <p className="text-white/70 text-sm">Companies</p>
                </div>
              </div>
            </div>

            <div className="group bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 hover:border-white/30 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-all">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    {experiences.length > 0
                      ? `${Math.round(experiences.reduce((acc, e) => acc + e.ctc, 0) / experiences.length)} LPA`
                      : '0 LPA'}
                  </p>
                  <p className="text-white/70 text-sm">Average CTC</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Experience Feed */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {experiences.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-12 max-w-md mx-auto">
                <BookOpen className="h-12 w-12 text-white/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Experiences Yet
                </h3>
                <p className="text-white/70 mb-6">
                  Be the first to share your interview experience!
                </p>
                <Link href="/share-experience">
                  <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all">
                    Share Your Experience
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <FeedGrid experiences={experiences} companies={companies} batches={batches} />
          )}
        </main>

        {/* Footer */}
        <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 mt-12 border-t border-white/10">
          <div className="text-center text-white/50 text-sm">
            <p>© 2026 Placement Chronicles. Built with Next.js 15 + Framer Motion</p>
          </div>
        </footer>
      </div>
    </GridBackground>
  );
}

