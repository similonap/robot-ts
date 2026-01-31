async function main() {
    const robot = game.getRobot('TestBot');
    console.log("Starting test bot...");
    await robot.moveForward();
    await robot.turnRight();
    await robot.moveForward();
    console.log("Test bot finished.");
}
