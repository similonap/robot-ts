import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

interface Key extends Item {
    secret: string;
    valid: boolean;
    order: number;
}

async function moveAndPickup(steps: number) {
    for (let i = 0; i < steps; i++) {
        await robot.moveForward();
        await robot.pickup();
    }
}

function isKey(item: Item): item is Key {
    return item.type === "Key";
}

async function main() {
    robot.setSpeed(20);
    await moveAndPickup(9);
    await robot.turnLeft();
    await moveAndPickup(8);
    await robot.turnLeft();
    await moveAndPickup(8);
    await robot.turnLeft();
    await moveAndPickup(8);

    let password: string = robot.inventory
        .filter(isKey)
        .filter((v) => v.valid)
        .sort((a, b) => a.order - b.order)
        .map(v => v.secret)
        .map(atob)
        .reduce((prev, curr) => prev + curr)

    console.log(password);

    await robot.turnLeft();
    await moveAndPickup(6);
    await robot.turnLeft();
    await moveAndPickup(4);

    await robot.turnLeft();
    await robot.openDoor(password);

    await moveAndPickup(2);


}