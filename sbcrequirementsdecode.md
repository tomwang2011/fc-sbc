# SBC Requirements Decoder

This document maps the EA Web App's internal requirement keys and values to human-readable SBC constraints. These IDs are found in the `eligibilityRequirements` array of a `Challenge` object, specifically within the `kvPairs` (key-value pairs) collection.

## Requirement Keys (KV Keys)

| Key ID | Description | Common Usage |
| :--- | :--- | :--- |
| **3** | Item Quality Level | Usually 1 (Bronze), 2 (Silver), 3 (Gold) |
| **5** | Player Nationality/Region | Specific Nation ID (e.g., 21 for France) |
| **6** | League | Specific League ID (e.g., 13 for Premier League) |
| **11** | League Diversity / Specific League | Used to check for players from specific leagues |
| **12** | Max/Min Leagues | Diversity constraint for total number of leagues |
| **15** | Nation Diversity / Specific Nation | Diversity constraint for total number of nations |
| **17** | Item Level (Quality) | 1: Bronze, 2: Silver, 3: Gold |
| **18** | Rarity Type | 1: Common, 3: TOTW, 4: Rare |
| **19** | Squad Rating | The minimum overall team rating required |
| **25** | Player Rarity | 0: Common, 1: Rare |
| **35** | Squad Chemistry | The minimum total chemistry required |

---

## Value Mappings (KV Values)

### Item Level / Quality (Keys 3, 17)
- `1`: Bronze
- `2`: Silver
- `3`: Gold

### Player Rarity (Keys 18, 25)
- `0`: Common
- `1`: Rare
- `3`: TOTW (Team of the Week)
- `4`: Rare (Specific variant often used in requirements)

### Common Entities
- **League 13:** Premier League (ENG 1)
- **League 53:** LaLiga EA Sports (ESP 1)
- **League 19:** Bundesliga (GER 1)
- **League 31:** Serie A (ITA 1)
- **League 16:** Ligue 1 (FRA 1)

---

## Technical Implementation Notes

### Requirement Parsing
In the code, requirements are usually extracted from `challenge.eligibilityRequirements`. 
```typescript
const col = r.kvPairs._collection || r.kvPairs;
const keys = Object.keys(col).map(k => parseInt(k));
const vals = Object.values(col).map(v => Utils.getCleanValue(v)).flat();
```

### Context Utility
The `Utils.getCleanValue` helper is crucial because EA often wraps values in objects:
```typescript
static getCleanValue(val: any) {
    if (Array.isArray(val)) return val.map(v => v?.value !== undefined ? v.value : v);
    return val?.value !== undefined ? val.value : val;
}
```
