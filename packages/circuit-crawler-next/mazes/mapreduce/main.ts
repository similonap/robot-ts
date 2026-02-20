import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

interface ItemValue {
    value: string;
    valid: boolean;
    order: number;
}

async function moveAndPickup(steps: number) {
    for (let i = 0; i < steps; i++) {
        await robot.moveForward();
        await robot.pickup();
    }
}

async function main() {
    robot.setSpeed(20);


}