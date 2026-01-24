"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const CircuitCrawlerEngine_1 = require("../src/game/CircuitCrawlerEngine");
// Helper to run a maze test
async function runMazeTest(dir) {
    const mazePath = path_1.default.join(dir, 'maze.json');
    if (!fs_1.default.existsSync(mazePath)) {
        throw new Error(`No maze.json found in ${dir}`);
    }
    const mazeConfig = JSON.parse(fs_1.default.readFileSync(mazePath, 'utf-8'));
    // Load files
    const files = {};
    const dirContent = fs_1.default.readdirSync(dir);
    for (const file of dirContent) {
        if (file.endsWith('.ts')) {
            files[file] = fs_1.default.readFileSync(path_1.default.join(dir, file), 'utf-8');
        }
    }
    if (!files['main.ts']) {
        throw new Error(`No main.ts found in ${dir}`);
    }
    // Capture logs
    const logs = [];
    return new Promise((resolve, reject) => {
        const engine = new CircuitCrawlerEngine_1.CircuitCrawlerEngine({
            maze: mazeConfig,
            onLog: (msg, type) => {
                logs.push(`[${type}] ${msg}`);
            },
            onCompletion: (success, msg) => {
                if (success) {
                    resolve();
                }
                else {
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
    const testsDir = path_1.default.resolve(__dirname);
    const entries = fs_1.default.readdirSync(testsDir, { withFileTypes: true });
    // Filter directories that look like tests (contain maze.json)
    const testDirs = entries
        .filter(e => e.isDirectory())
        .map(e => path_1.default.join(testsDir, e.name))
        .filter(dir => fs_1.default.existsSync(path_1.default.join(dir, 'maze.json')));
    testDirs.forEach(dir => {
        const testName = path_1.default.basename(dir);
        test(testName, async () => {
            await runMazeTest(dir);
        }, 15000); // Jest timeout
    });
});
