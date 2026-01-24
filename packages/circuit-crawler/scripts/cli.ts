import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: npx tsx scripts/cli.ts <maze_dir>");
        process.exit(1);
    }

    const mazeDir = path.resolve(args[0]);
    const mazeJsonPath = path.join(mazeDir, 'maze.json');

    if (!fs.existsSync(mazeJsonPath)) {
        console.error(`Maze not found at ${mazeJsonPath}`);
        process.exit(1);
    }

    const mazeConfig = JSON.parse(fs.readFileSync(mazeJsonPath, 'utf-8'));

    // Load all .ts files in the directory as the "code"
    const files: Record<string, string> = {};
    const dirFiles = fs.readdirSync(mazeDir);
    for (const file of dirFiles) {
        if (file.endsWith('.ts')) {
            files[file] = fs.readFileSync(path.join(mazeDir, file), 'utf-8');
        }
    }

    if (!files['main.ts']) {
        console.error("No main.ts found in maze directory.");
        process.exit(1);
    }

    console.log(`Loading maze: ${mazeConfig.title || 'Untitled'}`);

    const engine = new CircuitCrawlerEngine({
        maze: mazeConfig,
        onLog: (msg, type) => {
            if (type === 'robot') {
                console.log(`🤖 ${msg}`);
            } else {
                console.log(`[SYS] ${msg}`);
            }
        },
        onCompletion: (success, msg) => {
            if (success) console.log(`\n✅ SUCCESS: ${msg}`);
            else console.log(`\n❌ FAILED: ${msg}`);
            process.exit(success ? 0 : 1);
        },
        onStateChange: () => {
            // Optional: Render grid to console?
        }
    });

    try {
        await engine.run(files);
    } catch (e) {
        console.error("Unhandle CLI Error:", e);
    }
}

main();
