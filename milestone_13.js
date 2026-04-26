(async function meticulousArchitectV30() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const log = (msg, color = "#9ca3af") => console.log(`%c[SBC-LOG] ${msg}`, `color: ${color};`);
    const success = (msg) => console.log(`%c[SBC-SUCCESS] ${msg}`, "color: #10b981; font-weight: bold;");
    const error = (msg) => console.log(`%c[SBC-ERROR] ${msg}`, "color: #ef4444; font-weight: bold;");

    log("🚀 Starting Architect V30 (Multi-Axis Optimization)...", "#3b82f6");

    // 1. Context
    const findSbc = (n) => {
        if (!n) return null;
        if (n._squad && n._challenge) return { challenge: n._challenge, squad: n._squad, controller: n };
        const kids = [...(n.childViewControllers || []), ...(n.presentedViewController ? [n.presentedViewController] : []), ...(n.currentController ? [n.currentController] : []), ...(n._viewControllers || [])];
        for (const k of kids) { const r = findSbc(k); if (r) return r; }
        return null;
    };
    const ctx = findSbc(win.getAppMain().getRootViewController());
    if (!ctx) return error("❌ SBC Screen Not Detected.");
    const { challenge, squad, controller } = ctx;

    // 2. Parse
    const summary = { minRating: 0, minChem: 0, maxSameClub: 11, minNations: 1, minLeagues: 1 };
    const getVal = (v) => (v?.value !== undefined ? v.value : v);
    challenge.eligibilityRequirements.forEach(r => {
        const col = r.kvPairs?._collection || r.kvPairs || {};
        for (let k in col) {
            const key = parseInt(k), vals = [].concat(Array.isArray(col[k]) ? col[k].map(getVal) : getVal(col[k])), val = (r.count === -1) ? vals[0] : r.count;
            if (key === 19) summary.minRating = val;
            if (key === 35 || key === 20) summary.minChem = val;
            if (r.scope === 1 && key === 6) summary.maxSameClub = val;
            if (r.scope === 0) {
                if (key === 7) summary.minNations = val;
                if (key === 8) summary.minLeagues = val;
            }
        }
    });

    // 3. Deep Fetch
    const fetchPage = (lvl, page) => new Promise(res => {
        const c = new win.UTSearchCriteriaDTO();
        Object.assign(c, { type: 'player', count: 250, isUntradeable: "true", excludeLoans: true, level: lvl, offset: page * 250 });
        win.services.Club.search(c).observe(this, (o, r) => res(r.response?.items || []));
    });

    const pages = await Promise.all([fetchPage('gold', 0), fetchPage('gold', 1), fetchPage('gold', 2), fetchPage('silver', 0)]);
    const ratingFloor = Math.max(0, summary.minRating - 3);
    
    const normalizePos = (id) => {
        const rid = (typeof id === 'object' && id !== null) ? id.id : id;
        const m = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
        return m[rid] || rid;
    };

    const pool = [].concat(...pages).filter((p, i, a) => 
        p.id && a.findIndex(x => x.id === p.id) === i && !p.evolutionInfo && p.rating >= ratingFloor && p.rating <= 85
    ).sort((a,b) => a.rating - b.rating);

    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10).map(s => ({
        index: s.index, pos: normalizePos(s.positionId || s.position?.id)
    }));

    const calcRating = (arr) => {
        const rt = arr.map(p => p.rating), sum = rt.reduce((a,b)=>a+b,0), avg = sum/11;
        let cf=0; rt.forEach(v=>{if(v>avg)cf+=(v-avg);});
        return Math.floor((sum+cf)/11 + 0.0401);
    };

    // 4. MULTI-AXIS OPTIMIZATION
    const optimizeFodder = (items) => {
        let current = [...items];
        let changed = true;
        log("🔍 Starting Multi-Axis Optimization...");
        
        const tryApply = (next) => {
            if (calcRating(next) < summary.minRating) return false;
            const fArr = new Array(23).fill(null);
            activeSlots.forEach((slot, idx) => fArr[slot.index] = next[idx]);
            squad.setPlayers(fArr);
            return squad.getChemistry() >= summary.minChem;
        };

        while (changed) {
            changed = false;
            
            // Pass 1: Aggressive Solo Downgrade
            const sortedByRating = current.map((p, i) => ({ p, i })).sort((a, b) => b.p.rating - a.p.rating);
            for (const { p, i } of sortedByRating) {
                const possible = pool.filter(cand => !current.some(ci => ci.id === cand.id) && cand.rating < p.rating && normalizePos(cand.preferredPosition) === normalizePos(p.preferredPosition)).sort((a,b) => a.rating - b.rating);
                for (const swap of possible) {
                    const next = [...current]; next[i] = swap;
                    if (tryApply(next)) { current = next; changed = true; log(`[SOLO] Downgraded ${p.rating} -> ${swap.rating}`); break; }
                }
                if (changed) break;
            }
            if (changed) continue;

            // Pass 2: Pair-Wise Bridge (Bridge Swaps)
            for (let i = 0; i < current.length && !changed; i++) {
                for (let j = 0; j < current.length && !changed; j++) {
                    if (i === j) continue;
                    const pI = current[i], pJ = current[j];
                    if (pI.rating < 76 && pJ.rating < 76) continue;

                    const candsI = pool.filter(c => !current.some(ci => ci.id === c.id) && normalizePos(c.preferredPosition) === normalizePos(pI.preferredPosition)).slice(0, 10);
                    const candsJ = pool.filter(c => !current.some(ci => ci.id === c.id) && normalizePos(c.preferredPosition) === normalizePos(pJ.preferredPosition)).slice(0, 10);

                    for (const cI of candsI) {
                        for (const cJ of candsJ) {
                            if (cI.id === cJ.id || (cI.rating + cJ.rating >= pI.rating + pJ.rating)) continue;
                            const next = [...current]; next[i] = cI; next[j] = cJ;
                            if (tryApply(next)) {
                                current = next; changed = true;
                                log(`[BRIDGE] Optimized Pair: (${pI.rating},${pJ.rating}) -> (${cI.rating},${cJ.rating})`);
                                break;
                            }
                        }
                        if (changed) break;
                    }
                }
            }
        }
        return current;
    };

    // 5. Template Engine
    const solve = (lA, lB) => {
        const selected = new Array(activeSlots.length).fill(null);
        const usedIds = new Set();
        const counts = { nation: new Map(), league: new Map(), club: new Map() };
        let iterations = 0;

        const updateMap = (map, key, mod) => {
            const v = (map.get(key) || 0) + mod;
            if (v <= 0) map.delete(key); else map.set(key, v);
        };

        const recurse = (idx) => {
            iterations++;
            if (iterations > 15000) return false;

            if (idx === activeSlots.length) {
                if (calcRating(selected) < summary.minRating) return false;
                const fArr = new Array(23).fill(null);
                activeSlots.forEach((s, i) => fArr[s.index] = selected[i]);
                squad.setPlayers(fArr);
                return (squad.getChemistry() >= summary.minChem && counts.nation.size >= summary.minNations);
            }

            const slot = activeSlots[idx];
            const candidates = pool.filter(p => {
                if (usedIds.has(p.id) || normalizePos(p.preferredPosition) !== slot.pos) return false;
                if (p.leagueId !== lA && p.leagueId !== lB) return false; 
                if (counts.nation.size >= 3 && !counts.nation.has(p.nationId)) return false;
                if ((counts.club.get(p.teamId)||0) >= summary.maxSameClub) return false;
                return true;
            }).map(p => {
                let s = 0;
                if (counts.club.get(p.teamId) === 1) s += 30000;
                if (counts.nation.get(p.nationId) === 1) s += 20000;
                return { p, s };
            }).sort((a,b) => b.s - a.s || (a.p.rating - b.p.rating)).slice(0, 10).map(c => c.p);

            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id);
                updateMap(counts.club, p.teamId, 1); updateMap(counts.nation, p.nationId, 1); updateMap(counts.league, p.leagueId, 1);
                if (recurse(idx + 1)) return true;
                updateMap(counts.club, p.teamId, -1); updateMap(counts.nation, p.nationId, -1); updateMap(counts.league, p.leagueId, -1);
                selected[idx] = null; usedIds.delete(p.id);
            }
            return false;
        };
        if (recurse(0)) return selected;
        return null;
    };

    // 6. Loop
    const leagues = {};
    pool.forEach(p => { if(!leagues[p.leagueId]) leagues[p.leagueId] = 0; leagues[p.leagueId]++; });
    const trialLeagues = Object.keys(leagues).filter(id => leagues[id] >= 5).sort((a,b) => leagues[b] - leagues[a]).map(Number).slice(0, 8);

    for (let i=0; i<trialLeagues.length; i++) {
        for (let j=i+1; j<trialLeagues.length; j++) {
            log(`... Trial: L${trialLeagues[i]} + L${trialLeagues[j]}`);
            const result = solve(trialLeagues[i], trialLeagues[j]);
            if (result) {
                const optimized = optimizeFodder(result);
                const finalArr = new Array(23).fill(null);
                activeSlots.forEach((s, i) => finalArr[s.index] = optimized[i]);
                squad.setPlayers(finalArr);
                win.services.SBC.saveChallenge(challenge).observe(this, (o, r) => {
                    squad.onDataUpdated.notify();
                    if (controller._pushSquadToView) controller._pushSquadToView(squad);
                    success("✨ OPTIMIZED (V30) SOLUTION APPLIED.");
                });
                return;
            }
        }
    }
    error("❌ Strategy exhausted.");
})();
