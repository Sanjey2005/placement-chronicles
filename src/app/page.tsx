import StarField from '@/components/StarField';
import ExperienceCard from '@/components/ExperienceCard';
import { getAllExperiences } from '@/actions/experience';
import { BookOpen, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default async function Home() {
  const result = await getAllExperiences();
  const experiences = result.success ? result.data || [] : [];

  return (
    <div className="min-h-screen">
      <StarField />

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Placement Chronicles
              </h1>
              <p className="text-white/70">
                Real interview experiences from students like you
              </p>
            </div>
            <Link href="/dashboard">
              <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl">
                Go to Dashboard
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{experiences.length}</p>
                <p className="text-white/70 text-sm">Total Experiences</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {new Set(experiences.map(e => e.company)).size}
                </p>
                <p className="text-white/70 text-sm">Companies</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
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
              <Link href="/dashboard">
                <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all">
                  Upload Experience
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp) => (
              <ExperienceCard
                key={exp._id?.toString()}
                company={exp.company}
                role={exp.role}
                ctc={exp.ctc}
                rounds={exp.rounds}
                tags={exp.tags}
                year={exp.year}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 mt-12">
        <div className="text-center text-white/50 text-sm">
          <p>© 2026 Placement Chronicles. Built with Next.js and Three.js</p>
        </div>
      </footer>
    </div>
  );
}

