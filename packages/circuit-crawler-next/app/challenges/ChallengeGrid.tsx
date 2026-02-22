'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface Challenge {
    slug: string;
    title: string;
}

interface ChallengeGridProps {
    challenges: Challenge[];
}

export default function ChallengeGrid({ challenges }: ChallengeGridProps) {
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

    if (challenges.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center max-w-md mt-20 p-8 border border-slate-800 bg-slate-900/50 rounded-2xl backdrop-blur-sm"
            >
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">No Challenges Found</h3>
                <p className="text-slate-500 mb-6">It looks like there are no challenges available right now.</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-5xl w-full"
        >
            {challenges.map((challenge) => (
                <Link href={`/challenges/${challenge.slug}`} key={challenge.slug} className="group relative block">
                    <motion.div
                        variants={item}
                        className="bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col items-center transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden h-full min-h-[200px] justify-between"
                    >
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <div className="relative w-24 h-24 mb-4 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300 ease-spring flex items-center justify-center bg-slate-800/30 rounded-full text-4xl overflow-hidden">
                            {/* Badge Image */}
                            <img
                                src={`/badges/${challenge.slug}.png`}
                                alt={challenge.title.charAt(0)}
                                className="w-full h-full object-cover flex items-center justify-center text-slate-500 font-sans font-bold"
                            />
                        </div>

                        <div className="w-full">
                            <h3 className="text-lg font-bold text-slate-200 group-hover:text-cyan-400 transition-colors text-center z-10 break-words">
                                {challenge.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-2 font-mono text-center z-10 block group-hover:text-cyan-500/70 transition-colors">
                                /{challenge.slug}
                            </p>
                        </div>
                    </motion.div>
                </Link>
            ))}
        </motion.div>
    );
}
