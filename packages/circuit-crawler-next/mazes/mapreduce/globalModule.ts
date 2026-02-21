
const robot = game.getRobot("robot");


const password: string = "SIX7!"

Object.assign(game.getItem("item-1"), { secret: btoa(password[0]), valid: true, order: 1 });
Object.assign(game.getItem("item-2"), { secret: btoa("A"), valid: false, order: 2 });
Object.assign(game.getItem("item-3"), { secret: btoa(password[1]), valid: true, order: 3 });
Object.assign(game.getItem("item-4"), { secret: btoa("s"), valid: false, order: 4 });
Object.assign(game.getItem("item-5"), { secret: btoa("a"), valid: false, order: 5 });
Object.assign(game.getItem("item-6"), { secret: btoa(password[2]), valid: true, order: 6 });
Object.assign(game.getItem("item-7"), { secret: btoa(password[3]), valid: true, order: 7 });
Object.assign(game.getItem("item-8"), { secret: btoa(password[4]), valid: true, order: 8 });

game.getItem("item-prize").addEventListener("pickup", () => {
    game.win("You collected the treasure!");
});
