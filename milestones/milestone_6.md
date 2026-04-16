# Milestone 6: Hybrid Solver & Requirement Synthesis

This milestone merges the "Storage-First" discovery from Milestone 5 with the "Strategy-Aware" engine from Milestone 4. The goal is a unified solver that clears duplicates while hitting complex SBC targets (Rating, Chemistry, Rarities).

## 🎯 Objectives
- **Storage-Aware Mandatory Search:** When the SBC requires a specific card (e.g., "1 TOTW"), the search must scan SBC Storage and Unassigned before searching the Club or executing a dynamic server fetch.
- **Hybrid Filler Pool:** Create a unified filler pool where for any given rating, `sbcstorage` > `unassigned` > `club`.
- **Intelligent BFS Upgrades:** Modify the rating optimizer to prioritize swapping a Club filler for a Storage filler of the same or better rating to reach the target OVR.
- **Specials Awareness:** Fully integrate the `rareflag` and `rarityId` detection to ensure TOTW/Special requirements are satisfied using Storage assets if available.

## 🛠️ Implementation Logic

### 1. Unified Prime Inventory
The `primeInventory` method must tag every player with its source:
```typescript
p.itemType = 'sbcstorage' | 'unassigned' | 'club';
```

### 2. The Priority Comparator
A central sorting function for the solver:
```javascript
const prioritySort = (a, b) => {
    if (a.rating !== b.rating) return a.rating - b.rating;
    const weights = { 'sbcstorage': 0, 'unassigned': 1, 'club': 2 };
    return weights[a.itemType] - weights[b.itemType];
};
```

### 3. Requirement Mapping
1. **Mandatory Pass:** Scan requirements -> Search Storage -> Search Unassigned -> Search Club -> Fetch Server.
2. **Filler Pass:** Fill remaining slots with the lowest-rated Hybrid pool (Storage favored).
3. **Rating Pass:** BFS upgrade lowest fillers to hit target OVR (Storage favored).

## ✅ Success Criteria
- [ ] Solver uses a 78-rated Storage player instead of a 78-rated Club player.
- [ ] Solver correctly identifies a TOTW in Storage to satisfy a "Min. 1 TOTW" requirement.
- [ ] Final squad rating hits the 84.x target with zero waste from the Club if Storage can provide the delta.
