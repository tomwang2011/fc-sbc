# Project Brief: Enhanced SBC Solver (Tampermonkey)

**Objective:** Create a TypeScript-based Tampermonkey script to run alongside Paletools that provides a "Better Builder" logic, specifically targeting optimal player selection and SBC Storage utilization.

## 🏆 Current Progress: Milestone 5 Complete
We have mastered **SBC Storage** and **Unassigned Priority**. We can now identify and prioritize duplicates for building squads.

## Development Milestones

### ✅ Milestone 1: Search & Insertion Foundations
- [x] **Discovery:** Identified official search criteria flags.
- [x] **Bulk Insertion:** Successfully mapped and inserted 23 players into SBC slots.

### ✅ Milestone 2: Universal Positioning & Chemistry Maxing
- [x] **Universal Normalization:** Created dynamic mapping that works for any formation.
- [x] **Starting 11 Focus:** Restricted auto-filling to the starting XI.
- [x] **Service Fix:** Implemented "Challenge Stitching" to ensure server-side saving.

### ✅ Milestone 3: Requirement Awareness & Multi-Stage Solving
- [x] **Rule Detection:** Automatically detects TOTW and other rarity requirements.
- [x] **Multi-Stage Priming:** Combines specialized "SP" searches with standard "Gold" searches.

### ✅ Milestone 4: 84.x Rating Engine & Strategy-Aware Solver
- [x] **Rating Math:** Implemented the Correction Factor weighted average formula.
- [x] **BFS Optimizer:** Created a loop to hit exact rating targets.
- [x] **Asset Locking:** Protected mandatory players from being upgraded away.

### ✅ Milestone 5: SBC Storage & Unassigned Priority
- [x] **SBC Storage Hook:** Prioritize items in the "SBC Storage" repository.
- [x] **Unassigned Logic:** Check the "Unassigned" pile for duplicates.
- [x] **Duplicate Management:** Prevent same `definitionId` twice in one squad.

### 📍 Milestone 6: Hybrid Solver & Requirement Synthesis
- [ ] **Unified Hybrid Pool:** Seamlessly merge Storage and Club players into a single, priority-sorted list.
- [ ] **Storage-First Mandatory Logic:** Hitting "Min. 1 TOTW" or "Min. 1 PL Player" using Storage assets before Club.
- [ ] **Refined BFS Optimization:** Favoring Storage swaps over Club swaps to hit rating targets.

### 📅 Milestone 7: UI & Settings
- [ ] **Builder Panel:** Inject a clean UI to trigger the solver and view potential results.
- [ ] **Protection Logic:** Select players or rating ranges the solver must NEVER touch.

### 📅 Milestone 8: Refinement & Advanced Chemistry
- [ ] **Chemistry Awareness:** Basic logic to satisfy "Min Chemistry" or "Exact League" requirements.
- [ ] **Performance:** Handle massive clubs with 1000+ players efficiently.
