# Milestone 10: Challenge & Marquee Matchup Solver (CSP Engine)

## The Objective
To create an intelligent solver for "Challenge" and "Marquee Matchup" (MM) SBCs. These SBCs involve complex, overlapping **Constraint Satisfaction Problems (CSPs)** rather than simple "bucket filling".

## The Challenge
Unlike League SBCs (specific league) or De-Cloggers (specific rating), MM SBCs have rules like:
1.  **Specific Entities:** "Min 1 player from [Club A] OR [Club B]"
2.  **Diversity:** "Min 4 Leagues" or "Min 3 Nations"
3.  **Limits:** "Max 5 players from the Same Nation"
4.  **Thresholds:** "Min Team Chemistry: 14", "Min Squad Rating: 75"

## The Architecture: A 4-Phase Constraint Engine

### Phase 1: The Core Requirements (The "Seeds")
- Identify "Specific Entity" requirements (Clubs, Nations, Leagues).
- Perform targeted discovery searches for these players.
- Insert these "Seed" players first to guarantee the most difficult rules are met.

### Phase 2: Core League Identification (The "Chem Engine")
- Analyze the inventory pool to find the "Abundant League"—the league with the highest count of low-rated untradeable players that doesn't violate the SBC's max-constraints.
- This league will serve as the "Chemistry Core."

### Phase 3: Targeted Filling
- Attempt to fill empty slots using players from the "Abundant League" to maximize chemistry.
- For each insertion, perform a real-time `isMoveValid()` check to ensure diversity rules (e.g., Max 4 from same club) aren't broken.

### Phase 4: The Optimization Bridge (Rating & Chem)
- **Position Shuffle:** Shuffle the 11 selected players across slots to find the highest chemistry configuration.
- **Rating Bridge:** Iteratively upgrade or downgrade players to hit the target OVR exactly, prioritizing fodder conservation.


## Implementation Steps
- [ ] Map complex rule keys (Min Leagues, Max Nations, etc.) via diagnostic logs.
- [ ] Build the `ConstraintValidator` logic.
- [ ] Implement `src/solvers/ChallengeSolver.ts`.
- [ ] Integrate "🏆 CHALLENGE SOLVER" button into the UI.
- [ ] Follow the **Release Protocol** for deployment.

## Current Status: Research (Mapping Rule Keys)
*Waiting for diagnostic logs from a live Marquee Matchup SBC.*
