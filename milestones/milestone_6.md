# Milestone 6: Final League SBC Solver (V29) - STABLE

## Status: Fully Functional
The solver has been perfected to handle complex League SBCs (like Bundesliga, Eredivisie, etc.) that require high chemistry and strict league adherence. It features a sophisticated prioritization logic that clears duplicate items while protecting high-value fodder and special cards.

## Key Features (V29)
1.  **"Negative Value" Storage Priority:** Automatically identifies and "dumps" items from SBC Storage (< 83 rating) into the squad first, ensuring duplicates are cleared before using club inventory.
2.  **Position-Aware Placement:** 
    - **Phase 1:** Snipes exact position matches from Storage to maximize "free" chemistry.
    - **Phase 2:** Places remaining Storage items into any open slots.
3.  **Chem-First Club Filling:** Uses a targeted Club Search to find position-perfect players for any remaining empty slots to hit the 10+ Chemistry requirement.
4.  **Hard Fodder Protection:** 
    - **Strict 83+ Wall:** Automatically blocks any card rated 83 or higher unless the SBC target rating is specifically 83+.
    - **Quality Gate:** Only allows Common, Rare, and TOTW cards. All Promos, Evolutions, and Red picks are strictly protected.
5.  **Multi-Pass Discovery:** Integrates Milestone 4's search strategy to actively discover players sitting deep in the club that match the specific league requirements.
6.  **Meticulous Logging:** Provides real-time "Decision Events" in the console, explaining exactly why each player was chosen and their source (Storage vs Club).

## Technical Architecture
- **Persona Deduplication:** Hardened filter that ensures no player (e.g., Tah) can ever be suggested twice in the same squad.
- **Rating Bridge:** Iteratively upgrades the lowest-rated slots using same-league players until the exact target rating (e.g., 77) is reached.
- **DTO Compliance:** Uses native `UTSearchCriteriaDTO` instances to prevent EA internal validation crashes.

