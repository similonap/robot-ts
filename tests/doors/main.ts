import { game } from "circuit-crawler";

async function main() {
    const robot = game.getRobot("Tester");
    robot.setSpeed(1);
    console.log("Starting Door Tests...");

    // 1. Normal Door at (2, 1)
    console.log(`[1] Approach Normal Door at (2,1). Current: ${robot.position.x}, ${robot.position.y}`);
    // Robot is at 1,1 facing East. Door is at 2,1. 
    // We are ADJACENT to door. We can just open it.

    // Scan to confirm door
    const scan1 = await robot.scan();
    // In robot-api scan returns object, checking type or just assuming

    console.log("Attempting to open normal door...");
    const res1 = await robot.openDoor();
    if (res1.success) console.log("✅ Success: Opened normal door");
    else game.fail("Failed to open normal door: " + res1.message);

    await robot.moveForward(); // Move into door (2,1)
    await robot.moveForward(); // Move to (3,1)

    // 2. Password Door at (4,1)
    console.log(`[2] Approach Password Door at (4,1). Current: ${robot.position.x}, ${robot.position.y}`);
    // Blocked by door (4,1). We are at (3,1) facing East.

    // Try opening without password (should fail)
    console.log("Attempting to open password door WITHOUT password...");
    const res2Fail = await robot.openDoor();
    if (!res2Fail.success) console.log("✅ Verified: Cannot open password door without password");
    else game.fail("Should not open password door without password!");

    // Try with wrong password
    const res2Wrong = await robot.openDoor("wrong");
    if (!res2Wrong.success) console.log("✅ Verified: Cannot open password door with wrong password");
    else game.fail("Should not open password door with wrong password!");

    // Try with correct password
    console.log("Attempting to open password door with '1234'...");
    const res2 = await robot.openDoor("1234");
    if (res2.success) console.log("✅ Success: Opened password door");
    else game.fail("Failed to open password door: " + res2.message);

    await robot.moveForward(); // Move into door (4,1)
    await robot.moveForward(); // Move to (5,1). Item "key-card" is here.

    // 3. Item Door at (6,1)
    console.log(`[3] Approach Item Door at (6,1). Current: ${robot.position.x}, ${robot.position.y}`);

    // Pickup key
    console.log("Picking up key...");
    const key = await robot.pickup();
    if (key && key.id === 'key-card') console.log("✅ Success: Picked up Key Card");
    else game.fail("Failed to pick up key card");

    // Try opening without providing item (should fail even if we have it? depends on API)
    // API: openDoor(key) -> key can be item object. If undefined, checks empty?
    // robot-api logic: if door.lock.type === 'item', checks provided items.

    console.log("Attempting to open item door WITHOUT providing item...");
    const res3Fail = await robot.openDoor();
    if (!res3Fail.success) console.log("✅ Verified: Cannot open item door without providing item");
    else game.fail("Should not open item door without providing item!");

    // Open with item
    console.log("Attempting to open item door WITH Key Card...");
    const res3 = await robot.openDoor(key);
    if (res3.success) console.log("✅ Success: Opened item door");
    else game.fail("Failed to open item door: " + res3.message);

    await robot.moveForward(); // Move into door (6,1)

    game.win("All door tests passed!");
}
