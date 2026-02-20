
const robot = game.getRobot("robot");


const password: string = "SIX7!"

game.getItem("item-1").value = { value: btoa(password[0]), valid: true, order: 1 }
game.getItem("item-2").value = { value: btoa("A"), valid: false, order: 2 }
game.getItem("item-3").value = { value: btoa(password[1]), valid: true, order: 3 }
game.getItem("item-4").value = { value: btoa("s"), valid: false, order: 4 }
game.getItem("item-5").value = { value: btoa("a"), valid: false, order: 5 }
game.getItem("item-6").value = { value: btoa(password[2]), valid: true, order: 6 }
game.getItem("item-7").value = { value: btoa(password[3]), valid: true, order: 7 }
game.getItem("item-8").value = { value: btoa(password[4]), valid: true, order: 8 }

