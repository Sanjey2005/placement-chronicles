import GridBackground from '@/components/GridBackground';

const bone = 'bg-surface-container-high motion-safe:animate-pulse';

/** Chat skeleton: the compact header, then the centred heading, composer card and prompt chips. */
export default function Loading() {
    return (
        <GridBackground>
            <div className="flex h-dvh flex-col" aria-busy="true">
                <span className="sr-only">Loading</span>
                <div className="flex h-16 shrink-0 items-center justify-between pl-4 pr-3 sm:pl-5 sm:pr-4">
                    <div className="flex items-center gap-3.5">
                        <div className={`${bone} size-7 rounded-[7px]`} />
                        <div className={`${bone} hidden h-4 w-44 rounded-md sm:block`} />
                        <div className={`${bone} h-4 w-10 rounded-md`} />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`${bone} hidden h-4 w-24 rounded-md sm:block`} />
                        <div className={`${bone} hidden h-4 w-12 rounded-md sm:block`} />
                        <div className={`${bone} size-9 rounded-full`} />
                    </div>
                </div>
                <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center gap-[30px] px-4 pb-16 pt-8 sm:px-6">
                    <div className="flex flex-col items-center gap-3">
                        <div className={`${bone} h-9 w-64 rounded-xl sm:h-12 sm:w-[30rem]`} />
                        <div className={`${bone} h-4 w-72 rounded-md sm:w-[28rem]`} />
                    </div>
                    <div className={`${bone} h-28 rounded-2xl`} />
                    <div className="flex flex-wrap justify-center gap-2">
                        {['w-52', 'w-48', 'w-36', 'w-44'].map((w) => (
                            <div key={w} className={`${bone} ${w} h-10 rounded-full`} />
                        ))}
                    </div>
                </div>
            </div>
        </GridBackground>
    );
}
