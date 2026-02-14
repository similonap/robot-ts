const door = game.getDoor("door-1771102131986");
const plate = game.getPressurePlate("plate-1771102135082");

plate.addEventListener("activate", () => {
    door.open();
});

plate.addEventListener("deactivate", () => {
    door.close();
});

game.getItem("item-1771102172313").addEventListener("pickup", () => {
    game.win("You collected the treasure!");
});