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

            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-widest mb-12">
                Challenges
            </h1>

            <ChallengeGrid challenges={challenges} />
        </div>
    );
}
