import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

interface Key extends Item {
    secret: string;
    valid: boolean;
    order: number;
}

function isKey(item: Item): item is Key {
    return item.type === "Key";
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