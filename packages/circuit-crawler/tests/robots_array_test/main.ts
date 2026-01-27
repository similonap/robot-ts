async function main() {
    // @ts-ignore
    if (!Array.isArray(game.robots)) {
        throw new Error("game.robots is not an array");
    }

    // @ts-ignore
    console.log("Initial robots:", game.robots.length);
    // @ts-ignore
    if (game.robots.length !== 0) throw new Error("Initial robots length should be 0");

    console.log("Creating new robot R1...");
    // @ts-ignore
    const r1 = game.createRobot({
        x: 1,
        y: 1,
        name: "R1",
        color: "#ff0000",
        direction: "South"
    });

    // @ts-ignore
    console.log("Robots after R1:", game.robots.length);
    // @ts-ignore
    if (game.robots.length !== 1) throw new Error("Robots length should be 1");
    // @ts-ignore
    if (game.robots[0].name !== "R1") throw new Error("Robot[0] name should be R1");

    console.log("Creating new robot R2...");
    // @ts-ignore
    const r2 = game.createRobot({
        x: 2,
        y: 2,
        name: "R2",
        color: "#00ff00",
        direction: "North"
    });

    // @ts-ignore
    console.log("Robots after R2:", game.robots.length);
    // @ts-ignore
    if (game.robots.length !== 2) throw new Error("Robots length should be 2");

    // Check if both are present by finding them
    // @ts-ignore
    const names = game.robots.map((r: any) => r.name).sort();
    if (names[0] !== "R1" || names[1] !== "R2") throw new Error("Robots names mismatch");

    game.win("Robots array verified");
}
