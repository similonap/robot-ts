import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

if (robot) {
    game.addEventListener("robot_created", (robot) => {
        if (robot.name !== "MyRobot") {
            game.fail("Robot name is not MyRobot");
        }
        if (robot.position.x !== 7 || robot.position.y !== 7) {
            game.fail("Robot is not at position 7, 7");
        }
        if (robot.color !== "#ff0000") {
            game.fail("Robot is not red");
        }
        game.win("You created the correct robot");
    });
}
