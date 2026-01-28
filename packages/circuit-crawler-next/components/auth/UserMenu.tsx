'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function UserMenu({ user }: { user: any }) {
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
    }

    return (
        <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url && (
                <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata.full_name || user.email}
                    className="w-8 h-8 rounded-full border border-slate-600"
                />
            )}
            <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400">Logged in as</span>
                <span className="text-sm font-mono text-cyan-400">
                    {user.user_metadata?.name || user.email}
                </span>
            </div>
            <button
                onClick={handleLogout}
                className="ml-2 rounded border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
                LOGOUT
            </button>
        </div>
    )
}
