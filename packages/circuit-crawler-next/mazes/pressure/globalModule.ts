game.getItem("item-1769366223774").addEventListener("move", () => {
    game.getDoor("door-1769366150309").open();
});

game.getItem("item-1769366777036").addEventListener("pickup", () => {
    game.win("You collected the treasure!");
})