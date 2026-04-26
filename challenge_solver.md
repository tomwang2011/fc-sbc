# Challenge Solver Architecture

This document defines the strategic logic for solving high-constraint SBCs using a weighted backtracking algorithm.

## 1. Core Chemistry Rules (Thresholds)
| Points | Club | Nation | League |
| :--- | :--- | :--- | :--- |
| **+1** | 2 Players | 2 Players | 3 Players |
| **+2** | 4 Players | 5 Players | 5 Players |
| **+3** | 7 Players | 8 Players | 8 Players |

*Note: Players MUST be in position to contribute or receive chemistry.*

---

## 2. Solver Archetypes

The solver identifies the SBC "Archetype" based on the `SbcSummary` and switches its heuristic scoring accordingly.

### Archetype A: The Hybrid (High Chem + High Diversity)
*   **Detection:** `minChem > 20` AND `minTotalNations > 2`.
*   **Strategy:** "Club-Triad Efficiency".
*   **Heuristic Logic:**
    *   **The Triad (+15,000):** Prioritize getting a Club to 2 players (+1 chem) and then a 3rd player (+1 league chem).
    *   **Nation Offset (+8,000):** Within a Club block, heavily favor players from a **different Nation** than those already in the block. This satisfies the "Min Total Nations" requirement without sacrificing the Club chemistry engine.
    *   **League Pivot:** Favor a second Club block from the *same league* to trigger the 3-player league threshold (+1 chem) across the squad.

### Archetype B: The Stack (High Chem + Low Diversity)
*   **Detection:** `minChem > 20` AND `minTotalNations <= 2`.
*   **Strategy:** "One-League Steamroll".
*   **Heuristic Logic:**
    *   **Density Bonus (+10,000):** Continuously reward adding players from the dominant League/Nation.
    *   **Threshold Chasing:** Aim for the 5-player (+2 chem) and 8-player (+3 chem) breakpoints for League and Nation.

### Archetype C: The Rainbow (Low Chem + Max Diversity)
*   **Detection:** `minChem <= 15` AND `minTotalNations > 5`.
*   **Strategy:** "Scatter Fill".
*   **Heuristic Logic:**
    *   **Anti-Synergy (+10,000):** Reward players from Nations/Leagues/Clubs that are **not** yet present in the squad.
    *   **Rating Bottom-Feed:** Use the lowest possible ratings to preserve high-rated fodder for other segments.

### Archetype D: The Cluster (Forced Consolidation)
*   **Detection:** `maxTotalClubs < 11` OR `maxTotalLeagues < 11`.
*   **Strategy:** "Consolidation Loop".
*   **Heuristic:**
    *   Extreme penalty (-20,000) for adding a new Club/League if `currentTotal >= maxTotal`.
    *   Massive bonus (+10,000) for players from already-present Clubs/Leagues.
    *   This archetype overrides HYBRID if the club limit is tight (<= 5).

---

## 3. Backtracking Heuristic Scoring
The `ChallengeSolver` uses a `score` to rank candidates for each slot.

```typescript
score = (SeedMatch * 20000) + (BreakpointBonus) + (ArchetypeBonus) + (PositionBonus) - (ConstraintPenalty)
```

### Breakpoint Bonuses (Dynamic)
*   **Club (1 -> 2):** +5,000 (Hits +1 Chem).
*   **Nation (1 -> 2):** +4,000 (Hits +1 Chem).
*   **League (2 -> 3):** +4,000 (Hits +1 Chem).
*   **Club (3 -> 4):** +3,000 (Hits +2 Chem - *Requires 4 players*).

### Constraint Penalties
*   **Diversity Violation:** If `currentTotalNations >= maxTotalNations`, penalize any NEW nation by -10,000.
*   **Max Same Violation:** If `currentSameLeague >= maxSameLeague`, penalize that league by -10,000.

---

## 4. Operational Flow
1.  **Phase 1: Seed Placement.** Force-place players that satisfy "Specific Entity" requirements (Milano, Juventus, etc.).
2.  **Phase 2: Overlap Discovery.** Identify the best Nation/League "Anchor" from the inventory.
3.  **Phase 3: Archetype Selection.** Determine the solver strategy (Hybrid, Stack, or Rainbow).
4.  **Phase 4: Weighted Backtracking.** Execute DFS with forward-pruning based on the selected heuristic.
