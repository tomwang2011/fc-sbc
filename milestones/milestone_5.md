# Milestone 5: SBC Storage & Unassigned Priority

This milestone integrates the FC 25 "SBC Storage" (Duplicate Pile) as a first-class citizen in the solver engine.

## 🔍 Verified Storage Access
Research of external tools (AutoSBC, SbcCruncher) confirms the following access patterns for FC 25:

### 1. The Search Service (Triggering the Sync)
To refresh or populate the local storage repository from the server:
```javascript
// Method: win.services.Item.searchStorageItems(criteria)
const criteria = new win.UTSearchCriteriaDTO();
criteria.type = 'player';
win.services.Item.searchStorageItems(criteria).observe(this, (obs, res) => {
    // res.response.items contains the players in the duplicate storage
});
```

### 2. The Repository (Local Cache)
Once searched, players are cached in the internal repository:
```javascript
// Path: win.repositories.Item.getStorage()
const storageRepo = win.repositories.Item.getStorage();
const storageItems = storageRepo._collection || storageRepo.items || [];
```

## 🛠️ Implementation Strategy (Storage-First)

### Entity Tagging
During the `primeInventory` phase, players should be tagged with their source to allow weighted sorting:
- `itemType: 'sbcstorage'` (High Priority)
- `itemType: 'unassigned'` (Medium Priority)
- `itemType: 'club'` (Low Priority)

### Solver Priority Logic
The solver pool must be sorted such that for any given rating, storage players are used first.
```javascript
pool.sort((a, b) => {
    if (a.rating !== b.rating) return a.rating - b.rating;
    const priority = { 'sbcstorage': 0, 'unassigned': 1, 'club': 2 };
    return priority[a.itemType] - priority[b.itemType];
});
```

## ⚠️ Known Issues to Fix
- **Special Card Leakage:** Current iterations sometimes ignore the `subtype: 1` lockdown, causing Specials/Loans/Evos to be used. The `isLoanItem()` and `isEvo()` checks must be strictly enforced.
- **Repository Sync Race:** Searching for Storage and Club players must be fully awaited via `Promise.all` and the `.observe()` pattern before the solver attempts to read from `repositories.Item`.

## ✅ Status: Research Complete
The paths are mapped, and the logic is verified. Next step is a clean-room implementation of the V46 engine.


references: https://github.com/Kava4/EasyFUT and https://github.com/mabenj/SbcCruncher