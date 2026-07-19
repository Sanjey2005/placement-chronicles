import type { Metadata } from 'next';
import Link from 'next/link';
import GridBackground from '@/components/GridBackground';
import Navbar from '@/components/Navbar';
import { Sparkles, Zap, Brain, Share2, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: 'About | Placement Chronicles - PSG Tech Placement & Interview Experiences',
    description: 'Placement Chronicles is PSG Tech\'s largest community-driven platform for sharing and discovering real PSG placement experiences, interview insights, and placement preparation tips. Built for PSG College of Technology students.',
    keywords: [
        'PSG Tech',
        'PSG Tech placement',
        'PSG placement experiences',
        'PSG College of Technology',
        'PSG Tech interview experiences',
        'placement preparation',
        'interview experiences',
        'PSG Tech students',
    ],
    openGraph: {
        title: 'About | Placement Chronicles - PSG Tech Placement Experiences',
        description: 'PSG Tech\'s platform for sharing real placement and interview experiences. Help fellow PSG Tech students succeed.',
        url: 'https://placement-chronicles.vercel.app/about',
    },
};

const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'Is Placement Chronicles only for PSG Tech students?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! Placement Chronicles is specifically designed for PSG Tech students and alumni to share placement and interview experiences within the PSG College of Technology community.',
            },
        },
        {
            '@type': 'Question',
            name: 'Can I share PSG Tech placement experiences anonymously?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Absolutely! You can share your PSG Tech interview experiences while protecting your privacy. Anonymous sharing helps fellow PSG Tech students without exposing personal details.',
            },
        },
        {
            '@type': 'Question',
            name: 'How do I access PSG Tech placement experiences?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'PSG Tech students can log in with their eCampus credentials to browse real placement experiences, interview questions, and tips from seniors across various companies and roles.',
            },
        },
        {
            '@type': 'Question',
            name: 'What kind of PSG Tech placement information can I find?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Placement Chronicles includes round-by-round interview breakdowns, company-specific questions, CTC details, preparation tips, and overall experiences shared by PSG Tech students who have gone through placements.',
            },
        },
    ],
};

