/** Login skeleton: the same dark splash as the page, with the sign-in card's outline. */
export default function Loading() {
    const bone = 'bg-white/10 motion-safe:animate-pulse';
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0710] p-4" aria-busy="true">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2b1650_0%,_#0a0710_70%)]" />
            <span className="sr-only">Loading sign in</span>
            <div className="relative z-10 w-full max-w-md space-y-8">
                <div className="flex flex-col items-center gap-3">
                    <div className={`${bone} h-9 w-64 rounded-xl`} />
                    <div className={`${bone} h-4 w-72 rounded-lg`} />
                </div>
                <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                    <div className={`${bone} mx-auto h-6 w-36 rounded-lg`} />
                    {[1, 2].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className={`${bone} h-4 w-24 rounded-md`} />
                            <div className={`${bone} h-12 rounded-xl`} />
                        </div>
                    ))}
                    <div className={`${bone} h-12 rounded-full`} />
                </div>
            </div>
        </div>
    );
}
