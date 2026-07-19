import FeedGrid from '@/components/FeedGrid';
import { getAllExperiences } from '@/actions/experience';
import { BookOpen, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import GridBackground from '@/components/GridBackground';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';

// Dynamic page - needs DB data
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Placement Chronicles — PSG Tech Placement & Interview Experiences',
  description: 'Browse real PSG Tech placement and interview experiences shared by PSG College of Technology students. Company-wise, role-wise, and batch-wise placement insights — all in one place.',
  openGraph: {
    title: 'Placement Chronicles — PSG Tech Placement & Interview Experiences',
    description: 'Real PSG Tech placement experiences shared by students. Company-wise interview insights, CTC details, round breakdowns, and tips for juniors.',
    url: 'https://placement-chronicles.vercel.app',
    images: [{
      url: 'https://placement-chronicles.vercel.app/logo.png',
      width: 512,
      height: 512,
      alt: 'Placement Chronicles — PSG Tech',
    }],
  },
  alternates: {
    canonical: 'https://placement-chronicles.vercel.app',
  },
};

export default async function Home() {
  const result = await getAllExperiences();
  const experiences = result.success ? result.data || [] : [];
  const companyLinks = result.companyLinks || {};

  // Calculate Average CTC
  // We need to convert stipends (per month) into LPA equivalents to get a meaningful average
  let totalLPA = 0;
  let validExperiencesCount = 0;

  experiences.forEach(exp => {
    if (exp.ctc > 0) {
      if (exp.roleType === 'INTERNSHIP' || exp.roleType === 'SUMMER_INTERNSHIP') {
        // Assuming CTC for internships is given as per month stipend
        // Convert monthly stipend to LPA (e.g., 10000 * 12 / 100000 = 1.2 LPA)
        totalLPA += (exp.ctc * 12) / 100000;
      } else {
        // Full time role CTC is already in LPA
        totalLPA += exp.ctc;
      }
      validExperiencesCount++;
    }
  });

  const averageCTC = validExperiencesCount > 0
    ? (totalLPA / validExperiencesCount).toFixed(2)
    : '0';

  // Extract unique companies and batches for filters
  const companies = Array.from(new Set(experiences.map(e => e.company))).sort();
  const batches = Array.from(new Set(experiences.map(e => e.batch).filter((b): b is string => !!b))).sort().reverse();

  return (
    <GridBackground>
      <div className="min-h-screen">
        {/* Navigation Header */}
        <Navbar />

        {/* Hero Section — minimal, centered */}
        <section className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
            Real Interview Experiences
          </h2>
          <p className="text-lg font-medium text-muted-foreground mb-6">
            Learn from students who've been there, done that
          </p>
          <Link href="/share-experience">
            <button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 font-semibold shadow-m3 transition-all">
              Share Your Experience
            </button>
          </Link>

          {/* Stat chips */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-1.5 text-sm font-semibold text-muted-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              {experiences.length} experiences
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-1.5 text-sm font-semibold text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              {new Set(experiences.map(e => e.company)).size} companies
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-1.5 text-sm font-semibold text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              {averageCTC} LPA avg
            </span>
          </div>
        </section>

        {/* Experience Feed */}
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {experiences.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-card border border-outline-variant shadow-m3 rounded-3xl p-8 sm:p-12 max-w-md mx-auto">
                <BookOpen className="h-12 w-12 text-outline mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Experiences Yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to share your interview experience!
                </p>
                <Link href="/share-experience">
                  <button className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full shadow-m3 transition-all">
                    Share Your Experience
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <FeedGrid experiences={experiences} companies={companies} batches={batches} companyLinks={companyLinks} />
          )}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </GridBackground>
  );
}

