import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import MazeGame from '../../components/MazeGame';
import { MazeConfig } from '../../lib/types';

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

    const typesContent = fs.readFileSync(path.join(process.cwd(), 'lib/types.ts'), 'utf-8');

    const mazeDir = path.join(process.cwd(), 'mazes', slug);
    let initialFiles: Record<string, string> | undefined;

    // Read all files in the directory
    if (fs.existsSync(mazeDir)) {
        const entries = fs.readdirSync(mazeDir, { withFileTypes: true });

        initialFiles = {};
        for (const entry of entries) {
            if (entry.isFile() && entry.name !== 'maze.json') {
                const content = fs.readFileSync(path.join(mazeDir, entry.name), 'utf-8');
                initialFiles[entry.name] = content;
            }
        }
    }

    return (
        <MazeGame sharedTypes={typesContent} initialMaze={mazeConfig} initialFiles={initialFiles} />
    );
}
