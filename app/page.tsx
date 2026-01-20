import MazeGame from '../components/game/MazeGame';
import fs from 'fs';
import path from 'path';
import { generateMaze } from '../lib/maze';

export default function Home() {
  const typesContent = fs.readFileSync(path.join(process.cwd(), 'lib/types.ts'), 'utf-8');
  // Generate a random maze server-side for the home page
  // Note: Since this is a server component by default, this will run on the server.
  // Ideally this should be dynamic to give a new maze on refresh, so we might need
  // to ensure it's not statically optimized if we want true randomness on refresh.
  // Next.js 13+ server components are static by default unless they use dynamic functions.
  // We can force dynamic if needed, but let's just generate it.
  const maze = generateMaze(15, 15);

  return <MazeGame sharedTypes={typesContent} initialMaze={maze} />;
}
