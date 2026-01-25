
import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { WorldManager } from '../src/game/WorldManager';
import * as fs from 'fs';
import * as path from 'path';

async function runEventsTest() {
    const testDir = path.join(__dirname, '../tests/events');
    const mazePath = path.join(testDir, 'maze.json');
    const mainPath = path.join(testDir, 'main.ts');

    const mazeContent = fs.readFileSync(mazePath, 'utf8');
    const maze = JSON.parse(mazeContent);
    const mainCode = fs.readFileSync(mainPath, 'utf8');

    // Manually create WorldManager to spy on flushUpdates
    let flushCount = 0;
    const worldManager = new WorldManager(maze, () => { });

    // Create a proxy for actions to intercept flushUpdates
    const actions = worldManager.actions;
    const worldActions = {
        ...actions,
        flushUpdates: () => {
            flushCount++;
            actions.flushUpdates();
        }
    };

    const engine = new CircuitCrawlerEngine({
        maze,
        externalWorld: {
            actions: worldActions,
            reset: () => worldManager.reset(maze)
        },
        onLog: (msg, type) => console.log(`[${type.toUpperCase()}] ${msg}`),
        onCompletion: (success, msg) => {
            if (success) {
                console.log("✅ TEST PASSED:", msg);
                // Verify flushUpdates was called
                if (flushCount > 0) {
                    console.log(`✅ Visual Update Verification: flushUpdates called ${flushCount} times.`);
                    process.exit(0);
                } else {
                    console.error("❌ Visual Update Verification FAILED: flushUpdates was NEVER called.");
                    process.exit(1);
                }
            } else {
                console.error("❌ TEST FAILED:", msg);
                process.exit(1);
            }
        }
    });

    try {
        await engine.run({ 'main.ts': mainCode });
    } catch (e) {
        console.error("Engine Error:", e);
        process.exit(1);
    }
}

runEventsTest();
