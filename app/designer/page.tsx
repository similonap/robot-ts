import MazeDesigner from '../../components/MazeDesigner';
import fs from 'fs';
import path from 'path';

export default function DesignerPage() {
    const typesContent = fs.readFileSync(path.join(process.cwd(), 'lib/types.ts'), 'utf-8');
    return <MazeDesigner sharedTypes={typesContent} />;
}
