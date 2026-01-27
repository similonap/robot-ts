
import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { MazeConfig } from '../src/types';
import { strict as assert } from 'assert';

const maze: MazeConfig = {
    width: 10,
    height: 10,
    walls: [],
    items: [],
    doors: []
};

// Define global types for the test environment
declare global {
    var game: any;
    var createRobot: any;
}

const testCode = `
    let robotCount = 0;
    game.addEventListener("robot_created", (robot) => {
        robotCount++;
        console.log("Robot created: " + robot.name);
    });

    game.createRobot({ x: 1, y: 1, name: "TestRobot1" });
    game.createRobot({ x: 2, y: 2, name: "TestRobot2" });
    game.win("Done");
`;

async function runTest() {
    let logOutput = "";

    const engine = new CircuitCrawlerEngine({
        maze,
        onLog: (msg: string) => {
            logOutput += msg + "\n";
        },
        onCompletion: (success: boolean, msg: string) => {
            if (logOutput.includes("Robot created: TestRobot1") &&
                logOutput.includes("Robot created: TestRobot2")) {
                console.log("TEST PASSED");
                process.exit(0);
            } else {
                console.error("TEST FAILED: Logs missing expected output");
                console.error(logOutput);
                process.exit(1);
            }
        }
    });

    await engine.run({
        "main.ts": testCode
    });
}

runTest().catch((e: any) => {
    console.error(e);
    process.exit(1);
});
