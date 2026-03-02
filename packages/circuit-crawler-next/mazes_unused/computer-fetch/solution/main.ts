import { game } from "circuit-crawler";


interface Laptop extends Item {
    activate: () => Promise<void>
}

function isLaptop(item: any): item is Laptop {
    return item.type === "item" && item.category === "Laptop";
}

async function main() {
    const robot = game.getRobot("Robot 1");
    if (!robot) return;

    let item = await robot.scan();

    if (isLaptop(item)) {
        await item.activate();
    }



}