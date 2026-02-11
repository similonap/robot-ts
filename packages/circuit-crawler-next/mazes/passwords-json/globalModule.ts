const robot1 = game.getRobot("robot");

robot1.addEventListener("pickup", () => {
    if (game.items.length === 0) {
        game.win("Game has been won")
    }
});