import { CircuitCrawlerEngine } from '../src/game/CircuitCrawlerEngine';
import { MazeConfig } from '../src/types';

describe('Pressure Plate', () => {
    // 5x3 maze.
    // 0,0: Start
    // 2,0: Pressure Plate
    // 4,0: Wall (stop)
    const mazeData: MazeConfig = {
        width: 5,
        height: 3,
        walls: [
            [false, false, false, false, true],
            [false, false, false, false, false],
            [false, false, false, false, false]
        ],
        items: [],
        doors: [],
        pressurePlates: [
            { id: 'plate-1', type: 'pressure_plate', position: { x: 2, y: 0 } }
        ],
        initialRobots: [{
            position: { x: 0, y: 0 },
            direction: 'East',
            name: 'TestBot'
        }]
    };

    let engine: CircuitCrawlerEngine;

    afterEach(() => {
        if (engine) engine.stop();
    });

    it('should activate when robot steps on it and deactivate when leaving', async () => {
        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze: mazeData, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            const plate = game.getPressurePlate('plate-1');

            plate.on('activate', () => console.log('EVENT: activate'));
            plate.on('deactivate', () => console.log('EVENT: deactivate'));

            // Verify initial state
            if (plate.isActive) throw new Error('Plate should be initially inactive');

            // Move to 1,0
            await robot.moveForward();
            if (plate.isActive) throw new Error('Plate should still be inactive at 1,0');

            // Move to 2,0 (ON PLATE)
            await robot.moveForward();
            if (!plate.isActive) throw new Error('Plate should be active when robot is on it');
            
            // Move to 3,0 (OFF PLATE)
            await robot.moveForward();
            if (plate.isActive) throw new Error('Plate should be inactive when robot leaves');

            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        // Logs are "LOG: EVENT: activate", etc.
        const activateLog = logs.find(msg => msg.includes('EVENT: activate'));
        const deactivateLog = logs.find(msg => msg.includes('EVENT: deactivate'));

        if (!activateLog || !deactivateLog) {
            console.error('Logs:', logs);
        }
        expect(activateLog).toBeDefined();
        expect(deactivateLog).toBeDefined();
    });

    it('should activate when item is dropped on it', async () => {
        // Maze with robot having an item
        const mazeWithItem = JSON.parse(JSON.stringify(mazeData));
        mazeWithItem.items = [{
            id: 'rock-1', type: 'item', name: 'Rock', icon: '🪨', tags: [],
            position: { x: 0, y: 0 } // Under robot initially
        }];

        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze: mazeWithItem, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            const plate = game.getPressurePlate('plate-1');
            
            // Pick up item
            const item = await robot.pickup();
            if (!item) throw new Error('Failed to pickup');

            // Move to plate (2,0)
            await robot.moveForward();
            await robot.moveForward();

            // Plate should be active because robot is on it
            if (!plate.isActive) throw new Error('Plate should be active (robot)');

            // Drop item on plate
            await robot.drop(item);

            // Move robot off plate (to 3,0)
            await robot.moveForward();
            
            // Plate should STILL be active because item is on it
            if (!plate.isActive) throw new Error('Plate should remain active (dropped item)');

            console.log('PASS: Item keeps plate pressed');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: Item keeps plate pressed'));
        expect(passLog).toBeDefined();
    });

    it('should deactivate when item is picked up from it', async () => {
        // Maze with item ALREADY on plate
        const mazeWithItemOnPlate = JSON.parse(JSON.stringify(mazeData));
        mazeWithItemOnPlate.items = [{
            id: 'rock-1', type: 'item', name: 'Rock', icon: '🪨', tags: [],
            position: { x: 2, y: 0 } // On the plate
        }];
        // Robot starts at 1,0 to avoid being on plate initially
        mazeWithItemOnPlate.initialRobots[0].position = { x: 1, y: 0 };

        const onLog = jest.fn();
        engine = new CircuitCrawlerEngine({ maze: mazeWithItemOnPlate, onLog });

        const code = `
            const robot = game.getRobot('TestBot');
            const plate = game.getPressurePlate('plate-1');

            // Move robot onto plate (2,0).
            await robot.moveForward();
            
            // Now robot AND item are on plate.
            if (!plate.isActive) throw new Error('Plate should be active (robot+item)');

            // Pick up item.
            await robot.pickup();

            // Robot still on plate, so it should stay pressed.
            if (!plate.isActive) throw new Error('Plate should still be active (robot)');

            // Move away.
            await robot.moveForward();

            // Now plate is empty. Should deactivate.
            if (plate.isActive) throw new Error('Plate should deactivate after robot leaves and item was removed');

            console.log('PASS: Pickup logic verified');
            game.win('Done');
        `;

        await engine.run({ 'main.ts': code });

        const logs = onLog.mock.calls.map(call => call[0]);
        const passLog = logs.find(msg => msg.includes('PASS: Pickup logic verified'));
        expect(passLog).toBeDefined();
    });
});
