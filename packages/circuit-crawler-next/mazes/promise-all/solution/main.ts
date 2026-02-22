import { game } from "circuit-crawler";

const robot = game.getRobot("robot");

interface Url {
    url: string;
}

interface Passwords {
    value: string;
    type: string;
    order: number;
}

interface Storage extends Item {
    category: "storage"
    urls: Url[]
}

function isItem(object: Item | Door | undefined): object is Item {
    if (object) {
        if (object.type === "item") {
            return true;
        }
    }
    return false;
}

function isStorage(object: Item | Door | undefined): object is Storage {
    if (isItem(object)) {
        return (object.category === "storage");
    }
    return false;
}

async function move(steps: number) {
    for (let i = 0; i < steps; i++)
        await robot.moveForward()
}

async function main() {
    try {
        await robot.moveForward();

        let scannedObject = await robot.scan();

        let password: string = "";
        if (isItem(scannedObject)) {
            if (isStorage(scannedObject)) {
                let results = await Promise.all(scannedObject.urls.map(url => fetch(url.url)));
                let responses: Passwords[] = await Promise.all(results.map(result => result.json()));

                password = responses.sort((a, b) => a.order - b.order)
                    .map(val => val.value)
                    .reduce((acc, curr) => acc + curr);
            }
        }

        await robot.turnRight();
        await move(4);
        await robot.turnRight();
        await move(1);
        await robot.turnLeft();

        await robot.openDoor(password);

        await move(2);

        await robot.pickup();


    } catch (e) {
        console.log(e);
    }
}