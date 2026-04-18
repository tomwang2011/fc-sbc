# Milestone 11: Marquee Matchup Specialist

**Objective:** Build a dedicated engine for Marquee Matchups that handles specific club requirements, unique club limits, and complex nation/league overlaps.

## The Strategy: Structural Growth (Human Logic)
1.  **Identify Mandatory Anchors:** Analyze club for players hitting specific rules (e.g., Arsenal, Man City, England).
2.  **Picky Anchor Ranking:** 
    - Rank 1: Storage + Multi-Rule Hit (e.g. English Arsenal player).
    - Rank 2: Storage + Single Rule Hit.
    - Rank 3: Club + Multi-Rule Hit.
    - **Hard Limit:** Rating <= 82.
3.  **Sequential Building:** 
    - Start with a Top Anchor.
    - For every slot, pick the player who:
        - Satisfies an unsatisfied rule.
        - Matches League/Nation of existing players for Chem.
        - Stays as close as possible to the target OVR (78 or 65).
4.  **Requirement Safety:** Real-time monitoring of Unique Clubs and Unique Nations to prevent failures.

## Status: IN PROGRESS
- [x] Restore semantic parsing from Milestone 10.
- [x] Implement Targeted Club Discovery.
- [ ] Refine Unique Club lookahead logic.
- [ ] Add specific league anchor trialing.
