import { game } from "circuit-crawler";

game.addEventListener("robot_created", (robot) => {
    console.log("ROBOT CREATED");
    if (robot.name !== "Robot") {
        game.fail("Robot name is not Robot");
    }
    if (robot.position.x !== 7 || robot.position.y !== 7) {
        game.fail("Robot is not at position 7, 7");
    }
    if (robot.color !== "#ff0000") {
        game.fail("Robot is not red");
    }
    game.win("You created the correct robot");
});
