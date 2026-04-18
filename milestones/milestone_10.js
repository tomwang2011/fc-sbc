(async function milestone10ChallengeSolverV40() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 🏆 MILESTONE 10: CHALLENGE/MM SOLVER (V40) ---", "font-size: 16px; font-weight: bold; color: #f59e0b;");
    console.log("[STRATEGY] V40: Semantic Requirement Parsing + Entity-First Seeding.");

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

    // --- PHASE 1: SEMANTIC PARSER ---
    const rules = {
        rating: 0, chem: 0, gold: 0, rare: 0,
        maxTotalNations: 11, maxTotalLeagues: 11, maxTotalClubs: 11,
        maxSameNation: 11, maxSameLeague: 11, maxSameClub: 11,
        filters: [] // { type: 'club'|'nation', ids: [], count: number, label: string }
    };

    (challenge.eligibilityRequirements || []).forEach(r => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const key = parseInt(k);
            const val = getCleanValue(col[k]);
            const vals = Array.isArray(val) ? val : [val];

            if (key === 19) rules.rating = Math.max(rules.rating, vals[0] || 0);
            if (key === 35 || key === 20) rules.chem = Math.max(rules.chem, vals[0] || 0);
            if (key === 17 && vals.includes(3)) rules.gold = r.count;
            if (key === 25 && (vals.includes(4) || vals === 4)) rules.rare = r.count;

            // Diversity Mapping
            if (key === 5) rules.maxSameNation = vals[0];
            if (key === 6) rules.maxSameLeague = vals[0];
            if (key === 7) rules.maxSameClub = vals[0];
            if (key === 9 && vals[0] === -1) rules.maxTotalNations = r.count;
            if (key === 10 && vals[0] === -1) rules.maxTotalLeagues = r.count;
            if (key === 12 && vals[0] === -1) rules.maxTotalClubs = r.count;

            // Entity Mapping (Specific Clubs/Nations)
            if (key === 14) rules.filters.push({ type: 'club', ids: vals, count: r.count, label: r.requirementLabel });
            if (key === 15 && vals[0] > 0) rules.filters.push({ type: 'nation', ids: vals, count: r.count, label: r.requirementLabel });
            if (key === 11 && vals[0] > 10) rules.filters.push({ type: 'league', ids: vals, count: r.count, label: r.requirementLabel });
        }
    });
    console.log("[SEMANTIC] Identifying Requirements:", rules);

    // --- PHASE 2: INVENTORY ---
    const fetchItems = (lid) => new Promise(r => {
        const criteria = new win.UTSearchCriteriaDTO();
        Object.assign(criteria, { type: 'player', count: 250, isUntradeable: "true", sortBy: "ovr", sort: "asc" });
        if (lid) criteria.league = lid;
        win.services.Club.search(criteria).observe({ name: 'f' }, (obs, res) => r(res.response?.items || []));
    });

    log("[SYNC] Mapping inventory pools...");
    const pools = await Promise.all([
        fetchItems(null), fetchItems(13), fetchItems(53), fetchItems(19),
        new Promise(r => win.services.Item.searchStorageItems(new win.UTSearchCriteriaDTO()).observe({name:'s'},(o,res)=>r(res.response?.items || [])))
    ]);
    const masterPool = pools.flat().map(p => { p._personaId = Number(p.definitionId) % 16777216; return p; })
        .filter(p => p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 85);

    // --- PHASE 3: CHEM ENGINE ---
    const getStats = (items) => {
        const active = items.filter(p => p !== null);
        if (active.length === 0) return { chem: 0, rating: 0, gold: 0, rare: 0, filtersMet: true };
        
        // Rating math
        const ratings = active.map(p => p.rating);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0; ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        const rating = Math.floor((sum + cf) / 11 + 0.0401);

        // Chem math
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

        const filtersMet = rules.filters.every(f => {
            const count = active.filter(p => {
                if (f.type === 'club') return f.ids.includes(p.teamId);
                if (f.type === 'nation') return f.ids.includes(p.nationId);
                if (f.type === 'league') return f.ids.includes(p.leagueId);
                return false;
            }).length;
            return count >= f.count;
        });

        return { 
            chem: totalChem, rating, gold: active.filter(p => p.rating >= 75).length, rare: active.filter(p => p.rareflag === 1).length, 
            nations: new Set(active.map(p => p.nationId)).size, clubs: new Set(active.map(p => p.teamId)).size, leagues: new Set(active.map(p => p.leagueId)).size, filtersMet 
        };
    };

    // --- PHASE 4: BACKTRACKER ---
    const runTrial = (lid, nid) => {
        const selected = new Array(11).fill(null);
        const usedIds = new Set(); const usedPersonaIds = new Set();
        const counts = { gold: 0, rare: 0 };
        let iterations = 0;

        const isValid = (p, slotIdx) => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId)) return false;
            
            // Check Diversity
            const curN = new Set(selected.filter(x => x).map(x => x.nationId));
            if (!curN.has(p.nationId) && curN.size >= rules.maxTotalNations) return false;
            const curC = new Set(selected.filter(x => x).map(x => x.teamId));
            if (!curC.has(p.teamId) && curC.size >= rules.maxTotalClubs) return false;
            const curL = new Set(selected.filter(x => x).map(x => x.leagueId));
            if (!curL.has(p.leagueId) && curL.size >= rules.maxTotalLeagues) return false;

            const left = 11 - slotIdx - 1;
            if (rules.gold > counts.gold && (rules.gold - counts.gold) > left + (p.rating >= 75 ? 1 : 0)) return false;
            if (rules.rare > counts.rare && (rules.rare - counts.rare) > left + (p.rareflag === 1 ? 1 : 0)) return false;
            return true;
        };

        const pool = [...masterPool].sort((a,b) => {
            const aS = rules.filters.some(f => (f.type==='club' && f.ids.includes(a.teamId)) || (f.type==='nation' && f.ids.includes(a.nationId)));
            const bS = rules.filters.some(f => (f.type==='club' && f.ids.includes(b.teamId)) || (f.type==='nation' && f.ids.includes(b.nationId)));
            if (aS !== bS) return aS ? -1 : 1;
            const aC = a.leagueId === lid && a.nationId === nid; const bC = b.leagueId === lid && b.nationId === nid;
            if (aC !== bC) return aC ? -1 : 1;
            return a.rating - b.rating;
        });

        const solve = (idx) => {
            iterations++; if (iterations > 4000) return false;
            if (idx === 11) return getStats(selected).rating >= rules.rating;
            const slotPos = normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            const candidates = pool.filter(p => isValid(p, idx)).sort((a,b) => (normalizePos(a.preferredPosition) === slotPos ? -1 : 1) || (a.rating - b.rating)).slice(0, 15);
            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId);
                if (p.rating >= 75) counts.gold++; if (p.rareflag === 1) counts.rare++;
                if (solve(idx + 1)) return true;
                selected[idx] = null; usedIds.delete(p.id); usedPersonaIds.delete(p._personaId);
                if (p.rating >= 75) counts.gold--; if (p.rareflag === 1) counts.rare--;
            }
            return false;
        };
        return solve(0) ? { squad: selected, lid, nid } : null;
    };

    // --- PHASE 5: EVALUATION ---
    const lCounts = {}; masterPool.forEach(p => lCounts[p.leagueId] = (lCounts[p.leagueId] || 0) + 1);
    const topL = Object.entries(lCounts).sort((a,b) => b[1]-a[1]).slice(0, 10).map(x => parseInt(x[0]));
    let best = null;

    for (const lid of topL) {
        const lp = masterPool.filter(p => p.leagueId === lid);
        const nc = {}; lp.forEach(p => nc[p.nationId] = (nc[p.nationId] || 0) + 1);
        const nations = Object.entries(nc).sort((a,b) => b[1]-a[1]).slice(0, 3).map(x => parseInt(x[0]));
        for (const nid of nations) {
            const res = runTrial(lid, nid);
            if (!res) continue;
            const stats = getStats(res.squad);
            const valid = stats.chem >= rules.chem && stats.rating >= rules.rating && stats.filtersMet && stats.nations <= rules.maxTotalNations && stats.clubs <= rules.maxTotalClubs;
            log(`[SIM] Trial L:${lid} N:${nid} | Chem: ${stats.chem}, Valid: ${valid}`);
            const score = (stats.chem * 100) + (1000 - Math.abs(stats.rating - rules.rating) * 10);
            if (valid && (!best || score > best.score)) best = { ...res, ...stats, valid, score };
        }
    }

    if (best) {
        log(`[DECISION] Winner found! Applying L:${best.lid} N:${best.nid} (${best.chem} Chem).`);
        const finalArray = new Array(23).fill(null);
        best.squad.forEach((p, i) => { if (p) finalArray[activeSlots[i].index] = p; });
        squad.setPlayers(finalArray);
        squad.onDataUpdated.notify();
        if (controller._pushSquadToView) controller._pushSquadToView(squad);
        console.table([
            { Rule: "Chemistry", Target: rules.chem, Actual: best.chem, Status: "✅" },
            { Rule: "OVR Rating", Target: rules.rating, Actual: best.rating, Status: "✅" },
            { Rule: "Nations Diversity", Target: rules.maxTotalNations, Actual: best.nations, Status: "✅" },
            { Rule: "Specific Entities", Target: rules.filters.length, Actual: "MET", Status: "✅" }
        ]);
        win.services.SBC.saveChallenge(challenge).observe({name:'S'},(o,res)=>log("✅ SERVER SYNCED."));
    } else {
        log("❌ NO VALID SOLUTION meeting all criteria found.");
    }

    function log(m) { console.log(`[FC-SBC] ${m}`); }
})();