
import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    const dir = path.join(__dirname, '../tests/create_robot_test');
    const mazePath = path.join(dir, 'maze.json');
    const mazeConfig = JSON.parse(fs.readFileSync(mazePath, 'utf-8'));

    const code = fs.readFileSync(path.join(dir, 'main.ts'), 'utf-8');

    const logs: string[] = [];

    console.log("Starting verification...");

    const engine = new CircuitCrawlerEngine({
        maze: mazeConfig,
        onLog: (msg, type) => {
            console.log(`[${type}] ${msg}`);
            logs.push(`[${type}] ${msg}`);
        },
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
