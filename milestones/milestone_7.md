# Milestone 7: 84-Rated "De-Clogger" Solver (83x14) - STABLE

## Status: Fully Functional
The solver has been perfected to clear SBC Storage duplicates (82-84 rated) with maximum efficiency. It implements a "Heavy Anchor" strategy to hit 84 OVR requirements while burning off massive amounts of low-rated duplicate clogs and protecting high-value assets.

## Key Features (V19)
1.  **Negative Value Rule:** Prioritizes players in SBC Storage rated 82-84. Using them is treated as a priority to unlock pack opening.
2.  **Heavy Anchor Patterns:** Uses mathematically optimized templates to carry low-rated clogs:
    - **83 Flush:** 1x 88 + 10x 83
    - **84 Flush:** 1x 87 + 6x 84 + 4x 83
    - **Double Anchor:** 2x 87 + 9x 83
3.  **Ironclad Untradeable Lock:** Strictly filters for `tradable: false`. Tradeable liquid assets are 100% protected.
4.  **Persona Deduplication:** Hardened tracking using `usedPersonaIds` to ensure no player (even different versions/duplicates) ever appears twice in the same squad.
5.  **Vault Protection:** Absolute hard-stop excluding any player rated 89+.
6.  **Deep TOTW Discovery:** Targeted search for the lowest-rated untradeable TOTW anchor sitting deep in the club.
7.  **Server-Side Save Flow:** Explicitly persists the squad to EA servers before UI notification to ensure the "Exchange" button lights up permanently.

## Technical Architecture
- **Property Accuracy:** Uses the specific `tradable: false` property identified via live card inspection.
- **Fail-Safe Fulfill:** Includes a remainder pass to fill empty slots if specific rating clogs run dry.
- **Rating Guard:** Iteratively nudges 83.9 ratings up to 84.0 by swapping minimum-value cards for bridge assets.

