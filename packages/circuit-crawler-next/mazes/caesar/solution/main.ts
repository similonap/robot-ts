import { game } from "circuit-crawler";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function translate(command: string) {
    let newCommand = "";
    for (let i = 0; i < command.length; i++) {
        const index = ALPHABET.indexOf(command[i]);
        const newIndex = (index + 13) % 26;
        newCommand += ALPHABET[newIndex];
    }
    return newCommand;
}

async function main() {
    const robot = game.getRobot("robot");

    if (!robot) {
        throw new Error("Robot not found");
    }

    let commands: string[] = [
        "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "YRSG", "SBEJNEQ", "SBEJNEQ", "YRSG", "SBEJNEQ", "EVTUG", "SBEJNEQ", "SBEJNEQ", "EVTUG", "SBEJNEQ", "SBEJNEQ", "EVTUG", "SBEJNEQ", "SBEJNEQ", "EVTUG", "SBEJNEQ", "EVTUG", "SBEJNEQ"
    ];

    const translatedCommands = commands.map(translate);

    await robot.executePath(translatedCommands);

    await robot.pickup();
}