import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

if (robot) {
    robot.addEventListener("pickup", () => {
        if (game.items.length === 0) {
            game.win("All items collected!");
        }
    });
}
