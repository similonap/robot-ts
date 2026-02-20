
const robot = game.getRobot("robot");


const password: string = "SIX7!"

game.getItem("item-1").value = { value: password[0], valid: true, order: 1 }
game.getItem("item-2").value = { value: "A", valid: false, order: 2 }
game.getItem("item-3").value = { value: password[1], valid: true, order: 3 }
game.getItem("item-4").value = { value: "s", valid: false, order: 4 }
game.getItem("item-5").value = { value: "a", valid: false, order: 5 }
game.getItem("item-6").value = { value: password[2], valid: true, order: 6 }
game.getItem("item-7").value = { value: password[3], valid: true, order: 7 }
game.getItem("item-8").value = { value: password[4], valid: true, order: 8 }

game.getItem("item-prize").addEventListener("pickup", () => {
    game.win("You collected the treasure!");
});
