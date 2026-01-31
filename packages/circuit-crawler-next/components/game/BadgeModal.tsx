'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface BadgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    badgeSlug: string;
    badgeName?: string;
}

export default function BadgeModal({ isOpen, onClose, badgeSlug, badgeName }: BadgeModalProps) {
    // Generate image path
    const imagePath = `/badges/${badgeSlug}.png`;
    const name = badgeName || badgeSlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                        }}
                        className="relative z-10 flex flex-col items-center bg-slate-900 border-2 border-yellow-500/50 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(234,179,8,0.3)] overflow-hidden"
                    >
                        {/* Confetti / Rays effect background (simplified) */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent animate-pulse pointer-events-none" />

                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="relative z-10 text-2xl font-bold text-yellow-500 mb-6 tracking-wide uppercase"
                        >
                            Challenge Complete!
                        </motion.div>

                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                delay: 0.3
                            }}
                            className="relative w-48 h-48 mb-6"
                        >
                            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
                            <img
                                src={imagePath}
                                alt={name}
                                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="relative z-10 text-center"
                        >
                            <p className="text-slate-400 text-sm mb-1 uppercase tracking-wider">You earned</p>
                            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-8">
                                {name} Badge
                            </h2>

                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-full transform transition hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/25"
                            >
                                Awesome!
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
