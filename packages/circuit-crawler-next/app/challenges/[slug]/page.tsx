import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import MazeGame from '@/components/game/MazeGame';
import AuthButton from '@/components/auth/AuthButton';
import { MazeConfig } from 'circuit-crawler';

interface Props {
    params: Promise<{ slug: string }>;
}


export async function generateStaticParams() {
    const mazesDir = path.join(process.cwd(), 'mazes');
    const entries = fs.readdirSync(mazesDir, { withFileTypes: true });

    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
            slug: entry.name,
        }));
}

export default async function Page({ params }: Props) {
    const { slug } = await params;
    const filePath = path.join(process.cwd(), 'mazes', slug, 'maze.json');

    if (!fs.existsSync(filePath)) {
        notFound();
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    let mazeConfig: MazeConfig;

    try {
        mazeConfig = JSON.parse(fileContent);
    } catch (e) {
        console.error("Invalid maze JSON", e);
        return <div className="p-10 text-red-500">Error loading maze: {String(e)}</div>;
    }

    // Determine path to types.ts in the monorepo structure
    const typesPath = path.join(process.cwd(), '../circuit-crawler/src/types.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf-8');

    const mazeDir = path.join(process.cwd(), 'mazes', slug);
    let initialFiles: Record<string, string> | undefined;

    // Read all files in the directory
    if (fs.existsSync(mazeDir)) {
        const entries = fs.readdirSync(mazeDir, { withFileTypes: true });

        initialFiles = {};
        for (const entry of entries) {
            if (entry.isFile()) {
                if (entry.name === 'globalModule.ts') {
                    const content = fs.readFileSync(path.join(mazeDir, entry.name), 'utf-8');
                    mazeConfig.globalModule = content;
                } else if (entry.name !== 'maze.json') {
                    const content = fs.readFileSync(path.join(mazeDir, entry.name), 'utf-8');
                    initialFiles[entry.name] = content;
                }
            }
        }
    }

    // Read solution files if they exist
    const solutionDir = path.join(mazeDir, 'solution');
    let solutionFiles: Record<string, string> | undefined;

    if (fs.existsSync(solutionDir)) {
        const entries = fs.readdirSync(solutionDir, { withFileTypes: true });

        solutionFiles = {};
        for (const entry of entries) {
            if (entry.isFile()) {
                const content = fs.readFileSync(path.join(solutionDir, entry.name), 'utf-8');
                solutionFiles[entry.name] = content;
            }
        }
    }

    return (
        <MazeGame
            sharedTypes={typesContent}
            initialMaze={mazeConfig}
            initialFiles={initialFiles}
            solutionFiles={solutionFiles}
            headerAction={<AuthButton />}
            slug={slug}
        />
    );
}
