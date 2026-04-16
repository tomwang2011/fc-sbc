# FC-SBC Builder: Project Progress & V44 Summary

This document serves as the "source of truth" for the current state of the Enhanced SBC Solver.

## 🚀 Current Stable Version: V46 (Surgical Lockdown)
Transitioning to V46 to enforce strict metadata filtering and storage prioritization.

### Key Discoveries & Features:
1.  **SBC Storage Integration:**
    *   **Method:** Uses `services.Item.searchStorageItems()` to fetch duplicate piles.
    *   **Priority:** Solver now prioritizes `itemType: 'sbcstorage'` items over club items for the same rating.
2.  **Surgical Lockdown (V46):** 
    *   **Logic:** Re-implementing strict filters: `subtype === 1`, `limitedUseType === 0`, and `upgrades === null`.
    *   **Safety:** Ensures zero "Special/Loan/Evo" infiltration.
3.  **Entity-First Harvesting:**
    *   Priming now runs parallel searches for Club and Storage.

## 🛠️ Key Files
*   **`discover.js`**: The main engine (V46).
*   **`milestones/milestone_5.md`**: Research and implementation plan for Storage-First logic.

## ⏭️ Next Steps
*   [ ] **V46 Deployment:** Finalize the "Surgical Lockdown" in `discover.js`.
*   [ ] **Incremental UI:** Port V46 logic into the React/Tailwind UI (`App.tsx`).
