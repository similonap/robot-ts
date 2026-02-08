
import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { MazeConfig } from '../src/types';

const maze: MazeConfig = {
    width: 10,
    height: 10,
    walls: Array(10).fill([]).map(() => Array(10).fill(false)), // Open space
    items: [],
    doors: []
};

// Test script: Valid path
const testCodeValid = `
    const robot = game.createRobot({ x: 1, y: 1, name: "ValidRobot", direction: "East" });
    await robot.executePath(['FORWARD', 'LEFT']);
    game.win("Done Valid");
`;

// Test script: Invalid path
const testCodeInvalid = `
    const robot = game.createRobot({ x: 5, y: 5, name: "InvalidRobot", direction: "East" });
    await robot.executePath(['FORWARD', 'JUMP']); 
`;

async function runTest() {
    console.log("--- Running Valid Path Test ---");
    let engine = new CircuitCrawlerEngine({
        maze,
        onCompletion: (success, msg) => {
            if (!success) {
                console.error("Valid path test failed:", msg);
                process.exit(1);
            }
        }
    });
    await engine.run({ "main.ts": testCodeValid });

    console.log("--- Running Invalid Path Test ---");
    let caughtError = false;
    engine = new CircuitCrawlerEngine({
        maze,
        onLog: (msg) => {
            // We expect a runtime error log
            if (msg.includes("Invalid command: JUMP")) {
                caughtError = true;
            }
        },
        onCompletion: (success, msg) => {
            if (!success && msg.includes("Invalid command: JUMP")) {
                caughtError = true;
            }
        }
    });

    try {
        await engine.run({ "main.ts": testCodeInvalid });
    } catch (e) {
        // Engine catches errors usually, but let's see
    }

    if (caughtError) {
        console.log("TEST PASSED: Invalid command was caught.");
        process.exit(0);
    } else {
        console.error("TEST FAILED: Did not catch invalid command error.");
        process.exit(1);
    }
}

runTest().catch((e: any) => {
    console.error(e);
    process.exit(1);
});
