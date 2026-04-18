(async function milestone13ChemistryEngineV24() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 🏆 MILESTONE 13: CHEMISTRY-MAXIMIZING ENGINE (V24) ---", "font-size: 16px; font-weight: bold; color: #ec4899;");

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

    const calculateRating = (items) => {
        const active = items.filter(p => p !== null);
        if (active.length < 11) return 0;
        const ratings = active.map(p => p.rating);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0; ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        return Math.floor((sum + cf) / 11 + 0.0401);
    };

    const normalizePos = (id) => {
        const map = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
        const rawId = typeof id === 'object' ? id.id : id;
        return map[rawId] || rawId;
    };

    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);

    // --- PHASE 1: PARSER ---
    const rules = {
        targetRating: 0, targetChem: 0, minGold: 0, minRare: 0,
        maxSameClub: 11, maxSameNation: 11, maxSameLeague: 11,
        maxTotalNations: 11, maxTotalLeagues: 11,
        seeds: [] 
    };

    (challenge.eligibilityRequirements || []).forEach(r => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const key = parseInt(k);
            const vals = getCleanValue(col[k]);
            const val = Array.isArray(vals) ? vals[0] : vals;
            if (key === 19) rules.targetRating = Math.max(rules.targetRating, val || 0);
            if (key === 35 || key === 20) rules.targetChem = Math.max(rules.targetChem, val || 0);
            if (key === 17 && vals.includes(3)) rules.minGold = r.count;
            if (key === 25 && vals.includes(4)) rules.minRare = r.count;
            if (r.count === -1) {
                if (key === 6 && r.scope === 1) rules.maxSameClub = Math.min(rules.maxSameClub, val);
                if (key === 7 && r.scope === 1) rules.maxTotalNations = Math.min(rules.maxTotalNations, val);
                if (key === 9 && r.scope === 1) rules.maxSameNation = Math.min(rules.maxSameNation, val);
                if (key === 5 && r.scope === 0) rules.maxTotalNations = Math.min(rules.maxTotalNations, val);
            } else {
                const isEntity = [14, 12, 10, 11, 5, 15, 6, 7, 9].includes(key);
                const validIds = (Array.isArray(vals) ? vals : [vals]).filter(id => id > 0);
                if (isEntity && validIds.length > 0) {
                    const type = (key === 14 || key === 12 || key === 7 || key === 6) ? 'club' : ([10, 11].includes(key) ? 'league' : 'nation');
                    rules.seeds.push({ type, ids: validIds, count: r.count });
                }
            }
        }
    });

    // --- PHASE 2: SYNC ---
    const fetchItems = (lid) => new Promise(r => {
        const criteria = new win.UTSearchCriteriaDTO();
        Object.assign(criteria, { type: 'player', count: 250, isUntradeable: "true", sortBy: "ovr", sort: "asc" });
        if (lid) criteria.league = lid;
        win.services.Club.search(criteria).observe({ name: 'f' }, (obs, res) => r(res.response?.items || []));
    });

    console.log("[SYNC] Multi-Axis Sync...");
    const pools = await Promise.all([fetchItems(null), fetchItems(13), fetchItems(53), fetchItems(19), fetchItems(31), fetchItems(16)]);
    const masterPool = pools.flat().map(p => { p._personaId = Number(p.definitionId) % 16777216; return p; })
        .filter(p => p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 89);

    // --- PHASE 3: SOLVER ---
    const runTrial = (coreLid) => {
        const selected = new Array(11).fill(null);
        const usedIds = new Set(); const usedPersonaIds = new Set();
        const state = { nation: new Map(), league: new Map(), club: new Map() };
        let iterations = 0;
        let bestSeen = { rating: 0, chem: 0 };

        const updateState = (p, add) => {
            const mod = add ? 1 : -1;
            state.club.set(p.teamId, (state.club.get(p.teamId) || 0) + mod);
            state.nation.set(p.nationId, (state.nation.get(p.nationId) || 0) + mod);
            state.league.set(p.leagueId, (state.league.get(p.leagueId) || 0) + mod);
        };

        const getChemScore = (p) => {
            // Chemistry Dot Thresholds
            // Club: 2 (+1), 4 (+1), 7 (+1)
            // Nation: 3 (+1), 6 (+1), 9 (+1)
            // League: 3 (+1), 5 (+1), 8 (+1)
            let score = 0;
            const cCount = (state.club.get(p.teamId) || 0) + 1;
            const nCount = (state.nation.get(p.nationId) || 0) + 1;
            const lCount = (state.league.get(p.leagueId) || 0) + 1;

            if ([2, 4, 7].includes(cCount)) score += 3000;
            if ([3, 6, 9].includes(nCount)) score += 1000;
            if ([3, 5, 8].includes(lCount)) score += 1000;

            if (p.leagueId === coreLid) score += 500;
            return score;
        };

        const solve = (idx) => {
            iterations++; if (iterations > 15000) return false;
            if (idx === 11) {
                const tempArr = new Array(23).fill(null);
                activeSlots.forEach((slot, i) => tempArr[slot.index] = selected[i]);
                squad.setPlayers(tempArr);
                const r = calculateRating(selected);
                const c = squad.getChemistry();
                bestSeen.rating = Math.max(bestSeen.rating, r);
                bestSeen.chem = Math.max(bestSeen.chem, c);
                return r >= rules.targetRating && c >= rules.targetChem;
            }

            const slotPos = normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            
            const candidates = masterPool.filter(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId))
                .filter(p => (state.club.get(p.teamId) || 0) < rules.maxSameClub)
                .map(p => {
                    let score = getChemScore(p);
                    if (normalizePos(p.preferredPosition) === slotPos) score += 5000;
                    return { p, score };
                })
                .sort((a,b) => b.score - a.score || (b.p.rating - a.p.rating))
                .slice(0, 12).map(c => c.p);

            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId);
                updateState(p, true);
                if (solve(idx + 1)) return true;
                updateState(p, false);
                selected[idx] = null; usedIds.delete(p.id); usedPersonaIds.delete(p._personaId);
            }
            return false;
        };

        const result = solve(0);
        if (!result) console.log(`[TRIAL] Core ${coreLid} failed. Best R:${bestSeen.rating} C:${bestSeen.chem}`);
        return result ? [...selected] : null;
    };

    // START
    const lStats = {}; masterPool.forEach(p => lStats[p.leagueId] = (lStats[p.leagueId] || 0) + 1);
    const targets = Object.entries(lStats).sort((a,b) => b[1]-a[1]).slice(0, 8).map(x => parseInt(x[0]));

    for (const lid of targets) {
        console.log(`[EXEC] Testing League ${lid}...`);
        const squadItems = runTrial(lid);
        if (squadItems) {
            console.log("%c✅ SUCCESS!", "color: #10b981; font-weight: bold;");
            // Perform Seed Injection (same as V23)
            let currentSquad = [...squadItems];
            let usedIds = new Set(currentSquad.map(p => p.id));
            let usedPersonas = new Set(currentSquad.map(p => p._personaId));

            let success = true;
            for (const seed of rules.seeds) {
                let fulfilled = currentSquad.filter(p => (seed.type === 'club' && seed.ids.includes(p.teamId)) || (seed.type === 'nation' && seed.ids.includes(p.nationId)) || (seed.type === 'league' && seed.ids.includes(p.leagueId))).length;
                while (fulfilled < seed.count) {
                    const replacement = masterPool.find(p => !usedIds.has(p.id) && !usedPersonas.has(p._personaId) && ((seed.type === 'club' && seed.ids.includes(p.teamId)) || (seed.type === 'nation' && seed.ids.includes(p.nationId)) || (seed.type === 'league' && seed.ids.includes(p.leagueId))));
                    if (!replacement) { success = false; break; }
                    const killIdx = currentSquad.findIndex(p => !rules.seeds.some(s => (s.type === 'club' && s.ids.includes(p.teamId)) || (s.type === 'nation' && s.ids.includes(p.nationId)) || (s.type === 'league' && s.ids.includes(p.leagueId))));
                    if (killIdx === -1) { success = false; break; }
                    currentSquad[killIdx] = replacement;
                    usedIds.add(replacement.id); usedPersonas.add(replacement._personaId);
                    fulfilled++;
                }
                if (!success) break;
            }

            if (success) {
                const final = new Array(23).fill(null);
                activeSlots.forEach((slot, i) => final[slot.index] = currentSquad[i]);
                squad.setPlayers(final);
                squad.onDataUpdated.notify();
                return;
            }
        }
    }
})();
