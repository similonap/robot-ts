import { game } from "circuit-crawler";

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

async function main() {
    try {
        const robot = game.getRobot("robot");

        await robot.moveForward();

        let scannedObject = await robot.scan();

        if (isItem(scannedObject)) {
            if (isStorage(scannedObject)) {
                let results = await Promise.all(scannedObject.urls.map(url => fetch(url.url)));
                let responses: Passwords[] = await Promise.all(results.map(result => result.json()));

                let password: string = responses.sort((a, b) => a.order - b.order)
                    .map(val => val.value)
                    .reduce((acc, curr) => acc + curr);

                console.log(password);
            }
        }
    } catch (e) {
        console.log(e);
    }
}