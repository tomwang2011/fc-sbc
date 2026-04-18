# Challenge Solver Pseudocode (Current V5 Logic)

This document describes the internal logic of the backtracking CSP solver as of Milestone 11 V5.

## 1. Requirement Parsing
*   **Constants:** Extracts Target Rating (Key 19), Target Chem (Key 35), Min Gold (Key 17), Min Rare (Key 25).
*   **Diversity Limits (MAX):** Maps Keys 5, 9, 6, 10, 7, 12 based on `scope: 1` or specific values like `-1` to `maxSameNation`, `maxSameLeague`, `maxSameClub`.
*   **Hard Requirements (MIN):** Identifies "ID Sets" (e.g., [PSG, Lyon]) and required counts. Stores them as a list of `hardReqs`.

## 2. Inventory Discovery
*   Performs a multi-axis sync:
    *   Broad Club search.
    *   Targeted search for major leagues (PL, LaLiga, etc.).
    *   SBC Storage search.
*   **Filters:** Untradeable only, no Evos, rating < 88.

## 3. Trial Generation (The "Anchor" Loop)
*   Analyzes the pool to find the most abundant **Leagues** and **Nations**.
*   Creates a list of trials, where each trial treats one League or Nation as the "Chemistry Core".
*   *Current Order:* Trial 1 = League 31 (Serie A), Trial 2 = League 53 (LaLiga), etc.

## 4. Backtracking Search (`solve(idx)`)
*   **Recursive Depth:** 0 to 10 (11 players).
*   **State Tracking:** Tracks used IDs, used Persona IDs, counts per club/nation/league, and how many `hardReqs` are currently fulfilled.
*   **Validation (`isValid`):**
    *   Checks if adding player `P` violates `maxSameNation`, `maxSameLeague`, or `maxSameClub`.
    *   **Pruning:** If (Required Seeds - Fulfilled) > remaining slots, returns `false` immediately.
    *   **Quality Gates:** Checks if enough slots remain to hit Min Gold/Min Rare targets.
*   **Heuristic Candidate Scoring:**
    *   Sorts all valid players in the pool by a score:
        *   **+5000:** Player satisfies a pending `hardReq`.
        *   **+100:** Player matches the trial's "Chemistry Core" (League or Nation).
        *   **+50:** Player matches the slot's preferred position.
    *   Takes the **top 15** scored candidates and tries them one by one.
*   **Base Case (Depth 11):**
    *   Calculates final Chemistry and Rating.
    *   If `Chem >= Target` AND `Rating >= Target`, returns `true` (Success).

## 5. Persistence
*   The trial with the highest chemistry that meets all requirements is selected.
*   The squad is pushed to the game view and synced to the server.

---

# Phase II: The Overhaul (Human Logic Walkthrough)

## Step 3: Branched Execution (Bucket B Strategy)
... (rest of Bucket B)

## Step 4: Branched Execution (Bucket A Strategy)
... (rest of Bucket A)

## Step 5: Downward Fodder Optimization (The "Cheapener")
... (rest of Step 5)

---

# Core Engine Mandate: Live Requirement Tracking
*   **The Golden Rule:** Never treat requirements as a post-build validation check.
*   **Implementation:**
    *   Initialize a `State` object containing: `remainingHardSeeds`, `currentTotalNations`, `currentTotalLeagues`, `countPerClub`, etc.
    *   **Every single insertion** must trigger a `State.update()` call.
    *   The `score` of every candidate player is calculated dynamically based on the **Current State** (e.g., if you only have 1 nation slot left, any player from a new nation gets a -10000 score).
    *   This makes the solver "Self-Correcting" as it grows.

