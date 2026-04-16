# EA FC Club Scan & Inventory Technical Findings

Accessing the full club inventory is the most critical step for an SBC solver. The EA FC Web App lazy-loads players, meaning `repositories.Item.getClub()` usually only contains players currently "visible" or recently loaded.

## 1. Inventory Sources
There are three main locations where players reside:
*   **Club Repository:** `win.repositories.Item.getClub().items`
*   **SBC Storage:** `win.repositories.Item.getStorage().items`
*   **Unassigned (Duplicates):** `win.repositories.Item.unassigned` (or `win.services.Item.getUnassignedItems()`)

## 2. Paletools "Deep Scan" Discovery (V11+)
Through reverse-engineering of the Club Analyzer, we've identified the optimal parameters for a fast, reliable full-club scan:

### The "Paletools Pattern"
Paletools does not search by "Quality" (Gold/Silver). Instead, they search the entire range using Rating (OVR) as the primary index.

**Optimal Search Criteria:**
```javascript
const criteria = new win.UTSearchCriteriaDTO();
criteria.type = 'player';
criteria.count = 150; // Paletools uses 150 (not 200) for stability
criteria.sortBy = "ovr"; // CRITICAL: Sorts by rating
criteria._sort = "desc"; // Paletools uses descending (highest first)
criteria.ovrMin = 45;
criteria.ovrMax = 99;
```

## 3. Incremental Updates via "Most Recent"
To avoid doing a full 4000-player scan every time, we can use the "Recent" sort to only fetch players acquired since the last scan.

### The "Incremental" Logic
1.  Fetch the first page (150 players) using `criteria.sortBy = "recent"`.
2.  Iterate through the results.
3.  If a `player.id` is found that is already in our `_clubPlayersMemory`, **STOP**. All players after this point are already known.
4.  If not found, fetch the next page and continue.

## 4. Intelligent Targeted Searching
Instead of a 10-minute full scan, we can perform "Surgical Scans" based on SBC requirements:

| Requirement | Criteria Property | Example |
| :--- | :--- | :--- |
| **Premier League** | `criteria.league = 13` | Fetches *only* EPL players |
| **England** | `criteria.nation = 14` | Fetches *only* English players |
| **TOTW** | `criteria.rarities = [3]` | Fetches *only* Team of the Week items |

## 5. Player Insertion (Verification)
To make insertions stick and pass server-side validation:
1.  **Method:** `squad.setPlayers(newPlayersArray)` (Array size 23).
2.  **Persistence:** `services.SBC.saveChallenge(challenge)`.
3.  **UI Sync:** `overviewController._pushSquadToView(squad)`.

## 6. Performance Strategy: "Session Persistence"
To avoid redundant scans:
*   Store the results in a global variable: `window._clubPlayersMemory`.
*   Check if memory exists before triggering a new scan.
*   Use "Incremental Update" (Recent) first, and only fall back to "Full Scan" (OVR) if memory is empty.
