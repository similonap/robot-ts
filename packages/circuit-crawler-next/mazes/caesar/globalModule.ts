const robot = game.getRobot("robot");

const checkWin = () => {
  if (game.items.length === 0) {
    game.win("You found the gem!")
  }
};

robot.addEventListener('move', checkWin);
robot.addEventListener('pickup', checkWin);
checkWin();