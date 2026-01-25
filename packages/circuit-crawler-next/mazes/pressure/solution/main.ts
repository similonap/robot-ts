import { game } from "circuit-crawler";

async function main() {
    const robot1 = game.getRobot("Robot 1");
    const robot2 = game.getRobot("Robot 2");

    if (!robot1 || !robot2) return;

    for (let i = 0; i < 6; i++) {
        await robot1.moveForward();
    }

    for (let i = 0; i < 6; i++) {
        await robot2.moveForward();
    }
    await robot2.pickup();
}