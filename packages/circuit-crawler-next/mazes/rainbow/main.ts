import { game } from "circuit-crawler";
import { rainbow } from "rainbow-colors-array-ts";

async function main() {
    const robot = game.getRobot("robot");

    if (!robot) {
        game.fail("Robot not found");
        return;
    }

    const colors = rainbow(15, "hex");


    for (let i = 0; i < 15; i++) {
        robot.setPen({
            color: colors[i].hex,
            size: 10
        });
        await robot.moveForward();
    }
}