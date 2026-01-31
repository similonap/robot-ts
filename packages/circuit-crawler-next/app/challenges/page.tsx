import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import ChallengeGrid from './ChallengeGrid';

interface Challenge {
    slug: string;
    title: string;
}

function getChallenges(): Challenge[] {
    const mazesDir = path.join(process.cwd(), 'mazes');
    if (!fs.existsSync(mazesDir)) {
        return [];
    }

    const entries = fs.readdirSync(mazesDir, { withFileTypes: true });

    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => {
            const slug = entry.name;
            const readmePath = path.join(mazesDir, slug, 'README.md');
            let title = slug.charAt(0).toUpperCase() + slug.slice(1);

            if (fs.existsSync(readmePath)) {
                const content = fs.readFileSync(readmePath, 'utf-8');
                const titleMatch = content.match(/^#\s+(.+)$/m);
                if (titleMatch) {
                    title = titleMatch[1];
                }
            }

            return {
                slug,
                title
            };
        });
}

export default function ChallengesPage() {
    const challenges = getChallenges();

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-8 font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">

            <header className="w-full max-w-5xl flex justify-between items-center mb-12">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-slate-800 transition border border-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                            <path d="m12 19-7-7 7-7" />
                            <path d="M19 12H5" />
                        </svg>
                    </div>
                    <span className="font-mono text-slate-400 group-hover:text-cyan-400 transition">BACK_TO_GAME</span>
                </Link>

                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-widest">
                    Challenges
                </h1>

                <div className="w-24"></div> {/* Spacer for alignment */}
            </header>

            <ChallengeGrid challenges={challenges} />
        </div>
    );
}
