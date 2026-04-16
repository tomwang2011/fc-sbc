# SBC Rating Optimization: The "84.x" Logic

This document outlines the mathematical formula used by EA FC for squad ratings and the optimal strategy for hitting targets efficiently.

## 1. The Formula (11-Player Squad)
The rating is not a simple average. It uses a **Correction Factor (CF)** to reward squads with high-rated "anchors."

1.  **Initial Sum:** Add the ratings of all 11 players.
2.  **Average (A):** `Initial Sum / 11`.
3.  **Correction Factor (CF):** For every player with a rating `R > A`, add `(R - A)` to a running total.
4.  **Final Sum:** `Initial Sum + CF`.
5.  **Final Decimal:** `Final Sum / 11`.
6.  **Rounding:** Apply the **.96 Rule**. (e.g., 83.96 rounds to 84, 83.95 stays 83).

## 2. Optimization Strategy: BFS vs. DFS

### DFS (Depth-First Search) - AVOID
*   **Behavior:** Pick one player and upgrade them to the maximum (e.g., 82 -> 90) before touching others.
*   **Result:** Wastes high-rated cards prematurely and often overshoots the target significantly.

### BFS (Breadth-First Search) - PREFERRED
*   **Behavior:** Increment the entire squad's rating horizontally. 
*   **Logic:**
    1.  Start with the lowest possible players that meet requirements.
    2.  Identify the player with the lowest rating in the squad.
    3.  Upgrade them by the **smallest possible increment** (e.g., +1 rating point) using the pool.
    4.  Recalculate and repeat.
*   **Result:** Hits the target rating with the absolute minimum "Sum of Ratings," preserving your highest-value cards for more difficult SBCs.

## 3. The "Top-Heavy" Advantage
Because of the Correction Factor, it is often cheaper to use **two high-rated players** (anchors) and **nine low-rated players** than to use eleven mid-rated players.
*   *Example (84 Rating):* Two 85s + Nine 83s is often cheaper than Eleven 84s.

## 4. Implementation Goals for V21
1.  **Duplicate Player Prevention:** Track used players by `definitionId` (or `defId`), not just the unique instance `id`. This prevents adding two different versions (e.g., Base and Evolution) of the same player to the same squad.
2.  **Ignore Evolutions & Loans:** Temporarily exclude Evolution players and all Loan players from the pool to avoid "Duplicate" errors and accidental usage of non-permanent items.
3.  **Small Jumps:** Limit upgrades to +1 or +2 points per swap during the balancing phase.
4.  **Round-Robin:** Ensure every slot has a chance to be upgraded before a single slot is upgraded twice.
