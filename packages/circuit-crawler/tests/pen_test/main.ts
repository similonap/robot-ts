import { game } from "circuit-crawler";

async function main() {
    // Initial state check
    const robot = game.getRobot('Painter');
    if (!robot) throw new Error("Painter robot not found");

    console.log("Starting Pen Test");

    // Test 1: Draw Red Line
    robot.setPen({ color: 'red', size: 5 });
    await robot.moveForward();
    await robot.moveForward();

    robot.setPen(null);
    await robot.turnRight();
    await robot.moveForward();
    await robot.moveForward();

    // Test 3: Draw Blue Line
    robot.setPen({ color: 'blue', size: 2 });
    await robot.turnRight();
    await robot.moveForward();

    game.win("Pen test complete");
}
