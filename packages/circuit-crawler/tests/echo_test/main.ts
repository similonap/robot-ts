import { game } from "circuit-crawler";

export async function main() {
    console.log("Starting Echo Test");
    const robot = game.getRobot("TestBot");
    robot?.setSpeed(10)

    if (!robot) {
        game.fail("Robot 'TestBot' not found");
        return;
    }

    // 1. Echo North (Should hit Wall at (1,0))
    // Robot at (1,1). (1,0) is distance 1.
    const d1 = await robot.echo();
    console.log(`Echo North Distance: ${d1}`);
    if (d1 !== 1) {
        game.fail(`Expected distance 1 to North Wall, got ${d1}`);
        return;
    }

    // 2. Turn East
    await robot.turnRight();

    // 3. Echo East (Should hit Item at (3,1))
    // Robot at (1,1). (2,1) empty. (3,1) item. Distance 2.
    const d2 = await robot.echo();
    console.log(`Echo East Distance: ${d2}`);
    if (d2 !== 2) {
        game.fail(`Expected distance 2 to Item, got ${d2}`);
        return;
    }

    // 4. Turn South
    await robot.turnRight();

    // 5. Echo South (Should hit Door at (1,3))
    // Robot at (1,1). (1,2) empty. (1,3) door. Distance 2.
    const d3 = await robot.echo();
    console.log(`Echo South Distance: ${d3}`);
    if (d3 !== 2) {
        game.fail(`Expected distance 2 to Door, got ${d3}`);
        return;
    }

    game.win("All echo tests passed");
}
