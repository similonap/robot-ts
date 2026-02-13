import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { MazeConfig } from '../src/types';

describe('Drop item', () => {
    // 5x1 horizontal corridor. Robot at 0,0 facing East. Item at 2,0.
    // . . I . .
    const maze: MazeConfig = {
        width: 5,
        height: 1,
        walls: [
            [false, false, false, false, false]
        ],
        items: [{
            id: 'key-1',
            type: 'item',
            name: 'Key',
            icon: '🔑',
            tags: ['key'],
            position: { x: 2, y: 0 }
        }],
        doors: [],
        initialRobots: [{
            position: { x: 0, y: 0 },
            direction: 'East',
            name: 'TestBot'
        }]
    };

    let engine: CircuitCrawlerEngine;

    afterEach(() => {
        engine.stop();
    });

    it('should drop an item at the robot current position', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            // Move to position 2,0 where the item is
            await robot.moveForward();
            await robot.moveForward();

            // Pick up the item
            const item = await robot.pickup();
            if (!item) throw new Error('No item picked up');
            if (robot.inventory.length !== 1) throw new Error('Inventory should have 1 item');

            // Move to position 4,0
            await robot.moveForward();
            await robot.moveForward();

            // Drop the item at position 4,0
            const dropped = await robot.drop(item);
            if (!dropped) throw new Error('Drop returned null');
            if (dropped.position.x !== 4 || dropped.position.y !== 0) {
                throw new Error('Dropped item should be at 4,0 but is at ' + JSON.stringify(dropped.position));
            }
            if (robot.inventory.length !== 0) throw new Error('Inventory should be empty after drop');

            console.log('PASS: item dropped at correct position');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: item dropped at correct position'));
        expect(passLog).toBeDefined();
    });

    it('should return null when dropping an item not in inventory', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            // Try to drop an item we don't have
            const fakeItem = { id: 'key-1', type: 'item', name: 'Key', icon: '🔑', tags: ['key'] };
            const result = await robot.drop(fakeItem);
            if (result !== null) throw new Error('Drop should return null for item not in inventory');

            console.log('PASS: drop returned null');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: drop returned null'));
        expect(passLog).toBeDefined();
    });

    it('should reset items to original positions after drop + reset', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        // First run: pick up item at 2,0, drop at 4,0
        const code1 = `
            const robot = game.getRobot('TestBot');
            await robot.moveForward();
            await robot.moveForward();
            const item = await robot.pickup();
            await robot.moveForward();
            await robot.moveForward();
            await robot.drop(item);
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code1 });

        // Reset the engine — items should be restored to original maze.json positions
        engine.reset();

        // Verify the item is back at its original position (2,0)
        const restoredItem = engine.maze.items.find(i => i.id === 'key-1');
        expect(restoredItem).toBeDefined();
        expect(restoredItem!.position).toEqual({ x: 2, y: 0 });
    });

    it('should allow picking up a dropped item', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        const code = `
            const robot = game.getRobot('TestBot');

            // Move to item at 2,0
            await robot.moveForward();
            await robot.moveForward();
            const item = await robot.pickup();

            // Move to 3,0 and drop
            await robot.moveForward();
            await robot.drop(item);

            // Turn around and go back to 3,0 (we're already there)
            // Pick it up again
            const rePicked = await robot.pickup();
            if (!rePicked) throw new Error('Should be able to pick up dropped item');
            if (rePicked.id !== 'key-1') throw new Error('Picked up wrong item');

            console.log('PASS: re-picked dropped item');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: re-picked dropped item'));
        expect(passLog).toBeDefined();
    });

    it('should prevent dropping an item where another item already exists', async () => {
        // Maze with two items: key at 2,0 and gem at 3,0
        const twoItemMaze: MazeConfig = {
            width: 5,
            height: 1,
            walls: [[false, false, false, false, false]],
            items: [
                { id: 'key-1', type: 'item', name: 'Key', icon: '🔑', tags: ['key'], position: { x: 2, y: 0 } },
                { id: 'gem-1', type: 'item', name: 'Gem', icon: '💎', tags: [], position: { x: 3, y: 0 } }
            ],
            doors: [],
            initialRobots: [{ position: { x: 0, y: 0 }, direction: 'East', name: 'TestBot' }]
        };

        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze: twoItemMaze, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            // Move to key at 2,0 and pick it up
            await robot.moveForward();
            await robot.moveForward();
            const key = await robot.pickup();

            // Move to gem at 3,0 (don't pick it up)
            await robot.moveForward();

            // Try to drop the key at 3,0 where gem already is
            const result = await robot.drop(key);
            if (result !== null) throw new Error('Drop should return null when position is occupied');
            if (robot.inventory.length !== 1) throw new Error('Item should remain in inventory');

            console.log('PASS: drop prevented at occupied position');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        expect(logs.find(msg => msg.includes('PASS: drop prevented at occupied position'))).toBeDefined();
    });

    it('should trigger the drop event on the item', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            const item = game.getItem('key-1');
            
            let eventTriggered = false;
            item.on('drop', (droppedItem) => {
                console.log('EVENT: drop triggered for ' + droppedItem.id);
                eventTriggered = true;
            });

            // Move to key, pick it up, then drop it
            await robot.moveForward();
            await robot.moveForward();
            const picked = await robot.pickup();
            await robot.moveForward();
            await robot.drop(picked);

            if (!eventTriggered) throw new Error('Drop event was not triggered');
            console.log('PASS: drop event captured');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        expect(logs.find(msg => msg.includes('EVENT: drop triggered for key-1'))).toBeDefined();
        expect(logs.find(msg => msg.includes('PASS: drop event captured'))).toBeDefined();
    });
});
