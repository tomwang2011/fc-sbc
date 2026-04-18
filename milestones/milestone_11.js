(async function milestone11BucketAOverhaulV12() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 🏆 MILESTONE 11: BUCKET-A OVERLAP ENGINE (V12) ---", "font-size: 16px; font-weight: bold; color: #10b981;");

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
        const rawId = typeof id === 'object' ? id.id : id;
        return map[rawId] || rawId;
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

    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);

    // --- STEP 1: PARSER ---
    const rules = {
        targetRating: 0, targetChem: 0, minGold: 0, minRare: 0,
        maxSameClub: 11, maxSameNation: 11, maxSameLeague: 11,
        maxTotalNations: 11, maxTotalLeagues: 11,
        seeds: [] 
    };

    (challenge.eligibilityRequirements || []).forEach((r, idx) => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const key = parseInt(k);
            const val = getCleanValue(col[k]);
            const vals = (Array.isArray(val) ? val : [val]).filter(v => v !== undefined);
            if (key === 19) rules.targetRating = Math.max(rules.targetRating, vals[0] || 0);
            if (key === 35 || key === 20) rules.targetChem = Math.max(rules.targetChem, vals[0] || 0);
            if (key === 17 && vals.includes(3)) rules.minGold = r.count;
            if (key === 25 && vals.includes(4)) rules.minRare = r.count;
            if (r.count === -1) {
                if (r.scope === 1) {
                    if (key === 5 || key === 7 || key === 9) rules.maxTotalNations = Math.min(rules.maxTotalNations, vals[0]);
                    if (key === 6 || key === 10 || key === 12) rules.maxTotalLeagues = Math.min(rules.maxTotalLeagues, vals[0]);
                } else {
                    if (key === 5 || key === 9) rules.maxSameNation = Math.min(rules.maxSameNation, vals[0]);
                    if (key === 6 || key === 10) rules.maxSameLeague = Math.min(rules.maxSameLeague, vals[0]);
                    if (key === 7 || key === 12) rules.maxSameClub = Math.min(rules.maxSameClub, vals[0]);
                }
            } else {
                const validIds = vals.filter(id => id > 0);
                if (validIds.length > 0) {
                    const type = (key === 14 || key === 12 || key === 7) ? 'club' : ((key === 15 || key === 5 || key === 9) ? 'nation' : 'league');
                    rules.seeds.push({ type, ids: validIds, count: r.count });
                }
            }
        }
    });

    console.log("%c[CHECKLIST] Rule Validation:", "font-weight: bold; color: #10b981;");
    console.table(rules);

    // --- STEP 2: SYNC ---
    const fetchItems = (lid) => new Promise(r => {
        const criteria = new win.UTSearchCriteriaDTO();
        Object.assign(criteria, { type: 'player', count: 250, isUntradeable: "true", sortBy: "ovr", sort: "asc" });
        if (lid) criteria.league = lid;
        win.services.Club.search(criteria).observe({ name: 'f' }, (obs, res) => r(res.response?.items || []));
    });

    console.log("[SYNC] Mapping inventory...");
    const disc = [13, 53, 19, 31, 16];
    const pools = await Promise.all([fetchItems(null), ...disc.map(l => fetchItems(l))]);
    const masterPool = pools.flat().map(p => { p._personaId = Number(p.definitionId) % 16777216; return p; })
        .filter(p => p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 89);

    // --- STEP 3: OVERLAP DISCOVERY (The Power Core) ---
    const overlaps = {};
    masterPool.forEach(p => {
        const key = `${p.leagueId}-${p.nationId}`;
        if (!overlaps[key]) overlaps[key] = { lid: p.leagueId, nid: p.nationId, count: 0, golds: 0 };
        overlaps[key].count++;
        if (p.rating >= 75) overlaps[key].golds++;
    });

    const trialOverlaps = Object.values(overlaps)
        .sort((a,b) => b.count - a.count)
        .slice(0, 15);
    
    console.log("[EVAL] Discovered Power Overlaps (League-Nation):", trialOverlaps.slice(0, 5));

    // --- STEP 4: SOLVER ---
    const runTrial = (overlap) => {
        const selected = new Array(11).fill(null);
        const usedIds = new Set(); const usedPersonaIds = new Set();
        const state = { gold: 0, rare: 0, nations: new Map(), leagues: new Map(), counts: { club: {} }, seeds: rules.seeds.map(s => ({ ...s, current: 0 })) };
        let iterations = 0;

        const updateState = (p, add) => {
            const mod = add ? 1 : -1;
            if (p.rating >= 75) state.gold += mod;
            if (p.rareflag === 1) state.rare += mod;
            state.counts.club[p.teamId] = (state.counts.club[p.teamId] || 0) + mod;
            if (add) {
                state.nations.set(p.nationId, (state.nations.get(p.nationId) || 0) + 1);
                state.leagues.set(p.leagueId, (state.leagues.get(p.leagueId) || 0) + 1);
            } else {
                const nC = state.nations.get(p.nationId) - 1;
                if (nC <= 0) state.nations.delete(p.nationId); else state.nations.set(p.nationId, nC);
                const lC = state.leagues.get(p.leagueId) - 1;
                if (lC <= 0) state.leagues.delete(p.leagueId); else state.leagues.set(p.leagueId, lC);
            }
        };

        const isValid = (p, slotIdx) => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId)) return false;
            if ((state.counts.club[p.teamId] || 0) >= rules.maxSameClub) return false;
            if ((state.nations.get(p.nationId) || 0) >= rules.maxSameNation) return false;
            if ((state.leagues.get(p.leagueId) || 0) >= rules.maxSameLeague) return false;
            if (!state.nations.has(p.nationId) && state.nations.size >= rules.maxTotalNations) return false;
            if (!state.leagues.has(p.leagueId) && state.leagues.size >= rules.maxTotalLeagues) return false;
            
            const left = 11 - slotIdx - 1;
            if (state.gold < rules.minGold && (rules.minGold - state.gold) > (left + (p.rating >= 75 ? 1 : 0))) return false;
            if (state.rare < rules.minRare && (rules.minRare - state.rare) > (left + (p.rareflag === 1 ? 1 : 0))) return false;
            return true;
        };

        const solve = (idx) => {
            iterations++; if (iterations > 6000) return false;
            if (idx === 11) {
                const tempPlayers = new Array(23).fill(null);
                activeSlots.forEach((slot, i) => tempPlayers[slot.index] = selected[i]);
                squad.setPlayers(tempPlayers);
                return calculateRating(selected) >= rules.targetRating && squad.getChemistry() >= rules.targetChem;
            }

            const slotPos = normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            const candidates = masterPool.filter(p => isValid(p, idx))
                .map(p => {
                    let score = 0;
                    // BUCKET A CORE PRIORITY
                    if (p.leagueId === overlap.lid && p.nationId === overlap.nid) score += 10000;
                    else if (p.nationId === overlap.nid) score += 5000; // Prefer same nation if league full
                    
                    if (normalizePos(p.preferredPosition) === slotPos) score += 500;
                    return { p, score };
                })
                .sort((a,b) => b.score - a.score || (a.p.rating - b.p.rating))
                .slice(0, 15).map(c => c.p);

            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId);
                updateState(p, true);
                if (solve(idx + 1)) return true;
                updateState(p, false);
                selected[idx] = null; usedIds.delete(p.id); usedPersonaIds.delete(p._personaId);
            }
            return false;
        };

        return solve(0) ? { squad: [...selected] } : null;
    };

    let best = null;
    for (const ov of trialOverlaps) {
        console.log(`[TRIAL] Testing Overlap L:${ov.lid} N:${ov.nid} (Available: ${ov.count})`);
        const res = runTrial(ov);
        if (res) {
            const tempPlayers = new Array(23).fill(null);
            activeSlots.forEach((slot, i) => tempPlayers[slot.index] = res.squad[i]);
            squad.setPlayers(tempPlayers);
            const chem = squad.getChemistry();
            if (!best || chem > best.chem) { best = { squad: res.squad, chem, ov }; if (chem >= 33) break; }
        }
    }

    if (best) {
        console.log(`%c[WINNER] Success via L:${best.ov.lid} N:${best.ov.nid}!`, "color: #10b981; font-weight: bold;");
        const finalArray = new Array(23).fill(null);
        best.squad.forEach((p, i) => finalArray[activeSlots[i].index] = p);
        squad.setPlayers(finalArray);
        squad.onDataUpdated.notify();
        if (controller._pushSquadToView) controller._pushSquadToView(squad);
        win.services.SBC.saveChallenge(challenge).observe({name:'S'},(o,res)=>console.log("✅ SERVER SYNCED."));
    } else { console.error("❌ NO SOLUTION FOUND."); }
})();
