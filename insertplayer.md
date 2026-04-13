# SBC Player Insertion: Technical Findings

Through reverse-engineering of Paletools and deep-probing of the EA FC Web App internal services, we have identified the most robust method for inserting players into SBC challenges.

## 1. The Core Problem
Traditional methods of individual slot manipulation (e.g., `slot.setItem(player)`) are often inconsistent. They may update the UI temporarily but fail to persist to the server, or trigger internal type errors (like `t.isPlayer is not a function`) because the app expects a specific wrapper state that is hard to replicate manually.

## 2. The "Pure Item" Bulk Update Method
The most reliable method, used by Paletools, is a bulk update of the entire squad array using the `setPlayers` method on the `UTSquadEntity`.

### Key Characteristics:
*   **Target Method:** `squad.setPlayers(playersArray)`
*   **Array Structure:** An array of exactly **23 elements**.
*   **Payload Content:**
    *   **Filled Slots:** Must contain the raw **`UTItemEntity`** object (directly from the Item Repository). **Do not** use `UTSquadPlayerEntity` or other wrappers.
    *   **Empty Slots:** Must be **`null`**.
*   **Indexing:** The position in the array must match the `index` property of the corresponding `SBCSlot`. 
    *   *Note:* In "Player Pick" SBCs, slots often start at index 5.

## 3. Implementation Workflow

To successfully insert a player and ensure it "sticks," the following sequence must be observed:

1.  **Extract Challenge Context:** Find the `UTSBCSquadSplitViewController` to get references to the `_squad`, the `_challenge`, and the `_overviewController`.
2.  **Prepare the Array:**
    ```javascript
    const newPlayers = new Array(23).fill(null);
    // 1. Map existing players back to raw items
    squad._players.forEach((p, i) => {
        const item = p.getItem ? p.getItem() : (p.item || null);
        if (item) newPlayers[i] = item;
    });
    // 2. Insert new raw player items at the desired indices
    newPlayers[targetIndex] = rawPlayerItem;
    ```
3.  **Execute Update:** Call `squad.setPlayers(newPlayers)`.
4.  **Notify System:** Call `squad.onDataUpdated.notify()`.
5.  **Persist to Server:** Call `services.SBC.saveChallenge(challenge)`. Without this, the change will disappear on the next page refresh or when submitting.
6.  **Force UI Refresh:** Call `overviewController._pushSquadToView(squad)`. This forces the React/Angular layer to re-render the slots with the new data.

## 6. Reading SBC Requirements (The Logic)

To programmatically determine the rules for any SBC, follow this hierarchy:

### A. Squad-Level (Global) Constraints
Found in `challenge.eligibilityRequirements`.
*   **Item Rarity (Rare/Common):** Look for Key `25`. Value `4` = Rare, `0` = Common.
*   **Player Quality (Gold/Silver/Bronze):** Look for Key `3`. Value `3` = Gold, `2` = Silver, `1` = Bronze.
*   **Squad Rating:** Look for Key `19`. Value = The minimum rating target (e.g., `84`).
*   **Team of the Week (TOTW):** Look for Key `18`. Value `3` = TOTW. (Verified in "Top Form" challenge).
*   **League:** Look for Key `11`. Value = League ID (e.g., `13` = Premier League, `53` = La Liga EA SPORTS).

## 7. Next Steps & TODOs
*   **[CRITICAL] Automated Inventory Loading:** Our current script only sees players already loaded into the browser memory (usually ~250). Paletools somehow triggers a background search to fetch the entire club. We need to find the specific `services.Club.search` or `repositories.Item` call they use to "prime" the inventory.
*   **Constraint-Based Logic:** Implement a solver that picks exactly the minimum number of required special items (TOTW, High Rarity) and fills the rest with the lowest-rated "trash" to meet the rating target.
*   **Chemistry:** Look for `chemistry` or `links` properties.

### B. Slot-Specific Constraints
Found in `squad.getSBCSlots()[i].requirement`.
*   **Unrestricted:** If the `requirement` exists but `kvPairs` is empty (`{}`), the slot is **unrestricted** (any player meeting global rules fits).
*   **Restricted:** If `kvPairs` contains keys (e.g., Key `6` for Position), the player must match that specific attribute.

### C. Total Player Count
*   Determined by the number of "Active" slots (those where `isBrick()` is false and index is within the valid squad range).
*   In Player Picks, this is typically **6 slots**.
*   In full squads, this is **11 slots**.
