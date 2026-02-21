import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';

describe('Custom Item Properties', () => {
    let engine: CircuitCrawlerEngine;

    beforeEach(() => {
        engine = new CircuitCrawlerEngine({
            maze: {
                width: 5,
                height: 5,
                walls: Array(5).fill([]).map(() => Array(5).fill(false)),
                items: [
                    {
                        id: 'item-1',
                        type: 'item',
                        name: 'Key',
                        icon: '🔑',
                        tags: ['key'],
                        position: { x: 2, y: 2 },
                        secretPassword: "open sesame",
                        valid: true,
                    }
                ],
                doors: [],
                pressurePlates: [],
                initialRobots: [{
                    name: 'TestRobot',
                    position: { x: 1, y: 1 },
                    direction: 'East'
                }]
            },
            onLog: console.log,
            onCompletion: (success, msg) => console.log('Completion:', success, msg)
        });
    });

    it('should allow reading custom properties via the game API inside script', async () => {
        let resultPassword = "";
        let resultValid = false;

        // Use global variables attached to \`globalThis\` or similar to leak the data out of the engine sandbox for testing
        // For testing we replace the fetchImpl to capture it or just capture via a custom log event.
        let capturedData: any = null;
        engine = new CircuitCrawlerEngine({
            maze: engine.maze,
            onLog: (msg) => {
                if (msg.startsWith("LOG: JSON:")) {
                    capturedData = JSON.parse(msg.substring(10));
                }
            }
        });

        const code = `
            async function main() {
                const item = game.getItem("item-1");
                console.log("JSON:" + JSON.stringify({ pass: item.secretPassword, valid: item.valid }));
            }
            main();
        `;

        const runPromise = engine.run({ 'main.ts': code });
        // After a small delay to allow main to execute, stop the engine
        setTimeout(() => engine.stop(), 100);
        await runPromise.catch(() => { }); // Catch the artificial stop error

        expect(capturedData).not.toBeNull();
        expect(capturedData.pass).toBe("open sesame");
        expect(capturedData.valid).toBe(true);
    });

    it('should allow writing custom properties via the game API inside script', async () => {
        const code = `
            async function main() {
                const item = game.getItem("item-1");
                item.newCustomProp = "hello world";
                item.valid = false;
            }
            main();
        `;

        const runPromise = engine.run({ 'main.ts': code });
        setTimeout(() => engine.stop(), 100);
        await runPromise.catch(() => { });

        const itemInState = engine.maze.items.find((i: any) => i.id === 'item-1');
        expect(itemInState?.newCustomProp).toBe("hello world");
        expect(itemInState?.valid).toBe(false);
    });
});
