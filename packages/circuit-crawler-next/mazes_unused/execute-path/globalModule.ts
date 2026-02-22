declare const game: any;

const robot = game.getRobot("robot");

const checkWin = () => {
  if (game.items.length === 0) {
    game.win("All items were collected")
  }
};

robot.addEventListener('move', checkWin);
robot.addEventListener('pickup', checkWin);
checkWin();