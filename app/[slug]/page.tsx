import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import MazeGame from '../../components/MazeGame';
import { MazeConfig } from '../../lib/types';

interface Props {
    params: Promise<{ slug: string }>;
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

    const mdFilePath = path.join(process.cwd(), 'mazes', slug, 'README.md');
    let initialFiles: Record<string, string> | undefined;

    if (fs.existsSync(mdFilePath)) {
        const mdContent = fs.readFileSync(mdFilePath, 'utf-8');
        initialFiles = {
            ...(initialFiles || {}),
            'README': mdContent
        };
    }

    const mainTsPath = path.join(process.cwd(), 'mazes', slug, 'main.ts');
    if (fs.existsSync(mainTsPath)) {
        const mainTsContent = fs.readFileSync(mainTsPath, 'utf-8');
        initialFiles = {
            ...(initialFiles || {}),
            'main.ts': mainTsContent
        };
    }

    return (
        <MazeGame sharedTypes={typesContent} initialMaze={mazeConfig} initialFiles={initialFiles} />
    );
}