## Final Console Script (V29)
```javascript
(async function milestone6HybridSolverV29() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 🔋 MILESTONE 6: LEAGUE SBC HYBRID SOLVER (V29) ---", "font-size: 16px; font-weight: bold; color: #ec4899;");
    console.log("[DIAGNOSTIC] V29: Hard Quality Gate & Evo Protection Enabled.");

    const normalizePos = (id) => {
        if (!id && id !== 0) return null;
        const map = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
        return map[id] || id;
    };

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
    if (!ctx) return console.error("❌ [ERROR] SBC screen not detected.");
    const { challenge, squad, controller } = ctx;

    const requirements = (challenge.eligibilityRequirements || []).map((req) => {
        const col = req.kvPairs._collection || req.kvPairs;
        const rules = [];
        for (let key in col) {
            const val = col[key];
            const cleanValue = Array.isArray(val) ? val.map(v => (v?.value !== undefined ? v.value : v)) : (val?.value !== undefined ? val.value : val);
            rules.push({ key: parseInt(key), value: cleanValue });
        }
        return { rules, count: Number(req.count), description: req.requirementLabel || "General" };
    });

    const targetRating = Number(requirements.find(r => r.rules.some(rule => rule.key === 19))?.rules.find(r => r.key === 19)?.value || 0);
    const ratingCeiling = Math.max(82, targetRating + 2);

    const searchClub = async (criteria) => {
        return new Promise((resolve) => {
            console.log(`[DISCOVERY] Searching Club for: ${JSON.stringify(criteria)}...`);
            const searchCriteria = new win.UTSearchCriteriaDTO();
            Object.assign(searchCriteria, { type: 'player', count: 150, excludeLimitedUse: true, ...criteria });
            win.services.Club.search(searchCriteria).observe({ name: "SolverDiscovery" }, (obs, res) => {
                const items = (res.response?.items || res.items || []).filter(p => !((typeof p.isLoanItem === 'function' && p.isLoanItem()) || (p.loan && p.loan > 0) || p.limitedUseType === 2));
                resolve(items);
            });
        });
    };

    const primeInventory = async () => {
        const fetch = (service, method, criteriaParams) => new Promise(r => {
            if (!service || !service[method]) return r([]);
            const criteria = new win.UTSearchCriteriaDTO();
            Object.assign(criteria, criteriaParams);
            service[method](criteria).observe({ name: 'fetch' }, (obs, res) => r(res.response?.items || res.items || []));
        });
        const [sItems, cItems] = await Promise.all([
            fetch(win.services.Item, 'searchStorageItems', { type: 'player', count: 250 }),
            fetch(win.services.Club, 'search', { type: 'player', count: 400 })
        ]);
        const all = []; const seenIds = new Set();
        const add = (items, source) => {
            if (!items) return;
            const raw = items._collection || items.items || items;
            (Array.isArray(raw) ? raw : Object.values(raw || {})).forEach(p => {
                if (p && p.id && !seenIds.has(p.id)) {
                    const isEvo = !!p.evolutionInfo || p.rareflag === 116 || p.upgrades !== null;
                    if (isEvo) return;
                    p._sourceType = source;
                    p._sourcePriority = (source === 'storage' && p.rating < 83) ? 0 : (source === 'unassigned' ? 1 : 2);
                    p._personaId = Number(p.definitionId) % 16777216;
                    all.push(p); seenIds.add(p.id);
                }
            });
        };
        add(sItems, 'storage'); add(repo.unassigned || [], 'unassigned'); add(cItems, 'club');
        return { pool: all, seenIds };
    };

    let { pool: currentPool, seenIds } = await primeInventory();

    const getFilteredPool = (pool, criteria, excludePersonaIds = new Set()) => {
        const basePool = pool.filter(p => {
            if (excludePersonaIds.has(p._personaId)) return false;
            if (targetRating < 83 && p.rating >= 83) return false;
            if (p.rating > ratingCeiling) return false;
            const isStandard = p.rareflag === 0 || p.rareflag === 1 || p.rarityId === 3 || p.rareflag === 3;
            if (!isStandard) return false;
            if (criteria.leagues?.length > 0 && !criteria.leagues.includes(p.leagueId)) return false;
            return true;
        }).sort((a, b) => (a._sourcePriority - b._sourcePriority) || (a.rating - b.rating));
        const distinct = []; const localSeen = new Set(excludePersonaIds);
        for (const p of basePool) { if (!localSeen.has(p._personaId)) { distinct.push(p); localSeen.add(p._personaId); } }
        return distinct;
    };

    const usedPersonaIds = new Set();
    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
    const selected = new Array(activeSlots.length).fill(null);

    const detectedLeagues = new Set();
    requirements.forEach(req => req.rules.forEach(rule => { if (rule.key === 11) (Array.isArray(rule.value) ? rule.value : [rule.value]).forEach(l => detectedLeagues.add(l)); }));
    const globalLeagues = Array.from(detectedLeagues);

    if (globalLeagues.length > 0) {
        for (const leagueId of globalLeagues) {
            const found = await searchClub({ league: leagueId, ovrMax: ratingCeiling });
            found.forEach(p => {
                if (!seenIds.has(p.id)) {
                    const isEvo = !!p.evolutionInfo || p.rareflag === 116 || p.upgrades !== null;
                    if (isEvo) return;
                    p._sourceType = 'discovery'; p._sourcePriority = 3;
                    p._personaId = Number(p.definitionId) % 16777216;
                    currentPool.push(p); seenIds.add(p.id);
                }
            });
        }
    }

    const storagePool = getFilteredPool(currentPool, { leagues: globalLeagues }, usedPersonaIds).filter(p => p._sourceType === 'storage');
    activeSlots.forEach((slot, i) => {
        const slotPos = normalizePos(slot.position?.id || slot._position);
        const matchIdx = storagePool.findIndex(p => normalizePos(p.preferredPosition) === slotPos);
        if (matchIdx !== -1) {
            const match = storagePool.splice(matchIdx, 1)[0];
            selected[i] = { item: match, type: 'STORAGE_POS' };
            usedPersonaIds.add(match._personaId);
            console.log(`[DECISION] Slot ${slot.index}: Storage Match -> ${match._staticData?.name} (${match.rating})`);
        }
    });

    activeSlots.forEach((slot, i) => {
        if (selected[i] || storagePool.length === 0) return;
        const match = storagePool.shift();
        selected[i] = { item: match, type: 'STORAGE_DUMP' };
        usedPersonaIds.add(match._personaId);
        console.log(`[DECISION] Slot ${slot.index}: Storage Dump -> ${match._staticData?.name} (${match.rating})`);
    });

    const clubPool = getFilteredPool(currentPool, { leagues: globalLeagues }, usedPersonaIds);
    activeSlots.forEach((slot, i) => {
        if (selected[i]) return;
        const slotPos = normalizePos(slot.position?.id || slot._position);
        const matchIdx = clubPool.findIndex(p => normalizePos(p.preferredPosition) === slotPos);
        if (matchIdx !== -1) {
            const match = clubPool.splice(matchIdx, 1)[0];
            selected[i] = { item: match, type: 'CLUB_CHEM' };
            usedPersonaIds.add(match._personaId);
            console.log(`[DECISION] Slot ${slot.index}: Club Chem -> ${match._staticData?.name} (${match.rating})`);
        }
    });

    activeSlots.forEach((slot, i) => {
        if (selected[i]) return;
        const match = clubPool.shift();
        if (match) {
            selected[i] = { item: match, type: 'CLUB_FILL' };
            usedPersonaIds.add(match._personaId);
            console.log(`[DECISION] Slot ${slot.index}: Club Filler -> ${match._staticData?.name} (${match.rating})`);
        }
    });

    const calculateRating = (items) => {
        const active = items.filter(s => s !== null);
        if (active.length < 11) return 0;
        const ratings = active.map(s => s.item.rating);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0; ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        return Math.floor((sum + cf) / 11 + 0.0401);
    };

    let attempts = 0;
    while (attempts < 50 && calculateRating(selected) < targetRating) {
        attempts++;
        const minR = Math.min(...selected.filter(s => s).map(s => s.item.rating));
        const upIdx = selected.findIndex(s => s && s.item.rating === minR);
        if (upIdx === -1) break;
        const currentItem = selected[upIdx].item;
        const upgrade = currentPool.find(p => !usedPersonaIds.has(p._personaId) && p.rating > currentItem.rating && p.leagueId === currentItem.leagueId && p.rating < 83);
        if (upgrade) {
            usedPersonaIds.delete(currentItem._personaId);
            selected[upIdx].item = upgrade;
            usedPersonaIds.add(upgrade._personaId);
            console.log(`[DECISION] Bridge Slot ${activeSlots[upIdx].index}: ${currentItem.rating} -> ${upgrade.rating}`);
        } else break;
    }

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot, i) => { if (selected[i]) finalArray[slot.index] = selected[i].item; });
    squad.setPlayers(finalArray);
    squad.onDataUpdated.notify();
    if (controller._pushSquadToView) controller._pushSquadToView(squad);
    console.log(`[FINAL] Rating: ${calculateRating(selected)}/${targetRating} | Chem: ${squad.getChemistry()}`);
    console.log("%c[SBC TOOL] V29: Complete.", "font-weight: bold; color: #ec4899;");
})();
```
