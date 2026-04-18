(async function milestone11MarqueeMatchupSolverV14() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 🏆 MILESTONE 11: MARQUEE MATCHUP SOLVER (V14) ---", "font-size: 16px; font-weight: bold; color: #3b82f6;");
    console.log("[STRATEGY] V14: Professional Grade (Fixed Crash + Full Trace Logging).");

    const findSbcContext = (node) => {
        if (!node) return null;
        if (node._squad && node._challenge) return { challenge: node._challenge, squad: node._squad, controller: node };
        const children = [...(node.childViewControllers || []), ...(node.presentedViewController ? [node.presentedViewController] : []), ...(node.currentController ? [node.currentController] : []), ...(node._viewControllers || [])];
        for (const child of children) { const r = findSbcContext(child); if (r) return r; }
        return null;
    };

    const ctx = findSbcContext(win.getAppMain().getRootViewController());
    if (!ctx) return console.error("❌ SBC screen not detected.");
    const { challenge, squad, controller } = ctx;

    const getCleanValue = (val) => {
        if (Array.isArray(val)) return val.map(v => (v?.value !== undefined ? v.value : v));
        return (val?.value !== undefined ? val.value : val);
    };

    const normalizePos = (id) => {
        const map = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
        return map[id] || id;
    };

    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);

    const calculateSquadRating = (items) => {
        const active = items.filter(p => p !== null);
        if (active.length < 11) return 0;
        const ratings = active.map(p => p.rating);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0; ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        return Math.floor((sum + cf) / 11 + 0.0401);
    };

    // --- PHASE 1: PARSER ---
    const rules = { rating: 0, chem: 0, gold: 0, rare: 0, maxNations: 11, maxLeagues: 11, maxClubs: 11, mustInclude: [] };

    (challenge.eligibilityRequirements || []).forEach(r => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const key = parseInt(k);
            const val = getCleanValue(col[k]);
            const vals = Array.isArray(val) ? val : [val];

            if (key === 19) rules.rating = Math.max(rules.rating, vals[0] || r.count || 0);
            if (key === 35 || key === 20) rules.chem = Math.max(rules.chem, vals[0] || 0);
            if (key === 17 && vals.includes(3)) rules.gold = r.count;
            if (key === 25 && (vals.includes(4) || vals === 4)) rules.rare = r.count;

            if (key >= 5 && key <= 15) {
                const smallVal = vals.find(v => typeof v === 'number' && v > 1 && v <= 8);
                if (r.count === -1 && smallVal && vals.length === 1) {
                    if ([5, 9, 15].includes(key)) rules.maxNations = Math.min(rules.maxNations, smallVal);
                    if ([6, 10, 12].includes(key)) rules.maxLeagues = Math.min(rules.maxLeagues, smallVal);
                    if ([7, 9, 12].includes(key)) rules.maxClubs = Math.min(rules.maxClubs, smallVal);
                } else if (vals[0] > 0) {
                    const type = key === 14 ? 'club' : (key === 15 ? 'nation' : 'league');
                    rules.mustInclude.push({ key, ids: vals, count: Math.max(1, r.count), type, label: r.requirementLabel });
                }
            }
        }
    });

    console.log("[REQUIREMENTS] Parsed Map:", rules);
    console.table(rules.mustInclude);

    // --- PHASE 2: INVENTORY ---
    const fetchItems = (crit) => new Promise(r => {
        const criteria = new win.UTSearchCriteriaDTO();
        Object.assign(criteria, { type: 'player', count: 250, isUntradeable: "true", sortBy: "ovr", sort: "asc" }, crit);
        win.services.Club.search(criteria).observe({ name: 'f' }, (obs, res) => r(res.response?.items || []));
    });

    log("[SYNC] Performing deep discovery...");
    const clubSearches = rules.mustInclude.filter(f => f.type === 'club').map(f => fetchItems({ club: f.ids[0] }));
    const pools = await Promise.all([
        fetchItems({}), fetchItems({ league: 13 }), fetchItems({ nation: 21 }), ...clubSearches,
        new Promise(r => win.services.Item.searchStorageItems(new win.UTSearchCriteriaDTO()).observe({name:'s'},(o,res)=>r(res.response?.items || [])))
    ]);
    const masterPool = pools.flat().map(p => { p._personaId = Number(p.definitionId) % 16777216; return p; })
        .filter(p => p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 85);

    // --- PHASE 3: CHEM ENGINE ---
    const getStats = (items) => {
        const active = items.filter(p => p !== null);
        if (active.length === 0) return { chem: 0, rating: 0, includeOk: false };
        let totalChem = 0; const nMap = {}, lMap = {}, cMap = {};
        const inPos = items.map((p, i) => {
            if (!p) return false;
            const slotPos = normalizePos(activeSlots[i].position?.id || activeSlots[i]._position);
            const ok = normalizePos(p.preferredPosition) === slotPos;
            if (ok) { nMap[p.nationId] = (nMap[p.nationId] || 0) + 1; lMap[p.leagueId] = (lMap[p.leagueId] || 0) + 1; cMap[p.teamId] = (cMap[p.teamId] || 0) + 1; }
            return ok;
        });
        items.forEach((p, i) => {
            if (!p || !inPos[i]) return;
            let pc = 0;
            if (nMap[p.nationId] >= 10) pc = 3; else if (nMap[p.nationId] >= 6) pc = 2; else if (nMap[p.nationId] >= 3) pc = 1;
            if (lMap[p.leagueId] >= 8) pc += 3; else if (lMap[p.leagueId] >= 5) pc += 2; else if (lMap[p.leagueId] >= 3) pc += 1;
            if (cMap[p.teamId] >= 7) pc += 3; else if (cMap[p.teamId] >= 4) pc += 2; else if (cMap[p.teamId] >= 2) pc += 1;
            totalChem += Math.min(3, pc);
        });
        const includeOk = rules.mustInclude.every(f => active.filter(p => f.ids.includes(p[f.type + 'Id'])).length >= f.count);
        return { chem: totalChem, rating: calculateSquadRating(items), includeOk, nations: new Set(active.map(p => p.nationId)).size, clubs: new Set(active.map(p => p.teamId)).size, rare: active.filter(p => p.rareflag === 1).length, gold: active.filter(p => p.rating >= 75).length };
    };

    // --- PHASE 4: ANCHOR SELECTION ---
    const getIntersectionScore = (p) => {
        return rules.mustInclude.filter(m => m.ids.includes(p.teamId) || m.ids.includes(p.nationId)).length;
    };

    const anchors = masterPool
        .filter(p => p.rating <= 82 && getIntersectionScore(p) > 0)
        .sort((a,b) => getIntersectionScore(b) - getIntersectionScore(a))
        .slice(0, 15);

    log(`[HEURISTIC] Anchoring ${anchors.length} High-Intersection Trials.`);

    // --- PHASE 5: RECURSIVE BACKTRACKER ---
    const traceGrowth = (anchor) => {
        const selected = new Array(11).fill(null);
        selected[0] = anchor;
        const usedIds = new Set([anchor.id]); const usedPersonaIds = new Set([anchor._personaId]);
        let iterations = 0; let bestFail = null;

        const solve = (idx) => {
            iterations++; if (iterations > 60000) return false;
            if (idx === 11) {
                const s = getStats(selected);
                const valid = s.chem >= rules.chem && s.rating >= rules.rating && s.includeOk && s.nations <= rules.maxNations && s.clubs <= rules.maxClubs && s.rare >= rules.rare;
                if (!bestFail || s.chem > bestFail.chem) bestFail = { squad: [...selected], stats: s };
                return valid;
            }

            const currentSum = selected.filter(x => x).reduce((acc, p) => acc + p.rating, 0);
            const left = 11 - idx;
            if ((currentSum + (left * 82)) < (rules.rating * 11)) return false;

            const slotPos = normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            const missing = rules.mustInclude.filter(f => selected.filter(p => p && (f.ids.includes(p.teamId) || f.ids.includes(p.nationId))).length < f.count);
            const curClubs = new Set(selected.filter(x => x).map(x => x.teamId));

            const candidates = masterPool.filter(p => {
                if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId)) return false;
                const nations = new Set(selected.filter(x => x).map(x => x.nationId));
                if (!nations.has(p.nationId) && nations.size >= rules.maxNations) return false;
                const clubs = new Set(selected.filter(x => x).map(x => x.teamId));
                if (!clubs.has(p.teamId) && clubs.size >= rules.maxClubs) return false;
                return true;
            }).sort((pA, pB) => {
                const aHits = missing.some(m => m.ids.includes(pA.teamId) || m.ids.includes(pA.nationId));
                const bHits = missing.some(m => m.ids.includes(pB.teamId) || m.ids.includes(pB.nationId));
                if (aHits !== bHits) return aHits ? -1 : 1;
                const aIn = curClubs.has(pA.teamId); const bIn = curClubs.has(pB.teamId);
                if (aIn !== bIn) return aIn ? -1 : 1;
                return pB.rating - pA.rating;
            }).slice(0, 20);

            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId);
                console.log(`[GROW] Trial ${anchor._staticData?.name}: Depth ${idx+1}/11. Added ${p._staticData?.name} (${p.rating})`);
                if (solve(idx + 1)) return true;
                selected[idx] = null; usedIds.delete(p.id); usedPersonaIds.delete(p._personaId);
            }
            return false;
        };

        if (solve(1)) return { squad: selected, ...getStats(selected) };
        console.log(`[REJECT] Trial ${anchor._staticData?.name} failed. Best attempt had ${bestFail.stats.chem}/${rules.chem} Chem, ${bestFail.stats.rating}/${rules.rating} OVR, ${bestFail.stats.clubs}/${rules.maxClubs} Clubs.`);
        console.log("BEST ATTEMPT:", bestFail.squad.map(p => `${p._staticData?.name} (R:${p.rating} C:${p.teamId} N:${p.nationId})`));
        return null;
    };

    // --- PHASE 6: EXECUTION ---
    let best = null;
    for (const anchor of anchors) {
        const res = traceGrowth(anchor);
        if (res && (!best || res.rating < best.rating)) best = res;
    }

    if (best) {
        log(`[DECISION] Victory! Built around ${best.squad[0]._staticData?.name}.`);
        const finalArray = new Array(23).fill(null);
        best.squad.forEach((p, i) => { if (p) finalArray[activeSlots[i].index] = p; });
        squad.setPlayers(finalArray);
        squad.onDataUpdated.notify();
        if (controller._pushSquadToView) controller._pushSquadToView(squad);
        win.services.SBC.saveChallenge(challenge).observe({name:'S'},(o,res)=>log("✅ SERVER SYNCED."));
    } else {
        log("❌ NO SOLUTION FOUND. Every path from the seeds hit a hard limit.");
    }

    function log(m) { console.log(`[FC-SBC] ${m}`); }
})();