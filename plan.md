# Project Brief: Enhanced SBC Solver (Tampermonkey)

**Objective:** Create a TypeScript-based Tampermonkey script to run alongside Paletools that provides a "Better Builder" logic, specifically targeting optimal player selection and SBC Storage utilization.

## Core Tech Stack
- **Language:** TypeScript (compiled via esbuild/Vite)
- **Frontend:** Preact + Tailwind CSS (Injected via Shadow DOM)
- **Target:** EA FC Web App (Mobile/Desktop)

## Key Functionalities
- **Storage-First Priority:** Logic must prioritize items in the "SBC Storage" and "Unassigned" (duplicates) piles before touching the main Club inventory.
- **Constraint-Based Solver:** Replace simple "lowest-to-highest" sorting with an algorithm that hits exact rating targets (using the 84.x formula) and satisfies chemistry/league requirements.
- **Safety Filters:** Explicit "Protected" list to exclude active squad members, high-value tradeable cards, and specific assetIds.
- **Paletools Coexistence:** The script will hook into `window.g_services` and `repositories.ItemRepository`, injecting a custom "🚀 Enhanced Build" button next to existing Paletools menus.

## Development Milestones

### Milestone 1: Hello World & Tampermonkey Setup
- [x] Initialize project with Vite + Preact + Tailwind.
- [x] Successfully load the script in EA FC Web App.
- [x] Verify "Hello World" or initial log in the browser console.
- [x] Ensure Shadow DOM injection works without breaking the main UI.

### Milestone 2: Data Access & Club Inventory
- [x] Hook into `window.repositories.Item`.
- [x] Successfully extract players from:
    - Main Club Inventory
    - SBC Storage
    - Unassigned Pile (Duplicates)
- [x] Log the total player count and verify player object properties.

### Milestone 3: UI Integration
- [x] Inject a standalone "🚀 OPEN SBC BUILDER" button.
- [ ] Create a basic settings modal/panel for the builder.
- [ ] Implement the "Protected" list UI (selecting players to exclude).

### Milestone 4: SBC Requirement Extraction
- [x] Hook into the active SBC challenge context (`UTSBCSquadSplitViewController`).
- [x] Extract current challenge properties (Name, Slots).
- [x] Implement basic "Add Player to Slot" functionality.

### Milestone 5: The "Better Builder" Logic (Core Solver)
- [ ] Implement the 84.x rating formula.
- [ ] Develop the constraint-based solver (prioritizing Storage/Unassigned).
- [ ] Optimize player selection to hit exact rating targets.
- [ ] Handle basic chemistry/league requirements.

### Milestone 6: Safety & Refinement
- [ ] Implement rigorous safety filters (Active Squad, High-Value, Protected List).
- [ ] Add "Simulation Mode" to see results before applying changes.
- [ ] Finalize the "Apply to Squad" logic via `g_services.Sbc.repository`.

### Milestone 7: Testing & Packaging
- [ ] Mobile testing on OnePlus 15 via Kiwi Browser.
- [ ] Final build optimization and optional Android WebView wrapping.
