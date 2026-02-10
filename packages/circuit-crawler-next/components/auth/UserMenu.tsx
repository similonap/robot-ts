'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Database } from '@/utils/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function UserMenu({ user, profile }: { user: User, profile: Profile | null }) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
    }

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const displayName = profile?.full_name || profile?.username || user.email;
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;

    return (
        <div className="flex items-center gap-3 relative" ref={menuRef}>
            <div className="flex flex-col items-end hidden md:flex">
                <span className="text-xs text-slate-400">Logged in as</span>
                <span className="text-sm font-mono text-cyan-400">
                    {displayName}
                </span>
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative group focus:outline-none"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className={`w-9 h-9 rounded-full border-2 transition-all ${isOpen ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'border-slate-600 hover:border-slate-400'}`}
                    />
                ) : (
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center bg-slate-800 ${isOpen ? 'border-cyan-400' : 'border-slate-600'}`}>
                        <span className="text-xs font-mono text-slate-300">
                            {(displayName || '?').charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </button>

            {/* Dropdown Menu */}
            <div className={`absolute right-0 top-12 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden transition-all duration-200 origin-top-right z-50 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                <div className="p-3 border-b border-slate-800 md:hidden">
                    <p className="text-xs text-slate-400">Logged in as</p>
                    <p className="text-sm font-mono text-cyan-400 truncate">
                        {displayName}
                    </p>
                </div>

                <div className="py-1">
                    <Link
                        href="/badges"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="m15 9-6 6" />
                            <path d="m9 9 6 6" />
                        </svg>
                        My Badges
                    </Link>

                    <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        Profile
                    </Link>

                    <Link
                        href="/leaderboard"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                            <path d="M4 22h16" />
                        </svg>
                        Leaderboard
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors text-left"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" x2="9" y1="12" y2="12" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    )
}
