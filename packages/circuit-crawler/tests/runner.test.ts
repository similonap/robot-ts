import fs from 'fs';
import path from 'path';
import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { MazeConfig } from '../src/types';

// Helper to run a maze test
async function runMazeTest(dir: string) {
    const mazePath = path.join(dir, 'maze.json');
    if (!fs.existsSync(mazePath)) {
        throw new Error(`No maze.json found in ${dir}`);
    }

    const mazeConfig: MazeConfig = JSON.parse(fs.readFileSync(mazePath, 'utf-8'));

    // Load files
    const files: Record<string, string> = {};
    const dirContent = fs.readdirSync(dir);
    for (const file of dirContent) {
        if (file.endsWith('.ts')) {
            files[file] = fs.readFileSync(path.join(dir, file), 'utf-8');
        }
    }

    if (!files['main.ts']) {
        throw new Error(`No main.ts found in ${dir}`);
    }

    // Capture logs
    const logs: string[] = [];

    return new Promise<void>((resolve, reject) => {
        const engine = new CircuitCrawlerEngine({
            maze: mazeConfig,
            onLog: (msg, type) => {
                logs.push(`[${type}] ${msg}`);
            },
            onCompletion: (success, msg) => {
                if (success) {
                    resolve();
                } else {
                    reject(new Error(`Game Failed: ${msg}\nLogs:\n${logs.join('\n')}`));
                }
            }
        });

        // Run
        // We set a timeout for the test
        const timeout = setTimeout(() => {
            engine.stop();
            reject(new Error(`Test Timed Out\nLogs:\n${logs.join('\n')}`));
        }, 10000);

        engine.run(files).catch(err => {
            clearTimeout(timeout);
            reject(new Error(`Runtime Error: ${err.message}\nLogs:\n${logs.join('\n')}`));
        }).finally(() => {
            clearTimeout(timeout);
        });
    });
}

describe('Circuit Crawler Maze Tests', () => {
    const testsDir = path.resolve(__dirname);
    const entries = fs.readdirSync(testsDir, { withFileTypes: true });

    // Filter directories that look like tests (contain maze.json)
    const testDirs = entries
        .filter(e => e.isDirectory())
        .map(e => path.join(testsDir, e.name))
        .filter(dir => fs.existsSync(path.join(dir, 'maze.json')));

    testDirs.forEach(dir => {
        const testName = path.basename(dir);
        test(testName, async () => {
            await runMazeTest(dir);
        }, 15000); // Jest timeout
    });
});
