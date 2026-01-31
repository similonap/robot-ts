import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

if (robot) {
    game.addEventListener("robot_created", (robot) => {
        if (robot.position.x === 7 && robot.position.y === 7) {

        }
    });
}
