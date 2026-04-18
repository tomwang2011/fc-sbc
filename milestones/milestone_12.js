(async function milestone12DualModeSolver() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;

    console.log("%c--- 🏆 MILESTONE 12: DUAL-MODE BRANCHING ENGINE ---", "font-size: 16px; font-weight: bold; color: #10b981;");

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

    // --- PHASE 2: CLASSIFICATION ---
    const isBucketA = rules.maxTotalNations <= 3 || rules.maxSameLeague >= 9 || rules.maxTotalLeagues <= 2;
    console.log(`[CLASSIFY] SBC Mode: ${isBucketA ? 'BUCKET A (Structural)' : 'BUCKET B (Chemistry)'}`);

    // --- PHASE 3: SYNC ---
    const fetchItems = (lid) => new Promise(r => {
        const criteria = new win.UTSearchCriteriaDTO();
        Object.assign(criteria, { type: 'player', count: 250, isUntradeable: "true", sortBy: "ovr", sort: "asc" });
        if (lid) criteria.league = lid;
        win.services.Club.search(criteria).observe({ name: 'f' }, (obs, res) => r(res.response?.items || []));
    });

    console.log("[SYNC] Syncing pool...");
    const disc = [13, 53, 19, 31, 16];
    const pools = await Promise.all([fetchItems(null), ...disc.map(l => fetchItems(l))]);
    const masterPool = pools.flat().map(p => { p._personaId = Number(p.definitionId) % 16777216; return p; })
        .filter(p => p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 89);

    // --- PHASE 4: TRIAL GENERATION ---
    let trials = [];
    if (isBucketA) {
        const overlaps = {};
        masterPool.forEach(p => {
            const k = `${p.leagueId}-${p.nationId}`;
            if (!overlaps[k]) overlaps[k] = { lid: p.leagueId, nid: p.nationId, count: 0 };
            overlaps[k].count++;
        });
        trials = Object.values(overlaps).sort((a,b) => b.count - a.count).slice(0, 15).map(ov => ({ ...ov, type: 'overlap' }));
    } else {
        const lStats = {}, nStats = {};
        masterPool.forEach(p => { lStats[p.leagueId] = (lStats[p.leagueId] || 0) + 1; nStats[p.nationId] = (nStats[p.nationId] || 0) + 1; });
        trials = [
            ...Object.entries(lStats).sort((a,b) => b[1]-a[1]).slice(0, 10).map(x => ({ id: parseInt(x[0]), type: 'league' })),
            ...Object.entries(nStats).sort((a,b) => b[1]-a[1]).slice(0, 10).map(x => ({ id: parseInt(x[0]), type: 'nation' }))
        ];
    }

    // --- PHASE 5: SOLVER ---
    const runTrial = (trial) => {
        const selected = new Array(11).fill(null);
        const usedIds = new Set(); const usedPersonaIds = new Set();
        const counts = { nation: new Map(), league: new Map(), club: {} };
        const fulfilled = new Array(rules.seeds.length).fill(0);
        let iterations = 0;

        const updateState = (p, add) => {
            const mod = add ? 1 : -1;
            counts.club[p.teamId] = (counts.club[p.teamId] || 0) + mod;
            rules.seeds.forEach((s, i) => {
                const match = (s.type === 'club' && s.ids.includes(p.teamId)) || (s.type === 'nation' && s.ids.includes(p.nationId)) || (s.type === 'league' && s.ids.includes(p.leagueId));
                if (match) fulfilled[i] += mod;
            });
            if (add) {
                counts.nation.set(p.nationId, (counts.nation.get(p.nationId) || 0) + 1);
                counts.league.set(p.leagueId, (counts.league.get(p.leagueId) || 0) + 1);
            } else {
                const nC = counts.nation.get(p.nationId) - 1;
                if (nC <= 0) counts.nation.delete(p.nationId); else counts.nation.set(p.nationId, nC);
                const lC = counts.league.get(p.leagueId) - 1;
                if (lC <= 0) counts.league.delete(p.leagueId); else counts.league.set(p.leagueId, lC);
            }
        };

        const isValid = (p, slotIdx) => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId)) return false;
            if ((counts.club[p.teamId] || 0) >= rules.maxSameClub) return false;
            if ((counts.nation.get(p.nationId) || 0) >= rules.maxSameNation) return false;
            if ((counts.league.get(p.leagueId) || 0) >= rules.maxSameLeague) return false;
            if (!counts.nation.has(p.nationId) && counts.nation.size >= rules.maxTotalNations) return false;
            if (!counts.league.has(p.leagueId) && counts.league.size >= rules.maxTotalLeagues) return false;
            const left = 11 - slotIdx - 1;
            for (let i = 0; i < rules.seeds.length; i++) { if (rules.seeds[i].count - fulfilled[i] > left + 1) return false; }
            return true;
        };

        const solve = (idx) => {
            iterations++; if (iterations > 5000) return false;
            if (idx === 11) {
                const tempArr = new Array(23).fill(null);
                activeSlots.forEach((slot, i) => tempArr[slot.index] = selected[i]);
                squad.setPlayers(tempArr);
                return calculateRating(selected) >= rules.targetRating && squad.getChemistry() >= rules.targetChem;
            }

            const slotPos = normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            const candidates = masterPool.filter(p => isValid(p, idx))
                .map(p => {
                    let score = 0;
                    rules.seeds.forEach((s, si) => { if (fulfilled[si] < s.count && ((s.type==='club' && s.ids.includes(p.teamId))||(s.type==='nation' && s.ids.includes(p.nationId))||(s.type==='league' && s.ids.includes(p.leagueId)))) score += 10000; });
                    
                    if (trial.type === 'overlap') {
                        if (p.leagueId === trial.lid && p.nationId === trial.nid) score += 5000;
                        else if (p.nationId === trial.nid) score += 1000;
                    } else if (trial.type === 'league' && p.leagueId === trial.id) score += 1000;
                    else if (trial.type === 'nation' && p.nationId === trial.id) score += 1000;
                    
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
    for (const t of trials) {
        console.log(`[TRIAL] Testing ${t.type}: ${t.lid || t.id}`);
        const res = runTrial(t);
        if (res) {
            const tempArr = new Array(23).fill(null);
            activeSlots.forEach((slot, i) => tempArr[slot.index] = res.squad[i]);
            squad.setPlayers(tempArr);
            const chem = squad.getChemistry();
            if (!best || chem > best.chem) { best = { squad: res.squad, chem, trial: t }; if (chem >= 33) break; }
        }
    }

    if (best) {
        console.log(`%c[WINNER] Found ${best.chem} Chem!`, "color: #10b981; font-weight: bold;");
        const finalArray = new Array(23).fill(null);
        best.squad.forEach((p, i) => finalArray[activeSlots[i].index] = p);
        squad.setPlayers(finalArray);
        squad.onDataUpdated.notify();
        if (controller._pushSquadToView) controller._pushSquadToView(squad);
        win.services.SBC.saveChallenge(challenge).observe({name:'S'},(o,res)=>console.log("✅ SERVER SYNCED."));
    } else { console.error("❌ NO SOLUTION FOUND."); }
})();
