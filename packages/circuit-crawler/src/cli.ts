#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { CircuitCrawlerEngine } from './game/CircuitCrawlerEngine';
import { generateMaze } from './maze';
import { MazeConfig, RobotState } from './types';

// Default left-hand wall follower script
const DEFAULT_SCRIPT = `
async function main() {
    const robot = game.getRobot('robot');
    while(true) {
        // Left-Hand Rule Maze Solver
        // 1. Turn Left
        // 2. Loop until we can move (scanning Right)
        
        await robot.turnLeft();
        
        // Check directions until we find a path
        // We start facing Left (relative to original), then Straight, then Right, then Back
        for (let i = 0; i < 4; i++) {
            if (await robot.canMoveForward()) {
                await robot.moveForward();
                break;
            } else {
                await robot.turnRight();
            }
        }
    }
}
`

async function run() {
    const args = process.argv.slice(2);
    // TUI State
    let logs: string[] = [];
    const MAX_LOGS = 5;

    let mazeConfig: MazeConfig | undefined;
    let userCode: string | undefined;

    if (args.length === 0) {
        // Check if we are in a directory with maze.json
        if (fs.existsSync(path.join(process.cwd(), 'maze.json'))) {
            logs.push("Found maze.json in current directory. Running...");
            args.push('.');
        } else {
            logs.push("No arguments provided and no maze.json found. Using random maze and random walker.");
            mazeConfig = generateMaze(21, 21);
            userCode = DEFAULT_SCRIPT;
        }
    }

    // Check again if we added args or if user provided them
    if (args.length > 0) {
        // Handle file or directory arguments
        let mazePath: string | undefined;
        let codePath: string | undefined;
        let globalModulePath: string | undefined;

        try {
            const arg1 = path.resolve(process.cwd(), args[0]);
            const stats = fs.statSync(arg1);

            if (stats.isDirectory()) {
                // Auto-discovery mode
                logs.push(`Scanning directory: ${arg1}`);

                // 1. Maze
                if (fs.existsSync(path.join(arg1, 'maze.json'))) {
                    mazePath = path.join(arg1, 'maze.json');
                } else {
                    throw new Error("Could not find 'maze.json' in directory.");
                }

                // 2. Global Module
                if (fs.existsSync(path.join(arg1, 'globalModule.ts'))) {
                    globalModulePath = path.join(arg1, 'globalModule.ts');
                }

                // 3. User Script (main.ts or look for others)
                if (fs.existsSync(path.join(arg1, 'main.ts'))) {
                    codePath = path.join(arg1, 'main.ts');
                } else {
                    // Find first .ts file that isn't globalModule or .d.ts
                    const files = fs.readdirSync(arg1).filter(f =>
                        f.endsWith('.ts') &&
                        f !== 'globalModule.ts' &&
                        !f.endsWith('.d.ts')
                    );
                    if (files.length > 0) {
                        codePath = path.join(arg1, files[0]);
                    } else {
                        // Fallback? Or throw?
                        // Maybe checking strictly for solution/index.ts?
                        // For now, let's just error if no obvious script found.
                        throw new Error("Could not find 'main.ts' or any valid TypeScript file in directory.");
                    }
                }

            } else {
                // assume args[0] is maze and args[1] is script
                if (args.length !== 2) {
                    // If 1 arg and it's a file? Maybe checks extension?
                    // If it's maze.json? We need a script.
                    // If it's script.ts? We need a maze.
                    throw new Error("When providing files, you must provide both <maze.json> and <script.ts>.");
                }
                mazePath = arg1;
                codePath = path.resolve(process.cwd(), args[1]);
            }

            // Load Maze
            logs.push(`Loading maze from ${mazePath}...`);
            const mazeContent = fs.readFileSync(mazePath!, 'utf-8');
            mazeConfig = JSON.parse(mazeContent);

            // Load Global Module if found
            if (globalModulePath) {
                logs.push(`Loading global module from ${globalModulePath}...`);
                const globalContent = fs.readFileSync(globalModulePath, 'utf-8');
                // Use assignment or merge? Usually override whatever is in JSON.
                mazeConfig!.globalModule = globalContent;
            }

            // Load Code
            logs.push(`Loading code from ${codePath}...`);
            userCode = fs.readFileSync(codePath!, 'utf-8');

        } catch (e: any) {
            console.error(`Error loading: ${e.message}`);
            process.exit(1);
        }
    }

    let engine: CircuitCrawlerEngine;

    // Input Handling
    const readline = await import('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    let isAsking = false;

    function checkInput() {
        if (engine && engine.isWaitingForInput && !isAsking) {
            isAsking = true;
            rl.question(`> `, (answer) => {
                isAsking = false;
                if (engine) engine.resolveInput(answer);
            });
        }
    }

    function render(robotStates: Map<string, RobotState>) {
        if (!engine) return;

        // Build the full output string
        let output = '';

        // Move cursor to top-left (Home) instead of clearing to prevent flicker
        // We only clear screen once initially or if desired, but here we assume we overwrite.
        // To be safe against scrolling history, maybe we can just jump to top.
        // \x1B[H moves cursor to home. \x1B[J clears from cursor to end of screen (good for variable height).
        // Using \x1B[2J\x1B[H once at start is good, but in loop just \x1B[H is better.
        // Best: \x1B[H + Overwrite + \x1B[J (clear rest) at end of write.
        output += '\x1B[H';

        // Render Maze
        const { width, height, walls, items } = mazeConfig!;

        // Build grid
        const grid: string[][] = [];
        for (let y = 0; y < height; y++) {
            const row: string[] = [];
            for (let x = 0; x < width; x++) {
                if (walls[y][x]) {
                    row.push('██');
                } else {
                    row.push('  ');
                }
            }
            grid.push(row);
        }

        // Render Items
        items.forEach((item: any) => {
            if (engine.worldActions.isItemCollected(item.id)) return;
            if (!engine.worldActions.isItemRevealed(item.id) && item.isRevealed === false) return;

            // Assume items (emojis) are mostly 2 chars wide visually or just 1 char + space
            // Emojis vary. To be safe/uniform, we might rely on terminal font.
            // But usually 1 emoji takes 2 columns.
            const icon = item.icon || '?';
            const display = icon.length === 1 && icon.charCodeAt(0) < 255 ? icon + ' ' : icon;

            grid[item.position.y][item.position.x] = display;
        });

        // Render Robots
        robotStates.forEach(robot => {
            if (robot.isDestroyed) {
                grid[robot.position.y][robot.position.x] = '💥';
            } else {
                let char = '^ ';
                switch (robot.direction) {
                    case 'North': char = '▲ '; break;
                    case 'East': char = '▶ '; break; // Using arrow + space
                    case 'South': char = '▼ '; break;
                    case 'West': char = '◀ '; break;
                }

                // Add color if possible (simple ANSI)
                // Cyan for standard robot
                const colorCode = '\x1b[36m';
                const reset = '\x1b[0m';
                grid[robot.position.y][robot.position.x] = colorCode + char + reset;
            }
        });

        // Add Grid to Output
        output += grid.map(row => row.join('')).join('\n') + '\n';

        // Add Status
        output += '\n--- STATUS ---\n';
        robotStates.forEach(robot => {
            output += `${robot.name}: HP ${robot.health} | Pos (${robot.position.x},${robot.position.y}) | Dir ${robot.direction}\n`;
            output += `Inventory: ${robot.inventory.map(i => i.name).join(', ')}\n`;
        });

        // Add Logs
        output += '\n--- LOGS ---\n';
        // Pad logs to ensure we overwrite previous long lines if logs change? 
        // Or just \x1B[K (Clear Line) at start of each log line?
        // Simpler: \x1B[J at the very end of the output string clears everything below.
        logs.slice(-MAX_LOGS).forEach(log => output += log + '\x1b[K\n');

        if (engine.isWaitingForInput) {
            output += `\nINPUT REQUIRED: ${engine.inputPrompt}\n`;
        }

        // Clear from cursor to end of screen to clean up any leftover garbage from previous frame
        output += '\x1B[J';

        process.stdout.write(output);

        if (engine.isWaitingForInput) {
            checkInput();
        }
    }

    engine = new CircuitCrawlerEngine({
        maze: mazeConfig!,
        onLog: (msg, type) => {
            logs.push(`[${type.toUpperCase()}] ${msg}`);
            if (engine) render(engine.robots);
        },
        onStateChange: () => {
            if (engine) render(engine.robots);
        },
        onRobotUpdate: (name, state) => {
            // handled by onStateChange
        },
        onCompletion: (success, msg) => {
            console.log(`\nGAME OVER: ${success ? 'VICTORY' : 'FAILURE'} - ${msg}`);
            process.exit(success ? 0 : 1);
        },
        fetchImpl: fetch // Use global fetch in Node 18+
    });

    // Initial Render
    process.stdout.write('\x1Bc'); // Clear screen once at start
    render(engine.robots);

    // Starting execution
    const files = {
        'main.ts': userCode!
    };

    logs.push("Starting engine...");
    render(engine.robots); // Re-render to show log
    await engine.run(files);

    rl.close();
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
