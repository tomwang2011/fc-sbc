# Gemini CLI: Engineering Mandates & Release Protocol

This document defines the foundational standards and mandatory workflows for all development on the FC SBC Master Tool project.

## 1. The Release Protocol
Every code modification or feature update MUST follow this sequence before being finalized:
1.  **Version Bump:** Increment the version in `package.json`.
2.  **UI Sync:** Update the version label in `src/App.tsx`.
3.  **Build:** Execute `npm run build` to regenerate `dist/fc-sbc.user.js`.
4.  **Verification:** Confirm the build contains the expected logic changes.
5.  **Commit & Push:** Commit with a descriptive message and push to the remote repository.

## 2. Solver Architecture (The 5 Pillars)
All solver implementations (League, De-Clogger, Efficient) MUST implement these five phases to be considered stable:
-   **Phase 1: Parse** - Robustly detect SBC requirements (rating, tiers, rarities, leagues) using `getCleanValue`.
-   **Phase 2: Discovery** - Perform targeted `fetchItems` searches for all required levels (Bronze, Silver, Gold) to ensure deep club discovery.
-   **Phase 3: Fulfillment** - Fill slots using bucket-aware logic and strict **Persona ID Deduplication** (`usedPersonaIds`).
-   **Phase 4: Optimization (Bridge)** - Iteratively upgrade the lowest-rated players to hit target OVR/Chemistry without breaking constraints.
-   **Phase 5: Persistence** - Call `saveChallenge`, trigger `onDataUpdated.notify()`, and execute `_pushSquadToView`.

## 3. Stability & Safety Defaults
-   **Liquid Asset Protection:** Strictly use `p.tradable === false` across all fillers.
-   **Special Card Safeguard:** Only allow Standard (Gold/Silver/Bronze) and TOTW (`p.rareflag === 0 || 1 || 3`).
-   **Evo Protection:** Explicitly block cards with `evolutionInfo`, `upgrades !== null`, or `rareflag === 116`.
-   **Meticulous Logging:** 
    - Log every slot insertion with: `[DECISION] Slot X: [Name] ([Rating]) [Source: Storage/Club/Failsafe]`.
    - For backtracking solvers, log every successful branch: `[GROW] Trial [Anchor]: Depth X/11. Added [Name] ([Rating])`.
    - If a branch reaches 11/11 but fails validation, log the reason: `[REJECT] Trial [Anchor]: Rating [Actual/Target], Chem [Actual/Target], Nations [Actual/Limit]`.

## 4. UI Standards
-   **Opaque Theme:** Always use solid hex backgrounds (`#09090b`, `#18181b`) with `!important` or high-priority inline styles to ensure mobile readability.
-   **Touch Targets:** Action buttons and toggles must maintain a minimum height of `44px` to `48px` for mobile compatibility.
