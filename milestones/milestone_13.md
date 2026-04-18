# Milestone 13: Chemistry-Optimized CSP Engine

## Objective
To overhaul the squad building process to prioritize chemistry more effectively, ensuring the solver reaches high chemistry targets (20+) without exhaustive, random backtracking.

## The Strategy: "Proximity & Link" Building
Current solvers build 0-11 in slot order. To maximize chemistry, we should build in a way that respects "Links" (Club, Nation, League).

1.  **Anchor Picking:**
    *   Pick a high-rated "Anchor" from the required seeds or the core league.
    *   Place them in a slot.
2.  **Breadth-First Chemistry (BFC):**
    *   Instead of Slot 1 -> Slot 2 -> Slot 3, the solver should pick the "next best slot" based on chemistry links to already placed players.
    *   Example: If we place a French ST from Ligue 1, the next slots evaluated should be LW, RW, or CM to maximize immediate links.
3.  **Heuristic Scoring Overhaul:**
    *   Increase the weight of "Same Club" (3 pts) and "Same Nation" (1 pt) and "Same League" (1 pt) in the candidate ranking.
    *   Prioritize players that complete a "Chemistry Dot" (thresholds: 2, 4, 7 for Club; 3, 6, 9 for Nation; 3, 5, 8 for League).
4.  **Target-Aware Early Pruning:**
    *   If current chemistry is 5 at depth 8, and the target is 22, it's mathematically impossible to reach (max 3 chem per remaining slot = 5 + 9 = 14).
    *   Add `maxPotentialChem` calculation to prune branches early.

## Status: PLANNED
- [ ] Research `squad.getChemistry()` performance and potential local simulation.
- [ ] Implement BFC slot ordering.
- [ ] Implement `maxPotentialChem` lookahead.
- [ ] Create `milestone_13.js` for testing.
