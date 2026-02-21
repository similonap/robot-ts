import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { MazeConfig } from '../src/types';

describe('Pickup removes item position', () => {
    // 3x3 Maze. Robot at 0,1 facing East. Item at 1,1.
    // W W W
    // . I W
    // W W W
    const maze: MazeConfig = {
        width: 3,
        height: 3,
        walls: [
            [true, true, true],
            [false, false, true],
            [true, true, true]
        ],
        items: [{
            id: 'gem-1',
            kind: 'item',
            name: 'Key',
            icon: '🔑',
            type: 'key',
            position: { x: 1, y: 1 }
        }],
        doors: [],
        initialRobots: [{
            position: { x: 0, y: 1 },
            direction: 'East',
            name: 'TestBot'
        }]
    };

    let engine: CircuitCrawlerEngine;

    afterEach(() => {
        engine.stop();
    });

    it('should remove position from item after pickup', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            await robot.moveForward();
            const item = await robot.pickup();

            if (!item) throw new Error('No item picked up');
            if (item.position !== undefined) {
                throw new Error('Item should not have a position after pickup, but got: ' + JSON.stringify(item.position));
            }

            console.log('PASS: item has no position');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: item has no position'));
        expect(passLog).toBeDefined();
    });

    it('should remove position from items in inventory', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            await robot.moveForward();
            await robot.pickup();

            const inventoryItem = robot.inventory[0];
            if (!inventoryItem) throw new Error('No item in inventory');
            if (inventoryItem.position !== undefined) {
                throw new Error('Inventory item should not have a position, but got: ' + JSON.stringify(inventoryItem.position));
            }

            console.log('PASS: inventory item has no position');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: inventory item has no position'));
        expect(passLog).toBeDefined();
    });
    it('should retain custom properties set via game.getItem()', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        const code = `
            // Add custom property via the global game.getItem proxy
            game.getItem('gem-1').customProp = 'hello';

            const robot = game.getRobot('TestBot');
            await robot.moveForward();
            const item = await robot.pickup();

            if (!item) throw new Error('No item picked up');
            if (item.customProp !== 'hello') {
                throw new Error('Item should retain customProp, got: ' + item.customProp);
            }

            // Also check inventory directly
            if (robot.inventory[0].customProp !== 'hello') {
                throw new Error('Inventory item should retain customProp, got: ' + robot.inventory[0].customProp);
            }

            console.log('PASS: item has custom properties');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: item has custom properties'));
        expect(passLog).toBeDefined();
    });
});
