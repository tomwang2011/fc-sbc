# Milestone 10: Challenge & Marquee Matchup Solver (CSP Engine)

## The Objective
To create an intelligent solver for "Challenge" and "Marquee Matchup" (MM) SBCs. These SBCs involve complex, overlapping **Constraint Satisfaction Problems (CSPs)** rather than simple "bucket filling".

## The Challenge
Unlike League SBCs (specific league) or De-Cloggers (specific rating), MM SBCs have rules like:
1.  **Specific Entities:** "Min 1 player from [Club A] OR [Club B]"
2.  **Diversity:** "Min 4 Leagues" or "Min 3 Nations"
3.  **Limits:** "Max 5 players from the Same Nation"
4.  **Thresholds:** "Min Team Chemistry: 14", "Min Squad Rating: 75"

## The Architecture: A 3-Phase Constraint Engine

### Phase 1: The Core Requirements (The "Seeds")
- Identify "Specific Entity" requirements (Rule Key 14 for Club, 15 for Nation, etc.).
- Perform targeted discovery searches for these specific players.
- Insert these "Seed" players first to guarantee the most difficult rules are met.

### Phase 2: The Diversity Expansion (The "Fillers")
- Analyze diversity rules (Min Leagues/Nations) and limit rules (Max Same League/Nation).
- Select fillers using a `isMoveValid()` validator that ensures inserting a player won't violate any limits or make diversity rules impossible to hit.

### Phase 3: The Optimization Bridge (Rating & Chem)
- **Chemistry Sniping:** Swap non-seed players with position-matching players from the same League/Nation as the seeds.
- **Rating Bridge:** Upgrade lowest-rated non-seed players to hit the target OVR while respecting the `rareflag` quality gate.

## Implementation Steps
- [ ] Map complex rule keys (Min Leagues, Max Nations, etc.) via diagnostic logs.
- [ ] Build the `ConstraintValidator` logic.
- [ ] Implement `src/solvers/ChallengeSolver.ts`.
- [ ] Integrate "🏆 CHALLENGE SOLVER" button into the UI.
- [ ] Follow the **Release Protocol** for deployment.

## Current Status: Research (Mapping Rule Keys)
*Waiting for diagnostic logs from a live Marquee Matchup SBC.*
