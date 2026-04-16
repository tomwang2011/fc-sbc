# Milestone 4: 84.x Rating Engine & Strategy-Aware Solver

**Date:** April 15, 2026
**Status:** ✅ COMPLETED

## 🎯 Achievements
- **Weighted Rating Algorithm:** Implemented the "Correction Factor" formula to accurately calculate squad ratings, matching the EA Web App's internal math (including the .96 rounding rule).
- **BFS Optimizer:** Developed a Breadth-First Search loop that incrementally upgrades the lowest-rated fillers to hit exact rating targets with zero waste.
- **Mandatory Asset Locking:** Implemented a protection system that ensures required cards (e.g., TOTW) are never swapped out during the rating optimization phase.
- **Dynamic Search Strategy:** The solver now automatically detects League and Nation requirements and executes a multi-stage priming process to gather specific "ingredient" cards.
- **Rigorous Safety:** Enhanced filters to strictly exclude Loans (`limitedUseType: 2`) and Evolutions across all search stages.

## 🛠️ Technical Logic
1. **Rating Math:** `(Sum + CF) / 11` where `CF = sum(max(0, R - Avg))`.
2. **Strategy Detection:** Iterates through `eligibilityRequirements` to set search `league`, `nation`, and `rarity` flags.
3. **Bucket Selection:** Automatically calculates the optimal search range (`targetRating +/- 3`) to find relevant fodder.
4. **BFS Upgrades:** Identifies indices of all players with the minimum rating and swaps them for the next available higher-rated filler in the pool.
