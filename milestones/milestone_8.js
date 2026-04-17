(async function milestone8RareFirstSolverV19() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 💎 MILESTONE 8: MIXED RARITY SOLVER (V19) ---", "font-size: 16px; font-weight: bold; color: #10b981;");
    console.log("[DIAGNOSTIC] V19: Hard Rating Boundaries & Tier-Smart Rarity.");

    const findSbcContext = (node) => {
        if (!node) return null;
        if (node._squad && node._challenge) return { challenge: node._challenge, squad: node._squad, controller: node };
        const children = [...(node.childViewControllers || []), ...(node.presentedViewController ? [node.presentedViewController] : []), ...(node.currentController ? [node.currentController] : []), ...(node._viewControllers || [])];
        for (const child of children) { const found = findSbcContext(child); if (found) return found; }
        return null;
    };

    const ctx = findSbcContext(win.getAppMain().getRootViewController());
    if (!ctx) return console.error("❌ SBC screen not detected.");
    const { challenge, squad, controller } = ctx;

    const getCleanValue = (val) => {
        if (Array.isArray(val)) return val.map(v => (v?.value !== undefined ? v.value : v));
        return (val?.value !== undefined ? val.value : val);
    };

    // 1. Bucket Requirement Analysis
    console.log("[DIAGNOSTIC] Analyzing SBC Requirements...");
    let minRaresNeeded = 0;
    const buckets = []; 
    let globalLevel = null;

    const rawReqs = challenge.eligibilityRequirements || [];
    rawReqs.forEach(r => {
        const label = (r.requirementLabel || "").toLowerCase();
        const col = r.kvPairs._collection || r.kvPairs;
        const rules = [];
        for (let k in col) rules.push({ key: parseInt(k), value: getCleanValue(col[k]) });

        // Rarity detection (Key 25=4, Key 18=1)
        const isRare = rules.some(rl => (rl.key === 25 && rl.value.includes(4)) || (rl.key === 18 && rl.value.includes(1))) || label.includes("rare");
        if (isRare) minRaresNeeded = Math.max(minRaresNeeded, r.count);

        // Level detection (1=B, 2=S, 3=G)
        const bronze = rules.some(rl => (rl.key === 17 && rl.value.includes(1)) || (rl.key === 3 && rl.value.includes(1))) || label.includes("bronze");
        const silver = rules.some(rl => (rl.key === 17 && rl.value.includes(2)) || (rl.key === 3 && rl.value.includes(2))) || label.includes("silver");
        const gold = rules.some(rl => (rl.key === 17 && rl.value.includes(3)) || (rl.key === 3 && rl.value.includes(3))) || label.includes("gold");

        const bInfo = bronze ? { level: "bronze", min: 0, max: 64 } : (silver ? { level: "silver", min: 65, max: 74 } : (gold ? { level: "gold", min: 75, max: 82 } : null));

        if (bInfo) {
            if (r.count > 0) buckets.push({ ...bInfo, count: r.count });
            else if (r.count === -1) globalLevel = bInfo;
        }
    });

    if (buckets.length === 0 && !globalLevel) globalLevel = { level: "gold", min: 75, max: 82 };

    const fetchItems = (service, method, criteriaParams) => new Promise(r => {
        if (!service || !service[method]) return r([]);
        const criteria = new win.UTSearchCriteriaDTO();
        Object.assign(criteria, { type: 'player', count: 250, excludeLoans: true, sortBy: "ovr", sort: "asc" }, criteriaParams);
        service[method](criteria).observe({ name: 'fetch' }, (obs, res) => {
            const raw = res.response?.items || res.items || res._collection || res;
            r(Array.isArray(raw) ? raw : (raw?._collection || Object.values(raw || {})));
        });
    });

    const primeInventory = async () => {
        console.log("[STORAGE] Syncing Multi-Pass Inventory...");
        const levels = new Set(buckets.map(b => b.level)); if (globalLevel) levels.add(globalLevel.level);
        const fetches = [fetchItems(win.services.Item, 'searchStorageItems', {})];
        levels.forEach(lvl => fetches.push(fetchItems(win.services.Club, 'search', { level: lvl, isUntradeable: "true" })));
        
        const results = await Promise.all(fetches);
        const all = []; const seenIds = new Set();
        results.forEach((list, idx) => {
            const source = idx === 0 ? 'storage' : 'club';
            list.forEach(p => {
                if (p && p.id && !seenIds.has(p.id)) {
                    if (p.tradable !== false || (p.rating >= 83 && p.rating < 90)) return;
                    if (p.limitedUseType === 2 || !!p.evolutionInfo || p.rareflag > 1) return;
                    p._sourceType = source;
                    p._sourcePriority = (source === 'storage') ? 0 : 2;
                    p._personaId = Number(p.definitionId) % 16777216;
                    all.push(p); seenIds.add(p.id);
                }
            });
        });
        return all.sort((a,b) => (a._sourcePriority - b._sourcePriority) || (a.rating - b.rating));
    };

    let fullPool = await primeInventory();
    const usedPersonaIds = new Set();
    const usedIds = new Set();
    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
    const selected = new Array(activeSlots.length).fill(null);
    let raresInserted = 0;

    const findMatch = (lvl, rareflag, ignoreRarity = false) => {
        return fullPool.find(p => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId)) return false;
            // HARD BOUNDARY LOCK
            if (p.rating < lvl.min || p.rating > lvl.max) return false;
            if (!ignoreRarity && p.rareflag !== rareflag) return false;
            return true;
        });
    };

    // PHASE: Bucket Filling
    [...buckets, ...(globalLevel ? [{ ...globalLevel, count: 11 }] : [])].forEach(bucket => {
        let countForBucket = 0;
        const target = bucket.count === 11 ? activeSlots.length : bucket.count;
        
        activeSlots.forEach((slot, i) => {
            if (selected[i] || countForBucket >= target) return;

            const isGold = (bucket.level === 'gold');
            let match = null;

            // 1. Mandatory Rares
            if (raresInserted < minRaresNeeded) {
                match = findMatch(bucket, 1);
            }

            // 2. Logic Pivot
            if (!match) {
                if (isGold) {
                    match = findMatch(bucket, 0); // Conserve Gold Rares
                } else {
                    match = findMatch(bucket, 0, true); // Trash Tier Logic (Lowest Rating wins)
                }
            }

            // 3. Fallback
            if (!match) match = findMatch(bucket, 0, true);

            if (match) {
                console.log(`[DECISION] Slot ${slot.index}: ${match.rareflag ? "RARE" : "COMMON"} ${match._staticData?.name} (${match.rating}) [Bucket: ${bucket.level}]`);
                selected[i] = match; usedIds.add(match.id); usedPersonaIds.add(match._personaId);
                countForBucket++; if (match.rareflag) raresInserted++;
            }
        });
    });

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot, i) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    challenge.squad = squad;

    console.log("[STORAGE] Saving Squad...");
    squad.onDataUpdated.notify();
    if (squad.isValid) squad.isValid();

    win.services.SBC.saveChallenge(challenge).observe({ name: 'SaveSquad' }, (obs, res) => {
        if (res.success) {
            console.log("%c[SBC TOOL] V19: SAVED.", "font-weight: bold; color: #10b981;");
            if (controller._pushSquadToView) controller._pushSquadToView(squad);
        } else {
            console.error("❌ [ERROR] Server rejected save.");
            if (controller._pushSquadToView) controller._pushSquadToView(squad);
        }
    });
})();