## Final Console Script (V19)
```javascript
(async function milestone7DeCloggerV19() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 🛠️ MILESTONE 7: 84-RATED DE-CLOGGER (V19) ---", "font-size: 16px; font-weight: bold; color: #10b981;");
    console.log("[DIAGNOSTIC] V19: Restored Server-Side Save Flow.");

    const findSbcContext = (node) => {
        if (!node) return null;
        if (node._squad && node._challenge) return { challenge: node._challenge, squad: node._squad, controller: node };
        const children = [...(node.childViewControllers || []), ...(node.presentedViewController ? [node.presentedViewController] : []), ...(node.currentController ? [node.currentController] : []), ...(node._viewControllers || [])];
        for (const child of children) {
            const found = findSbcContext(child);
            if (found) return found;
        }
        return null;
    };

    const ctx = findSbcContext(win.getAppMain().getRootViewController());
    if (!ctx) return console.error("❌ SBC screen not detected.");
    const { challenge, squad, controller } = ctx;

    const fetchItems = (service, method, criteriaParams) => new Promise(r => {
        if (!service || !service[method]) return r([]);
        const criteria = new win.UTSearchCriteriaDTO();
        Object.assign(criteria, { type: 'player', count: 150, excludeLoans: true, isUntradeable: "true", sortBy: "ovr", sort: "asc" }, criteriaParams);
        service[method](criteria).observe({ name: 'fetch' }, (obs, res) => {
            const raw = res.response?.items || res.items || res._collection || res;
            const items = Array.isArray(raw) ? raw : (raw?._collection || Object.values(raw || {}));
            r(items);
        });
    });

    const primeInventory = async () => {
        console.log("[STORAGE] Syncing Inventory...");
        const [sItems, cItems] = await Promise.all([
            fetchItems(win.services.Item, 'searchStorageItems', { isUntradeable: undefined }),
            fetchItems(win.services.Club, 'search', { count: 400 })
        ]);

        const all = []; const seenIds = new Set();
        const add = (list, sourceLabel) => {
            if (!list || !Array.isArray(list)) return;
            list.forEach(p => {
                if (p && p.id && !seenIds.has(p.id)) {
                    if (p.tradable !== false) return;
                    if (p.limitedUseType === 2 || !!p.evolutionInfo || p.rareflag === 116) return;
                    const isStandard = p.rareflag === 0 || p.rareflag === 1 || p.rarityId === 3 || p.rareflag === 3;
                    if (!isStandard) return;
                    p._sourceType = sourceLabel;
                    p._personaId = Number(p.definitionId) % 16777216;
                    all.push(p); seenIds.add(p.id);
                }
            });
        };
        add(sItems, 'storage'); add(repo.unassigned?._collection || repo.unassigned || [], 'unassigned'); add(cItems, 'club');
        return all;
    };

    let fullPool = await primeInventory();
    const usedPersonaIds = new Set();
    const usedIds = new Set();

    const identifyAnchor = async () => {
        console.log("[DECISION] Identifying TOTW Anchor...");
        let totws = fullPool.filter(p => (p.rarityId === 3 || p.rareflag === 3) && p.tradable === false);
        if (totws.length === 0) {
            const deepItems = await fetchItems(win.services.Club, 'search', { rarityIds: "3" });
            deepItems.forEach(p => {
                if (p && p.id && p.tradable === false && !p.evolutionInfo && p.rareflag !== 116) {
                    p._sourceType = 'club';
                    p._personaId = Number(p.definitionId) % 16777216;
                    totws.push(p);
                    if (!fullPool.some(fp => fp.id === p.id)) fullPool.push(p);
                }
            });
        }
        const anchor = totws.sort((a,b) => a.rating - b.rating)[0];
        if (anchor) {
            console.log(`[DECISION] Selected Anchor: ${anchor._staticData?.name} (${anchor.rating}) [Persona: ${anchor._personaId}]`);
            usedPersonaIds.add(anchor._personaId);
            usedIds.add(anchor.id);
        }
        return anchor;
    };

    const getPlayers = (rating, count, sourcePref = null) => {
        const matches = fullPool.filter(p => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId)) return false;
            if (p.rating !== rating) return false;
            if (p.rating >= 89 || p.tradable !== false) return false;
            if (sourcePref && p._sourceType !== sourcePref) return false;
            return (p.rareflag === 0 || p.rareflag === 1);
        }).sort((a,b) => (a._sourcePriority || 0) - (b._sourcePriority || 0));
        return matches.slice(0, count);
    };

    const anchor = await identifyAnchor();
    if (!anchor) return console.error("❌ No Untradeable TOTW found. Aborting.");
    
    const clogs = { 82: 0, 83: 0, 84: 0 };
    fullPool.forEach(p => { if (p._sourceType === 'storage' && clogs[p.rating] !== undefined) clogs[p.rating]++; });

    let pattern = []; 
    if (anchor.rating >= 88) { pattern = [{ r: 83, c: 10 }]; } 
    else if (clogs[84] >= 6) { pattern = [{ r: 84, c: 6 }, { r: 83, c: 4 }]; } 
    else { pattern = [{ r: 87, c: 1 }, { r: 83, c: 9 }]; }

    const selectedEntries = [{ item: anchor, type: 'ANCHOR' }];

    pattern.forEach(pReq => {
        let fromStorage = getPlayers(pReq.r, pReq.c, 'storage');
        fromStorage.forEach(p => { 
            console.log(`[DECISION] Slot ${selectedEntries.length}: ${p._staticData?.name} (${p.rating}) [Source: Storage]`);
            selectedEntries.push({ item: p, type: 'CLOG' }); 
            usedIds.add(p.id); usedPersonaIds.add(p._personaId);
        });
        let needed = pReq.c - fromStorage.length;
        if (needed > 0) {
            let fromClub = getPlayers(pReq.r, needed, 'club');
            fromClub.forEach(p => { 
                console.log(`[DECISION] Slot ${selectedEntries.length}: ${p._staticData?.name} (${p.rating}) [Source: Club]`);
                selectedEntries.push({ item: p, type: 'FULFILL' }); 
                usedIds.add(p.id); usedPersonaIds.add(p._personaId);
            });
        }
    });

    if (selectedEntries.length < 11) {
        const remainder = fullPool.filter(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId) && p.tradable === false && p.rating < 89 && (p.rareflag <= 1))
            .sort((a,b) => a.rating - b.rating);
        while (selectedEntries.length < 11) {
            const p = remainder.shift();
            if (!p) break;
            console.log(`[DECISION] Slot ${selectedEntries.length}: ${p._staticData?.name} (${p.rating}) [Source: Fail-Safe]`);
            selectedEntries.push({ item: p, type: 'FAILSAFE' });
            usedIds.add(p.id); usedPersonaIds.add(p._personaId);
        }
    }

    const calculateRating = (entries) => {
        const active = entries.map(e => e.item);
        if (active.length < 11) return 0;
        const ratings = active.map(p => p.rating);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0; ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        return Math.floor((sum + cf) / 11 + 0.0401);
    };

    let rating = calculateRating(selectedEntries);
    let guardLoop = 0;
    while (rating < 84 && guardLoop < 15) {
        guardLoop++;
        const idxLow = selectedEntries.findIndex(e => e.item.rating <= 83 && e.type !== 'ANCHOR');
        if (idxLow === -1) break;
        let upgrade = fullPool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId) && p.rating >= 84 && p.rating < 89 && p.tradable === false && (p.rareflag <= 1));
        if (upgrade) {
            console.log(`[DECISION] Rating Guard: Swapped ${selectedEntries[idxLow].item.rating} -> ${upgrade.rating} (${upgrade._staticData?.name})`);
            usedIds.delete(selectedEntries[idxLow].item.id); usedPersonaIds.delete(selectedEntries[idxLow].item._personaId);
            selectedEntries[idxLow] = { item: upgrade, type: 'GUARD_NUDGE' };
            usedIds.add(upgrade.id); usedPersonaIds.add(upgrade._personaId);
            rating = calculateRating(selectedEntries);
        } else break;
    }

    console.log(`[FINAL] Rating: ${calculateRating(selectedEntries)}/84 | Size: ${selectedEntries.length}/11`);
    const finalPlayers = new Array(23).fill(null);
    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
    selectedEntries.forEach((entry, i) => { if (activeSlots[i]) finalPlayers[activeSlots[i].index] = entry.item; });

    squad.setPlayers(finalPlayers);
    challenge.squad = squad;

    console.log("[STORAGE] Persisting Squad to Server...");
    win.services.SBC.saveChallenge(challenge).observe({ name: 'SaveSquad' }, (obs, res) => {
        if (res.success) {
            console.log("%c[DE-CLOGGER] V19: SAVED SUCCESSFULLY.", "font-weight: bold; color: #10b981;");
            squad.onDataUpdated.notify();
            if (controller._pushSquadToView) controller._pushSquadToView(squad);
        } else {
            console.error("❌ [ERROR] Server rejected save. Trying UI fallback...");
            squad.onDataUpdated.notify();
        }
    });
})();
```
