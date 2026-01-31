export async function main() {
    console.log("Creating new robot R2...");
    const r2 = game.createRobot({
        x: 2,
        y: 2,
        name: "R2",
        color: "#ff0000",
        direction: "South"
    });

    if (!r2) {
        throw new Error("createRobot returned undefined");
    }

    console.log("R2 created:", r2.name);
    await r2.turnLeft();

    // Check if robot is in engine
    // @ts-ignore
    const fetchedR2 = game.getRobot("R2");
    if (!fetchedR2) throw new Error("Could not getRobot(R2)");

    game.win("Robot created and moved");
}
