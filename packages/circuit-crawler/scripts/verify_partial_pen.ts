
import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    const dir = path.join(__dirname, '../tests/pen_partial_test');
    const mazePath = path.join(dir, 'maze.json');
    // Minimal maze config mock if file read fails or simple logic
    const mazeConfig = fs.existsSync(mazePath)
        ? JSON.parse(fs.readFileSync(mazePath, 'utf-8'))
        : { width: 5, height: 5, walls: Array(5).fill(Array(5).fill(false)), initialRobots: [{ name: 'Painter', position: { x: 0, y: 0 }, direction: 'East' }] };

    const code = fs.readFileSync(path.join(dir, 'main.ts'), 'utf-8');

    console.log("Starting verification...");

    const engine = new CircuitCrawlerEngine({
        maze: mazeConfig,
        onLog: (msg, type) => console.log(`[${type}] ${msg}`),
        onCompletion: (success, msg) => {
            console.log(`Completion: ${success} - ${msg}`);
            process.exit(success ? 0 : 1);
        }
    });

    try {
        await engine.run({ 'main.ts': code });
    } catch (e: any) {
        console.error("Runtime Error", e);
        process.exit(1);
    }
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
