# SBC Player Insertion: Verified Technical Logic

This document outlines the exact, verified method for programmatically inserting players into SBC slots in the EA FC Web App.

## 1. The Core Update Method
The only reliable way to update the SBC grid is a bulk replacement of the squad array.

### Method Signature
`squad.setPlayers(playersArray)`

*   **Array Size:** Exactly **23**.
*   **Content:** Raw `UTItemEntity` objects at the correct indices, and `null` for empty slots.
*   **Indices:** Use `slot.index` from the `SBCSlot` object.

## 2. The Implementation Sequence

```javascript
// 1. Find the Controller & Context
const controller = findSbcController(win.getAppMain().getRootViewController());
const squad = controller._squad;
const challenge = controller._overviewController._challenge;

// 2. Prepare the 23-slot array
const newPlayers = new Array(23).fill(null);

// 3. Map existing players (Optional: to keep what's already there)
squad._players.forEach((p, i) => {
    const item = p.getItem ? p.getItem() : (p.item || null);
    if (item) newPlayers[i] = item;
});

// 4. Identify Target Slots
const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick());

// 5. Insert New Players
// Example: Adding 'bestPlayer' to the first empty active slot
const targetSlot = activeSlots.find(s => !newPlayers[s.index]);
if (targetSlot) {
    newPlayers[targetSlot.index] = bestPlayerRawItem;
}

// 6. Apply & Persist
squad.setPlayers(newPlayers);
squad.onDataUpdated.notify(); // Triggers internal validation
win.services.SBC.saveChallenge(challenge).observe(this, (obs, res) => {
    console.log("Server Persistence:", res.success);
});
controller._overviewController._pushSquadToView(squad); // Force UI Re-render
```

## 3. Important Discoveries
*   **Bricks:** Always check `slot.isBrick()`. Attempting to put a player in a brick slot will cause a server error on save.
*   **UI Sync:** Without `_pushSquadToView`, the players might be "in" the squad but the cards won't appear on the screen until you manually click a slot.
*   **Controller Pathing:** The `UTSBCSquadSplitViewController` is nested deep. A recursive search through `childViewControllers` and `presentedViewController` is the most reliable way to find it.
