import MazeGame from '../components/MazeGame';
import fs from 'fs';
import path from 'path';

export default function Home() {
  const typesContent = fs.readFileSync(path.join(process.cwd(), 'lib/types.ts'), 'utf-8');
  return <MazeGame sharedTypes={typesContent} />;
}
