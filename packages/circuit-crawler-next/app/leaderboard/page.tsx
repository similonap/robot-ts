'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getLeaderboard, LeaderboardEntry } from '@/app/actions/leaderboard';

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadLeaderboard() {
            setLoading(true);
            try {
                const data = await getLeaderboard();
                setEntries(data);
            } catch (error) {
                console.error("Failed to load leaderboard", error);
            } finally {
                setLoading(false);
            }
        }
        loadLeaderboard();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-8 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">

            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-widest mb-12">
                Leaderboard
            </h1>

            {loading ? (
                <div className="flex flex-col items-center justify-center mt-20">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-mono text-sm animate-pulse">CALCULATING_RANKS...</p>
                </div>
            ) : entries.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center max-w-md mt-20 p-8 border border-slate-800 bg-slate-900/50 rounded-2xl backdrop-blur-sm"
                >
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                            <path d="M4 22h16" />
                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-300 mb-2">No Data Yet</h3>
                    <p className="text-slate-500 mb-6">Be the first to earn a badge!</p>
                </motion.div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="w-full max-w-4xl space-y-4"
                >
                    <div className="grid grid-cols-12 gap-4 text-xs font-mono text-slate-500 px-6 uppercase tracking-wider mb-2">
                        <div className="col-span-2 text-center">Rank</div>
                        <div className="col-span-8">Player</div>
                        <div className="col-span-2 text-center">Badges</div>
                    </div>

                    {entries.map((entry, index) => {
                        const isTop3 = index < 3;
                        let rankColor = "text-slate-400";
                        let rowBg = "bg-slate-900/40";
                        let borderColor = "border-slate-800";

                        if (index === 0) {
                            rankColor = "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]";
                            rowBg = "bg-yellow-900/10";
                            borderColor = "border-yellow-500/30";
                        } else if (index === 1) {
                            rankColor = "text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]";
                            rowBg = "bg-slate-800/30";
                            borderColor = "border-slate-400/30";
                        } else if (index === 2) {
                            rankColor = "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]";
                            rowBg = "bg-amber-900/10";
                            borderColor = "border-amber-600/30";
                        }

                        return (
                            <motion.div
                                key={entry.user_id}
                                variants={item}
                                className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl border ${borderColor} ${rowBg} hover:bg-slate-800/60 transition-colors group`}
                            >
                                <div className={`col-span-2 text-2xl font-black text-center ${rankColor}`}>
                                    #{index + 1}
                                </div>
                                <div className="col-span-8 flex items-center gap-4">
                                    <div className={`relative w-12 h-12 rounded-full overflow-hidden border-2 ${isTop3 ? borderColor.replace('/30', '') : 'border-slate-700'}`}>
                                        {entry.profile?.avatar_url ? (
                                            <img
                                                src={entry.profile.avatar_url}
                                                alt={entry.profile.username || "User"}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    const parent = (e.target as HTMLElement).parentElement;
                                                    if (parent) {
                                                        parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 font-mono text-lg">${(entry.profile?.username || "?").charAt(0).toUpperCase()}</div>`;
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 font-mono text-lg">
                                                {(entry.profile?.username || "?").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-lg ${isTop3 ? 'text-white' : 'text-slate-300'}`}>
                                            {entry.profile?.full_name || entry.profile?.username || "Anonymous Player"}
                                        </span>
                                        {entry.profile?.username && (
                                            <span className="text-xs font-mono text-slate-500">@{entry.profile.username}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-cyan-950/50 border border-cyan-900 text-cyan-400 font-mono font-bold group-hover:border-cyan-500/50 group-hover:text-cyan-300 transition-colors">
                                        {entry.count}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
}
