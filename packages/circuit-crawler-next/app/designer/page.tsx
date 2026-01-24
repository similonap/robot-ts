import MazeDesigner from '../../components/MazeDesigner';
import fs from 'fs';
import path from 'path';

export default function DesignerPage() {
    // Determine path to types.ts in the monorepo structure
    const typesPath = path.join(process.cwd(), '../circuit-crawler/src/types.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf-8');
    return <MazeDesigner sharedTypes={typesContent} />;
}
