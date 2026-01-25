import { game } from "circuit-crawler";

async function main() {
    const robot = game.getRobot("EventBot")!;
    console.log("Starting Event Test...");

    let pickedUpItemName = "";

    robot.addEventListener('pickup', (item) => {
        console.log("Event: pickup triggered!");
        console.log("Item Type: " + (typeof item));
        console.log("Item Name: " + item.name);
        pickedUpItemName = item.name;
    });

    // --- New Event Tests ---
    let plateSteppedOn = false;
    let plateLeft = false;
    let coinCollected = false;

    // Test 1: getItem(id).addEventListener('move') and 'leave'
    const plate = game.getItem("plate");
    if (plate) {
        plate.addEventListener('move', (pos) => {
            console.log(`Event: Something stepped on plate at ${pos.x}, ${pos.y}!`);
            plateSteppedOn = true;
        });
        plate.addEventListener('leave', (pos) => {
            console.log(`Event: Something LEFT plate at ${pos.x}, ${pos.y}!`);
            plateLeft = true;
        });
    } else {
        console.log("❌ Failed: Could not find 'plate' item.");
    }

    // Test 2: getItemOnPosition(x,y).addEventListener('pickup')
    const coin = game.getItemOnPosition(4, 1);
    if (coin) {
        coin.addEventListener('pickup', (item) => {
            console.log(`Event: ${item.name} was picked up!`);
            coinCollected = true;
        });
    } else {
        console.log("❌ Failed: Could not find item at 4,1");
    }

    // Execute Actions

    // 1. Pickup Apple (Original Test)
    // Move to item at 2, 1
    await robot.moveForward();
    // Pickup
    await robot.pickup();

    if (pickedUpItemName !== "Test Apple") {
        game.fail(`❌ Failed: Expected 'Test Apple', got '${pickedUpItemName}'`);
        return;
    }

    // 2. Step on Plate
    // Move to 3,1
    await robot.moveForward();
    // Should trigger 'move' event on plate immediately upon arrival (no wait needed? Controller calls it)

    if (!plateSteppedOn) {
        game.fail("❌ Failed: Plate 'move' event did not fire.");
        return;
    }

    // 3. Pickup Coin (Leaving the Plate)
    // Move to 4,1
    await robot.moveForward();

    if (!plateLeft) {
        game.fail("❌ Failed: Plate 'leave' event did not fire.");
        return;
    }

    await robot.pickup();

    if (!coinCollected) {
        game.fail("❌ Failed: Coin 'pickup' event did not fire.");
        return;
    }

    console.log("✅ Success: All event listeners fired correctly.");
    game.win("Event test passed");
}
