# SBC Storage Access & Implementation

This document outlines the discovery and verified methods for interacting with the **EA FC SBC Storage** (Duplicate Pile) based on analysis of AutoSBC, EasyFUT, and SbcCruncher.

## 🔍 Core Discovery
SBC Storage in FC 25 is handled as a distinct repository/zone within the Web App. Unlike the Club or Transfer List, it requires a specific search method to "prime" or refresh the local repository.

### 1. The Service Method
The primary way to fetch storage items from the server is:
```javascript
// Found in services.Item
services.Item.searchStorageItems(criteria);
```
*   **Input:** `UTSearchCriteriaDTO` (Standard search object).
*   **Behavior:** It is an asynchronous call. Like `services.Club.search`, it follows the `.observe()` pattern.
*   **Response:** Returns a collection of `UTItemEntity` objects specifically from the storage pile.

### 2. The Repository (Local Cache)
Once a search has been performed, the items are usually mirrored in the local repository:
```javascript
// Accessing the local cache
const storageRepo = repositories.Item.getStorage();
const items = storageRepo._collection || storageRepo.items || [];
```
*   **Sync Note:** Accessing `getStorage()` directly might return empty or stale data if `searchStorageItems` hasn't been called recently.

### 3. Implementation Patterns (Inspiration from Repos)

#### AutoSBC Pattern:
- Uses a `useSBCStoragePlayers` setting (0: No, 1: Yes, 2: Only).
- Merges storage items with club items before the solver runs.
- Specific logic for "Fill 91+ from storage" to burn high-rated duplicates first.

#### EasyFUT / SbcCruncher Strategy:
- **Priority:** Storage items are given a higher "usage priority" (weight) than club items.
- **Deduplication:** When merging lists, they ensure a player in storage is used *instead* of their club counterpart to prevent "dupes of dupes" logic.
- **Criteria:** Use a blank `UTSearchCriteriaDTO()` to fetch everything from storage at once.

## 🛠️ Implementation Plan for FC-SBC
To integrate this into our `SbcBuilder.ts`:

1.  **Prime Storage:** In `primeInventory()`, explicitly call `services.Item.searchStorageItems()` alongside the club search.
2.  **Entity Tagging:** Mark items from storage with a flag (e.g., `item.itemType = 'sbcstorage'`).
3.  **Solver Priority:** 
    *   Sort the inventory so that `itemType === 'sbcstorage'` comes first for a given rating.
    *   This ensures we always "burn" duplicates before touching the main club.
4.  **Movement Logic:** If we need to move an item to storage (to make room), use `services.Item.move(item, ItemPile.STORAGE)`.

## 🧪 Verification Script (Draft)
```javascript
const criteria = new UTSearchCriteriaDTO();
services.Item.searchStorageItems(criteria).observe(this, (obs, res) => {
    console.log("Storage Items Found:", res.response.items.length);
    console.table(res.response.items.map(p => ({
        name: p._staticData.name,
        rating: p.rating,
        id: p.id
    })));
});
```
