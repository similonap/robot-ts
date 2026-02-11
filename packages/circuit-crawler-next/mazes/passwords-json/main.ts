import { game } from "circuit-crawler";

async function move(n: number) {
    const robot = game.getRobot("robot");
    if (!robot) {
        throw new Error("Robot not found");
    }
    for (let i: number = 0; i < n; i++) {
        await robot.moveForward();
    }
}

async function main() {

}



