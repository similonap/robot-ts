import { game } from "circuit-crawler";

async function main() {
    const robot = game.getRobot("robot");

    if (!robot) {
        throw new Error("Robot not found");
    }

    let commands: string[] = [
        "FORWARD", "FORWARD",
        "LEFT",
        "FORWARD", "FORWARD", "FORWARD", "FORWARD",
        "LEFT",
        "FORWARD", "FORWARD",
        "RIGHT",
        "FORWARD", "FORWARD",
        "RIGHT",
        "FORWARD", "FORWARD", "FORWARD",
        "LEFT",
        "FORWARD", "FORWARD", "FORWARD", "FORWARD",
        "LEFT",
        "FORWARD", "FORWARD", "FORWARD"
    ]

    await robot.executePath(commands);

    await robot.pickup();
}