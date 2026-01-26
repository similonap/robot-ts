
async function main() {
    const robot = game.getRobot('Painter');
    if (!robot) throw new Error("Painter robot not found");

    console.log("Starting Partial Pen Test");

    // 1. Partial set (Color only), Default Size check
    robot.setPen({ color: 'red' });
    // Internally should be red, size 1 (default)
    await robot.moveForward();

    // 2. Partial set (Size only), Keep Color check
    robot.setPen({ size: 5 });
    // Internally should be red, size 5
    await robot.moveForward();

    // 3. Partial set (Color only), Keep Size check
    robot.setPen({ color: 'blue' });
    // Internally should be blue, size 5
    await robot.moveForward();

    game.win("Partial pen test complete");
}
