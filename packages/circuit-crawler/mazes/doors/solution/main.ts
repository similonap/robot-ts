import { game } from "circuit-crawler";
import readline from "readline-sync";

async function main() {
    const robot = game.getRobot("robot");
    robot.setSpeed(100)

    const move = async (n: number) => {
        for (let i = 0; i < n; i++) await robot.moveForward();
    };

    await move(8);
    await robot.openDoor();
    await move(3);

    await robot.turnRight();
    await move(2);
    await robot.pickup();

    await robot.turnRight();
    await robot.turnRight();
    await move(2);
    await robot.turnLeft();
    await move(3);

    await robot.turnLeft();

    let result = await robot.openDoor();
    while (result.requiredAuth === "PASSWORD") {
        // the correct password is... password!
        const password = readline.question("Please enter the correct password: ");
        result = await robot.openDoor(password);
    }

    await move(2);
    await robot.turnRight();

    await move(8);
    await robot.turnLeft();

    await robot.openDoor(robot.inventory[0]);

    await move(2);
    await robot.turnLeft();

    await move(8);
    await robot.pickup();
}