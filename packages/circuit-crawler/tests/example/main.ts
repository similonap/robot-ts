import { game } from "circuit-crawler";

async function main() {
    const robot = game.getRobot("robot")!;
    robot.setSpeed(1);

    console.log("Starting at " + robot.position.x + ", " + robot.position.y);

    // Robot starts at 4, 6 facing East. Item is at 10, 6.
    // We need to move 6 steps forward.
    while (robot.position.x < 10) {
        const canMove = await robot.canMoveForward();
        if (canMove) {
            await robot.moveForward();
            console.log("Moved to " + robot.position.x + ", " + robot.position.y);
        } else {
            console.log("Blocked at " + robot.position.x + ", " + robot.position.y);
            break;
        }
    }

    // Checking if we are at the item location
    if (robot.position.x === 10 && robot.position.y === 6) {
        console.log("Attempting pickup...");
        await robot.pickup();
    }
}