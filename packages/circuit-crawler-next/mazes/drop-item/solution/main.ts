import { game } from "circuit-crawler";

async function main() {
    const robot = game.getRobot("robot");

    if (!robot) {
        console.log("Robot not found!");
        return;
    }

    // 1. Move to the Apple (at 5,2)
    // Robot starts at (2,2) facing East
    await robot.moveForward(); // 3,2
    await robot.moveForward(); // 4,2
    await robot.moveForward(); // 5,2

    // 2. Pick up Apple
    const apple = await robot.pickup();

    // 3. Move to Pressure Plate (at 11,2)
    await robot.moveForward(); // 6,2
    await robot.moveForward(); // 7,2
    await robot.moveForward(); // 8,2
    await robot.moveForward(); // 9,2
    await robot.moveForward(); // 10,2
    await robot.moveForward(); // 11,2

    // 4. Drop Apple on Plate
    await robot.drop(apple);

    // 5. Move back to start (2,2) to enter the door
    // Turn around (Face West)
    await robot.turnLeft();
    await robot.turnLeft();

    // Move West 9 steps
    for (let i = 0; i < 9; i++) {
        await robot.moveForward();
    }

    // 6. Enter Door (at 2,3) and collect Gem (at 2,4)
    // Currently at 2,2 facing West. Turn Left to face South.
    await robot.turnLeft();

    await robot.moveForward(); // 2,3 (Door location - should be open now)
    await robot.moveForward(); // 2,4 (Gem location)

    // 7. Win
    await robot.pickup();
}
