# FC-SBC: Player Metadata Reference

This document tracks the internal object properties used by the EA FC Web App to distinguish between different card types. These findings were verified via deep object inspection of Hasegawa and Hakimi cards.

## 🛠️ Card Type Identification

| Card Type | `subtype` | `rareflag` | `limitedUseType` | `upgrades` | `hasLevels` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Base Gold (Rare)** | `1` | `1` | `0` | `null` | `false` |
| **Base Gold (Common)**| `1` | `0` | `0` | `null` | `false` |
| **Loan Card** | Any | Any | `2` | Any | Any |
| **Evolution** | Any | Any | `0` | `Object` (not null) | `true` |
| **TOTW / Special** | `2+` | `3+` | `0` | `null` | `false` |

## 🔍 Official Search Criteria (Web App Defaults)

When searching for "Base Rare Gold" (Low to High), the Web App uses these specific `UTSearchCriteriaDTO` parameters:

| Parameter | Value | Purpose |
| :--- | :--- | :--- |
| `level` | `"gold"` | Gold cards only. |
| `rarities` | `[1]` | **Rare** cards only (Base Common is `[0]`). |
| `excludeLimitedUse`| `true` | **Excludes Loans** at the server level. |
| `_untradeables` | `"true"` | Filters for untradeables if selected. |
| `sortBy` | `"ovr"` | Sorts by overall rating. |
| `_sort` | `"asc"` | Low to High sorting. |
| `count` | `21` | Page size. |

## 📥 Data Access Path

The search results from `win.services.Club.search(...).observe(...)` are nested.
*   **Correct Path:** `data.response.items`
*   **Alternative (older versions):** `data.items`

## 🛠️ Refined Filtering Logic: The "Subtraction" Method

Based on the diagnostic of the Arsenal/Premier League results, we have moved from "Strict Addition" (looking for Subtype 1) to "Surgical Subtraction." This ensures we don't miss valid base cards like Mikel Merino or Hincapié.

### The "Base Rare" Test:
A card is a valid **Base Rare Gold** if it meets these three criteria:
1.  **NOT a Loan:** `p.limitedUseType === 0` (or `p.isLoanItem === false`).
2.  **NOT an Evo:** `p.upgrades === null` (The most definitive check for Evolutions).
3.  **IS a Gold Rare:** `p.rarities.includes(1)` (Server-side) or `p.rareflag === 1` (Client-side).

*Note: `subtype` (1, 2, or 3) is secondary. If a card is not a loan and not an evo, and it's a rare gold, it's a safe asset for SBCs.*
