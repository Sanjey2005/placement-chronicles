'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, SquarePen } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useSession } from '@/components/Providers';
import { logout } from '@/actions/auth';
import { cn } from '@/lib/utils';

const LINK = 'inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground';
const ICON = 'grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground sm:size-10';
const ITEM = 'flex h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold transition-colors hover:bg-surface-container-high';

/**
 * /chat's compact header in place of the site navbar, so the conversation gets the height.
 * It keeps the navbar's links; on phones they move into a native popover menu.
 */
export default function ChatHeader({ onNewChat }: { onNewChat?: () => void }) {
    const { isAdmin } = useSession();
    const router = useRouter();

    const signOut = async () => {
        await logout(); // server action: the session cookie is httpOnly
        router.push('/login');
        router.refresh();
    };

    return (
        <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:pl-5 sm:pr-4">
            <div className="flex min-w-0 items-center gap-3.5">
                <Link href="/" className="flex shrink-0 items-center gap-3 rounded-lg">
                    <Image src="/logo.png" alt="" width={28} height={28} className="rounded-[7px]" />
                    <span className="sr-only text-[17px] font-bold sm:not-sr-only">Placement Chronicles</span>
                </Link>
                <span aria-hidden className="hidden h-6 w-px bg-outline-variant sm:block" />
                <h1 className="text-[17px] font-bold sm:text-[15px] sm:font-semibold sm:text-outline">Chat</h1>
            </div>

            <nav aria-label="Site" className="flex items-center gap-0.5">
                {onNewChat && (
                    <button type="button" onClick={onNewChat} aria-label="New chat" className={cn(LINK, 'text-foreground max-sm:size-11 max-sm:justify-center max-sm:px-0')}>
                        <SquarePen className="size-[18px] sm:size-4" aria-hidden />
                        <span className="hidden sm:inline">New chat</span>
                    </button>
                )}
                <Link href="/" className={cn(LINK, 'hidden sm:inline-flex')}>Experiences</Link>
                {isAdmin && <Link href="/admin" className={cn(LINK, 'hidden sm:inline-flex')}>Admin</Link>}
                <Link href="/share-experience" className={cn(LINK, 'hidden sm:inline-flex')}>Share</Link>
                <div className="mx-1"><ThemeToggle /></div>
                <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out" className={cn(ICON, 'hidden sm:grid')}>
                    <LogOut className="size-4" aria-hidden />
                </button>
                <button type="button" popoverTarget="chat-menu" aria-label="Open menu" className={cn(ICON, 'sm:hidden')}>
                    <Menu className="size-5" aria-hidden />
                </button>
            </nav>

            {/* Native popover: light dismiss and Esc come with it */}
            <div id="chat-menu" popover="auto" className="glass fixed inset-auto right-2 top-16 m-0 w-56 rounded-2xl bg-card/90 p-2 text-foreground">
                <Link href="/" className={ITEM}>Experiences</Link>
                {isAdmin && <Link href="/admin" className={ITEM}>Admin</Link>}
                <Link href="/share-experience" className={ITEM}>Share your experience</Link>
                <button type="button" onClick={signOut} className={ITEM}>Sign out</button>
            </div>
        </header>
    );
}
