'use client'

import { createClient } from '@/utils/supabase/client'

export default function LoginButton() {
    const handleLogin = async () => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
    }

    return (
        <button
            onClick={handleLogin}
            className="rounded border border-cyan-500/50 bg-cyan-950/30 px-4 py-1.5 text-sm font-mono text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all"
        >
            [ LOGIN_GITHUB ]
        </button>
    )
}
