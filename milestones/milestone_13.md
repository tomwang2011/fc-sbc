# Milestone 13: The "Delta Chemistry" Optimizer

## Background & Motivation
The current solver treats chemistry as an afterthought—it tries to build a valid structural squad and only at the very end (Depth 11) calls the game's `squad.getChemistry()` to see if it passed. This leads to massive failure rates (30,000+ iterations) for Chemistry-focused "Bucket B" SBCs, because the solver blindly places players without knowing if they are contributing to the chemistry goal.

Furthermore, the concept of "positional links" (e.g., ST linking to LW/RW) is obsolete in modern FC (24/25/26) chemistry. Chemistry is now **Global**, meaning a GK and ST from the same club link perfectly. 

## Proposed Solution: Fast Local Simulation & Delta Scoring

1. **Local Chemistry Simulator (LCS):**
   *   Calling EA's `squad.getChemistry()` is expensive and requires mutating the squad object.
   *   We will implement a lightweight JS function `calculateLocalChem(selectedItems)` that instantly computes chemistry using the modern FC thresholds:
       *   **Club:** 2 players (+1), 4 players (+2), 7 players (+3).
       *   **League:** 3 players (+1), 5 players (+2), 8 players (+3).
       *   **Nation:** 2 players (+1), 5 players (+2), 8 players (+3).
   *   *Rule:* Players only contribute to and receive chemistry if they are placed in their **Preferred Position** (or recognized alternate, though we'll stick to strict mapping for SBCs).

2. **Early Pruning (The Math Lookahead):**
   *   At any depth, we calculate `currentChem = calculateLocalChem(selected)`.
   *   The maximum possible chemistry we can add is `remainingSlots * 3`.
   *   If `currentChem + (remainingSlots * 3) < targetChem`, we immediately prune the branch. This will eliminate 99% of dead-end searches instantly.

3. **Delta Chemistry Candidate Scoring (The "Greedy Chem" Heuristic):**
   *   Instead of arbitrary heuristic points (+100 for core, +5000 for seed), we score non-seed candidates by their **Delta Chem**.
   *   `Delta Chem = calculateLocalChem(State + Candidate) - calculateLocalChem(State)`.
   *   *Example:* If adding a LaLiga player pushes the LaLiga count from 2 to 3, it gives that player +1 chem, and also gives the 2 existing LaLiga players +1 chem each. The Delta Chem is +3.
   *   Sort candidates by `Delta Chem` (Descending), then by Rating. This ensures the solver always makes the most chemically-efficient move possible.

4. **Bucket B Integration:**
   *   This logic completely replaces the "Trial Core League" guessing game. We no longer need to blindly force a "Serie A" core. The Delta Chem heuristic will naturally snowball around whatever league/nation the mandatory Seeds belong to, organically building a high-chem squad.

## Alternatives Considered
*   **Positional Link Graphs:** As noted, this is obsolete for modern FC chemistry and would unnecessarily complicate the backtracking order. Linear filling (Slot 0 to 10) is perfectly fine if the heuristic accurately scores global chemistry thresholds.

## Verification
*   Test on a Bucket B challenge requiring 20+ chemistry.
*   Verify that `calculateLocalChem` matches `squad.getChemistry()`.
*   Ensure iteration counts drop from 30,000+ down to < 5,000 due to aggressive Early Pruning and Delta Chem sorting.