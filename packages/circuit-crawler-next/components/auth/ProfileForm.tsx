'use client'

import { useState } from 'react'
import { updateProfile } from '@/app/actions/profile'
import { User } from '@supabase/supabase-js'

import { Database } from '@/utils/supabase/types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function ProfileForm({ user, profile }: { user: User, profile: Profile | null }) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)

        const result = await updateProfile(formData)

        if (result.error) {
            setMessage({ type: 'error', text: result.error })
        } else {
            setMessage({ type: 'success', text: 'Profile updated successfully!' })
        }

        setLoading(false)
    }

    return (
        <form action={handleSubmit} className="space-y-6 max-w-md">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-2">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    disabled
                    value={user.email}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">
                    Display Name
                </label>
                <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    defaultValue={profile?.full_name || ''}
                    placeholder="Enter your display name"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                />
            </div>

            {message && (
                <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                    </>
                ) : (
                    'Save Changes'
                )}
            </button>
        </form>
    )
}