export default function AboutPage() {
    return (
        <GridBackground>
            <div className="min-h-screen">
                <Navbar />

                <main className="max-w-6xl mx-auto px-6 py-16">
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                    />

                    {/* Hero — Editorial, left-aligned, bold — silver-grey gradient */}
                    <section className="mb-24">
                        <span className="inline-block text-muted-foreground text-sm font-medium tracking-widest uppercase mb-6">
                            PSG Tech · Placement Experiences
                        </span>
                        <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight max-w-3xl">
                            <span className="text-foreground">
                                Real experiences.
                            </span>
                            <br />
                            <span className="text-foreground">
                                Real outcomes.
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-xl mt-8 leading-relaxed">
                            PSG Tech students deserve better than guesswork. Placement Chronicles turns scattered interview intel into a searchable, AI-powered knowledge base—by students, for students.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 mt-10 px-6 py-3.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-muted-foreground font-medium rounded-lg transition-all group"
                        >
                            Get started
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </section>

                    {/* The gap — Editorial block */}
                    <section className="mb-24 pl-0 md:pl-12 border-l-2 border-outline-variant md:ml-8">
                        <span className="text-outline text-xs font-mono uppercase tracking-wider">Chapter 01</span>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-6">
                            The information gap at PSG Tech
                        </h2>
                        <div className="space-y-4 text-muted-foreground leading-relaxed max-w-2xl">
                            <p>
                                Placement prep at PSG College of Technology has always been a black box. Seniors move on; juniors start from zero. &quot;What does Company X ask?&quot; — nobody knows until it&apos;s too late.
                            </p>
                            <p>
                                We built Placement Chronicles so every PSG Tech student can learn from real placement experiences: round-by-round breakdowns, actual questions, CTC ranges, and honest tips—all in one place.
                            </p>
                        </div>
                    </section>

                    {/* Bento grid — Asymmetric, distinctive */}
                    <section className="mb-24">
                        <span className="text-outline text-xs font-mono uppercase tracking-wider">What we offer</span>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-10">
                            Built for PSG Tech placement prep
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Large card */}
                            <div className="md:row-span-2 p-8 rounded-2xl bg-surface-container border border-outline-variant">
                                <Sparkles className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-bold text-foreground mb-3">AI placement assistant</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Ask questions in plain English. Our AI pulls from real PSG Tech placement experiences—company-specific prep, common questions, and tips from students who cracked those rounds.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant hover:border-outline-variant transition-colors">
                                <Share2 className="h-8 w-8 text-muted-foreground mb-3" />
                                <h3 className="font-bold text-foreground mb-2">Share your journey</h3>
                                <p className="text-muted-foreground text-sm">
                                    Post your PSG Tech interview experience. Round breakdowns, questions, verdict—help the next batch.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant hover:border-outline-variant transition-colors">
                                <Zap className="h-8 w-8 text-muted-foreground mb-3" />
                                <h3 className="font-bold text-foreground mb-2">Search by company & role</h3>
                                <p className="text-muted-foreground text-sm">
                                    Filter PSG Tech placement experiences by company, role, batch. Find exactly what you need.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant">
                                <Brain className="h-8 w-8 text-muted-foreground mb-3" />
                                <h3 className="font-bold text-foreground mb-2">Community-driven</h3>
                                <p className="text-muted-foreground text-sm">
                                    PSG Tech students and alumni. Real data, real people.
                                </p>
                            </div>
                            <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant md:col-span-2">
                                <p className="text-muted-foreground text-sm italic">
                                    &quot;Placement Chronicles isn&apos;t another forum. It&apos;s structured, searchable, and powered by AI—so you spend less time digging and more time preparing.&quot;
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* How it works — Minimal steps */}
                    <section className="mb-24">
                        <span className="text-outline text-xs font-mono uppercase tracking-wider">How it works</span>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-12">
                            Three steps. That&apos;s it.
                        </h2>

                        <div className="flex flex-col md:flex-row gap-8 md:gap-4">
                            <div className="flex-1 group">
                                <div className="text-4xl font-bold text-outline group-hover:text-muted-foreground transition-colors">01</div>
                                <h3 className="text-lg font-semibold text-foreground mt-2 mb-1">Sign in</h3>
                                <p className="text-muted-foreground text-sm">eCampus credentials. PSG Tech students only.</p>
                            </div>
                            <div className="hidden md:block text-outline self-center">→</div>
                            <div className="flex-1 group">
                                <div className="text-4xl font-bold text-outline group-hover:text-muted-foreground transition-colors">02</div>
                                <h3 className="text-lg font-semibold text-foreground mt-2 mb-1">Explore</h3>
                                <p className="text-muted-foreground text-sm">Browse or ask the AI. Real PSG Tech placement experiences.</p>
                            </div>
                            <div className="hidden md:block text-outline self-center">→</div>
                            <div className="flex-1 group">
                                <div className="text-4xl font-bold text-outline group-hover:text-muted-foreground transition-colors">03</div>
                                <h3 className="text-lg font-semibold text-foreground mt-2 mb-1">Share</h3>
                                <p className="text-muted-foreground text-sm">After placements, add your experience. Pay it forward.</p>
                            </div>
                        </div>
                    </section>

                    {/* FAQ — Compact grid */}
                    <section className="mb-24">
                        <span className="text-outline text-xs font-mono uppercase tracking-wider">FAQ</span>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-10">
                            Quick answers
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-6 rounded-xl bg-surface-container border border-outline-variant">
                                <h3 className="font-semibold text-foreground mb-2">PSG Tech students only?</h3>
                                <p className="text-muted-foreground text-sm">Yes. Placement Chronicles is for PSG College of Technology students and alumni. Sign in with eCampus.</p>
                            </div>
                            <div className="p-6 rounded-xl bg-surface-container border border-outline-variant">
                                <h3 className="font-semibold text-foreground mb-2">Can I post anonymously?</h3>
                                <p className="text-muted-foreground text-sm">Absolutely. Share your PSG Tech placement experience without exposing your identity.</p>
                            </div>
                            <div className="p-6 rounded-xl bg-surface-container border border-outline-variant">
                                <h3 className="font-semibold text-foreground mb-2">What&apos;s inside?</h3>
                                <p className="text-muted-foreground text-sm">Round-by-round breakdowns, questions, CTC, tips. Real PSG Tech placement experiences from real students.</p>
                            </div>
                            <div className="p-6 rounded-xl bg-surface-container border border-outline-variant">
                                <h3 className="font-semibold text-foreground mb-2">How do I access it?</h3>
                                <p className="text-muted-foreground text-sm">Log in with eCampus. Browse experiences or chat with the AI assistant.</p>
                            </div>
                        </div>
                    </section>

                    {/* CTA — Full-width banner — silver-grey */}
                    <section className="rounded-2xl bg-surface-container border border-outline-variant p-10 md:p-14 text-center">
                        <h2 className="text-2xl font-bold text-foreground mb-3">
                            Ready to crack your next PSG Tech placement?
                        </h2>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                            Join Placement Chronicles. Explore experiences. Share yours.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-muted-foreground font-semibold rounded-lg transition-all"
                        >
                            Sign in to get started
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </section>
                </main>

                <footer className="border-t border-outline-variant py-8 mt-16">
                    <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-muted-foreground text-sm">
                        <p>© {new Date().getFullYear()} Placement Chronicles</p>
                        <div className="flex gap-6">
                            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
                            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </GridBackground>
    );
}
