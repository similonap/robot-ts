import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { MazeConfig } from '../src/types';

describe('CircuitCrawlerEngine Error Handling', () => {
    // 3x3 Maze. Robot at 1,1. surrounded by walls.
    // W W W
    // W . W
    // W W W
    const maze: MazeConfig = {
        width: 3,
        height: 3,
        walls: [
            [true, true, true],
            [true, false, true],
            [true, true, true]
        ],
        items: [],
        doors: [],
        initialRobots: [{
            position: { x: 1, y: 1 },
            direction: 'North',
            name: 'TestBot'
        }]
    };

    let engine: CircuitCrawlerEngine;

    beforeEach(() => {
        engine = new CircuitCrawlerEngine({ maze });
    });

    afterEach(() => {
        engine.stop();
    });

    it('should stop execution on uncaught CrashError', async () => {
        const onCompletion = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onCompletion });

        // Robot is at 1,1 facing North. 0,1 is a wall.
        // Moving forward should crash.
        const code = `
            const robot = game.getRobot('TestBot');
            await robot.moveForward();
            // Should not reach here
            console.log("Still running");
        `;

        await engine.run({ 'main.ts': code });

        expect(onCompletion).toHaveBeenCalledWith(false, expect.stringContaining('Crashed'));
    });

    it('should continue execution if CrashError is caught', async () => {
        const onCompletion = jest.fn();
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onCompletion, onLog });

        // Robot is at 1,1 facing North. 0,1 is a wall.
        // Moving forward should crash.
        const code = `
            const robot = game.getRobot('TestBot');
            try {
                await robot.moveForward();
            } catch (e) {
                console.log("Caught crash");
                // Turn Right (East) -> 2,1 is wall too, but we just want to prove we are still running
                await robot.turnRight(); 
                // Manually stop after success flow in test
                // This is needed because engine.run() waits for stopPromise recursively if not stopped.
            }
            // Signal completion to test harness if needed, 
            // but main returning should be enough IF run checks for completion.
            // But run() waits for stopPromise. So we must stop.
            game.win("Done");
        `;

        await engine.run({ 'main.ts': code });

        // Currently, without the fix, safeExec swallows the error and stops the engine. 
        // So the catch block is NEVER reached.
        // We expect this test to FAIL before the fix, and PASS after the fix.

        // Check if logs contain "Caught crash"
        const logs = onLog.mock.calls.map(call => call[0]);
        // console.log("Logs:", logs);

        // This is what we WANT to happen:
        const caughtLog = logs.find(msg => msg.includes('Caught crash'));

        // If the fix works, we should find it.
        // If the fix is not applied, we expect this check to likely fail (or we can assert expectation based on stage).
        // Since I am writing the test to verify the fix, I will assert what should happen.
        expect(caughtLog).toBeDefined();

        // Also, onCompletion should NOT be called with failure (or at least not for the crash)
        // If the script finishes successfully after catch, onCompletion might not be called if run() just finishes?
        // Actually run() waits for runFn. If runFn completes, run() finishes.
        // If we catch, the main function completes normally.
        // Currently `run` catches everything. If main completes, does it call onCompletion?
        // Looking at `run` method: 
        // finally { this.stop() }
        // It doesn't explicitly call onCompletion(true) unless game.win() is called.
        // But it definitely shouldn't be called with failure from the crash.
        const failureCall = onCompletion.mock.calls.find(call => call[0] === false);
        expect(failureCall).toBeUndefined();
    });
});
