'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getUserBadges } from '@/app/actions/badges';
import Link from 'next/link';

interface Badge {
    badge_slug: string;
    created_at: string;
}

export default function BadgesPage() {
    const [badges, setBadges] = useState<Badge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadBadges() {
            setLoading(true);
            try {
                const userBadges = await getUserBadges();
                setBadges(userBadges || []);
            } catch (error) {
                console.error("Failed to load badges", error);
            } finally {
                setLoading(false);
            }
        }
        loadBadges();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-8 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">

            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-widest mb-12">
                My Badges
            </h1>

            {loading ? (
                <div className="flex flex-col items-center justify-center mt-20">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-mono text-sm animate-pulse">LOADING_DATA...</p>
                </div>
            ) : badges.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center max-w-md mt-20 p-8 border border-slate-800 bg-slate-900/50 rounded-2xl backdrop-blur-sm"
                >
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="m15 9-6 6" />
                            <path d="m9 9 6 6" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-300 mb-2">No Badges Yet</h3>
                    <p className="text-slate-500 mb-6">Complete challenges in the game to earn badges and show off your skills!</p>
                    <Link
                        href="/"
                        className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold rounded-full transition shadow-lg shadow-cyan-500/20"
                    >
                        Start Playing
                    </Link>
                </motion.div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-5xl w-full"
                >
                    {badges.map((badge) => {
                        const name = badge.badge_slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                        const imagePath = `/badges/${badge.badge_slug}.png`;

                        return (
                            <Link href={`/challenges/${badge.badge_slug}`} key={badge.badge_slug} className="group relative block">
                                <motion.div
                                    variants={item}
                                    className="bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col items-center transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden h-full"
                                >
                                    {/* Glow effect on hover */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative w-32 h-32 mb-4 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300 ease-spring">
                                        <img
                                            src={imagePath}
                                            alt={name}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/logo.png'; // Fallback
                                                (e.target as HTMLImageElement).style.filter = 'grayscale(100%) opacity(0.5)';
                                            }}
                                        />
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-200 group-hover:text-cyan-400 transition-colors text-center z-10">{name}</h3>
                                    <p className="text-xs text-slate-500 mt-2 font-mono z-10">
                                        {new Date(badge.created_at).toLocaleDateString()}
                                    </p>
                                </motion.div>
                            </Link>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
}
