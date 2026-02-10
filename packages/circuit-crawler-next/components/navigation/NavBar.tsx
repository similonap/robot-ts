import Link from 'next/link';
import UserMenu from '../auth/UserMenu';
import LoginButton from '../auth/LoginButton';

import { User } from '@supabase/supabase-js';
import { Database } from '@/utils/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row']

export default function NavBar({ user, profile }: { user: User | null, profile: Profile | null }) {
    return (
        <nav className="flex justify-between items-center bg-slate-900/80 backdrop-blur-md p-3 border-b border-cyan-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)] sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-3 group">
                    <img src="/robot-icon.svg" alt="Robot Icon" className="w-8 h-8 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all" />
                    <h1 className="text-xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase group-hover:to-cyan-300 transition-all">
                        Circuit Crawler
                    </h1>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                    <NavLink href="/challenges">Challenges</NavLink>
                    <NavLink href="/leaderboard">Leaderboard</NavLink>
                    <NavLink href="/badges">Badges</NavLink>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {user ? <UserMenu user={user} profile={profile} /> : <LoginButton />}
            </div>
        </nav>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="px-4 py-2 text-sm font-mono text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 rounded-md transition-all"
        >
            {children}
        </Link>
    );
}
