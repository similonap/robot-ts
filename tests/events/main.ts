import { game } from "circuit-crawler";

async function main() {
    const robot = game.getRobot("EventBot");
    console.log("Starting Event Test...");

    let pickedUpItemName = "";

    robot.addEventListener('pickup', (item) => {
        console.log("Event: pickup triggered!");
        console.log("Item Type: " + (typeof item));
        console.log("Item Name: " + item.name);
        pickedUpItemName = item.name;
    });

    // Move to item at 2, 1
    await robot.moveForward();

    // Pickup
    await robot.pickup();

    if (pickedUpItemName === "Test Apple") {
        console.log("✅ Success: Event listener received correct item.");
        game.win("Event test passed");
    } else {
        game.fail(`❌ Failed: Expected 'Test Apple', got '${pickedUpItemName}'`);
    }
}
