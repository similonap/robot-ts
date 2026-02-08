import { game } from "circuit-crawler";

async function main() {
    const robot = game.getRobot("robot");

    if (!robot) {
        throw new Error("Robot not found");
    }

    let commands: string[] = [
        "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "YRSG", "SBEJNEQ", "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "SBEJNEQ", "EVTUG", "SBEJNEQ", "SBEJNEQ", "EVTUG", "SBEJNEQ", "SBEJNEQ", "EVTUG", "SBEJNEQ", "EVTUG", "SBEJNEQ"
    ];

    await robot.executePath(commands);

    await robot.pickup();
}