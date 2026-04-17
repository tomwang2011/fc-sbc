# Milestone 9: Tampermonkey Integration & UI Wrapper

## Status: Built from Source (V1.1)
The solver has transitioned from local console snippets to a professionally bundled Tampermonkey script. It is built from TypeScript source in the `src/` directory using Vite and `vite-plugin-monkey`.

## Core Objectives
1.  **UI Injection:** Injects a modern, dark-themed "SBC Master Tool" panel into the EA FC Web App.
2.  **One-Click Orchestration:** Provides three dedicated buttons for our stable engines:
    -   **League Solver (M6):** Position-aware, discovery-enabled.
    -   **De-Clogger (M7):** Heavy Anchor, Storage-first pattern matching.
    -   **Efficient (M8):** Multi-level bucket filling with rare conservation.
3.  **Global Settings:** Includes a toggle for "Untradeable Only" mode.
4.  **Source-to-Build Workflow:** Logic resides in `src/SbcBuilder.ts` and `src/App.tsx`, then bundled into `dist/fc-sbc.user.js`.

## How to Build & Install
1.  **Modify Source:** Edit files in `src/`.
2.  **Generate Script:** Run `npm run build` in the terminal.
3.  **Deploy:** Copy the contents of `dist/fc-sbc.user.js` and paste into a new Tampermonkey script in your browser.

## Technical Architecture
- **Bundler:** Vite 7 with Preact for lightweight UI.
- **Deduplication:** Shared `usedPersonaIds` logic across all solvers.
- **Persistence:** Explicitly calls `saveChallenge` and refreshes UI to ensure state sync.

## Final Built Script
The bundled script is located at: `dist/fc-sbc.user.js`

