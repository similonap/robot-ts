const robot1 = game.getRobot("Robot 1");
const robot2 = game.getRobot("Robot 2");

robot1.addEventListener("pickup", () => {
    if (game.items.length === 0) {
        game.win("Game has been won")
    }
})

robot2.addEventListener("pickup", () => {
    if (game.items.length === 0) {
        game.win("Game has been won")
    }
})



export { robot1, robot2 }