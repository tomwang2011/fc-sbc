(async function milestone4RatingSolverV4() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    
    console.log("%c--- 🧠 MILESTONE 4: STRATEGY-AWARE SOLVER ---", "font-size: 16px; font-weight: bold; color: #f39c12;");

    // 1. Context & Requirement Detection
    const findContext = (n) => {
        if (!n) return null;
        const challenge = n._challenge || (n._overviewController?._challenge) || (n._parentViewController?._challenge);
        const squad = n._squad || (n._squadController?._squad);
        if (challenge && squad) return { challenge, squad, controller: n };
        const children = [...(n.childViewControllers || []), ...(n.presentedViewController ? [n.presentedViewController] : []), ...(n.currentController ? [n.currentController] : []), ...(n._viewControllers || [])];
        for (const c of children) {
            const f = findContext(c);
            if (f) return f;
        }
        return null;
    };

    const ctx = findContext(win.getAppMain().getRootViewController());
    if (!ctx) return console.error("❌ SBC screen not detected.");
    const { challenge, squad, controller } = ctx;

    const requirements = (challenge.eligibilityRequirements || []).map((req) => {
        const col = req.kvPairs._collection || req.kvPairs;
        const rules = [];
        for (let key in col) {
            const val = col[key];
            const cleanValue = Array.isArray(val) ? val[0] : (val && val.value !== undefined ? val.value : val);
            rules.push({ key: parseInt(key), value: cleanValue });
        }
        return { rules, count: req.count, description: req.requirementLabel || "General" };
    });

    const ratingReq = requirements.find(r => r.rules.some(rule => rule.key === 19));
    const targetRating = ratingReq ? ratingReq.rules.find(rule => rule.key === 19).value : 84;

    // 2. Multi-Stage Priming (Strategy-Aware)
    const fetchPlayers = (criteria) => {
        return new Promise((resolve) => {
            const searchCriteria = new win.UTSearchCriteriaDTO();
            Object.assign(searchCriteria, { type: 'player', count: 150, excludeLimitedUse: true, ...criteria });
            win.services.Club.search(searchCriteria).observe({ name: "SolverPrime" }, (obs, res) => {
                const items = (res.response?.items || res.items || []).filter(p => {
                    const isLoan = (typeof p.isLoanItem === 'function' && p.isLoanItem()) || (p.loan && p.loan > 0) || p.limitedUseType === 2;
                    const isEvo = (typeof p.isEvo === 'function' && p.isEvo()) || !!p.evolutionInfo || p.rareflag === 116 || p.upgrades !== null;
                    return !isLoan && !isEvo;
                });
                resolve(items);
            });
        });
    };

    const mandatoryPool = [];
    let fillerLeague = 13; // Default to PL

    // Stage 1: Detect Specific League/Nation/Rarity requirements
    for (const req of requirements) {
        if (req.count <= 0) continue; 

        const criteria = {};
        req.rules.forEach(rule => {
            if (rule.key === 18 && rule.value === 3) { criteria.rarities = [3]; criteria.level = 'SP'; } 
            if (rule.key === 11) { criteria.league = rule.value; fillerLeague = rule.value; } 
            if (rule.key === 12) criteria.nation = rule.value; 
        });

        if (Object.keys(criteria).length > 0) {
            console.log(`[STRATEGY] Fetching ${req.count} players for: ${req.description}`);
            const found = await fetchPlayers({ ...criteria, ovrMin: targetRating - 5 });
            found.sort((a,b) => a.rating - b.rating);
            found.slice(0, req.count).forEach(p => mandatoryPool.push({ item: p, type: 'MANDATORY' }));
        }
    }

    // Stage 2: Fetch Filler Pool
    console.log(`[STRATEGY] Fetching fillers for League ${fillerLeague} (OVR ${targetRating-3} to ${targetRating+3})`);
    const fillers = await fetchPlayers({ league: fillerLeague, level: 'gold', ovrMin: targetRating - 3, ovrMax: targetRating + 3 });
    const fillerPool = fillers.map(p => ({ item: p, type: 'FILLER' }));

    // 3. Logic & BFS Loop
    const calculateSquadRating = (items) => {
        const active = items.filter(p => p !== null).map(entry => entry.item);
        if (active.length < 11) return 0;
        const ratings = active.map(p => p.rating);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0;
        ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        return Math.floor((sum + cf) / 11 + 0.0401);
    };

    const normalizePos = (id) => {
        if (!id && id !== 0) return null;
        const map = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
        return map[id] || id;
    };

    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
    const selected = new Array(11).fill(null);
    const usedIds = new Set();

    mandatoryPool.forEach(entry => {
        const p = entry.item;
        const pPos = normalizePos(p.preferredPosition);
        let slotIdx = activeSlots.findIndex((s, i) => !selected[i] && normalizePos(s.position ? s.position.id : s._position) === pPos);
        if (slotIdx === -1) slotIdx = activeSlots.findIndex((s, i) => !selected[i]);
        if (slotIdx !== -1) { selected[slotIdx] = entry; usedIds.add(p.id); }
    });

    activeSlots.forEach((slot, i) => {
        if (selected[i]) return;
        const rawPos = slot.position || slot._position;
        const targetPos = normalizePos((rawPos && typeof rawPos === 'object') ? rawPos.id : rawPos);
        let match = fillerPool.find(p => !usedIds.has(p.item.id) && normalizePos(p.item.preferredPosition) === targetPos);
        if (!match) match = fillerPool.find(p => !usedIds.has(p.item.id));
        if (match) { selected[i] = match; usedIds.add(match.item.id); }
    });

    let attempts = 0;
    while (calculateSquadRating(selected) < targetRating && attempts < 150) {
        attempts++;
        const fillerIndices = selected.map((entry, idx) => (entry && entry.type === 'FILLER') ? idx : -1).filter(i => i !== -1);
        if (fillerIndices.length === 0) break;
        const minFillerRating = Math.min(...fillerIndices.map(i => selected[i].item.rating));
        const upgradeIdx = fillerIndices.find(i => selected[i].item.rating === minFillerRating);
        if (!upgradeIdx && upgradeIdx !== 0) break;
        const currentItem = selected[upgradeIdx].item;
        const upgradeCandidate = fillerPool.find(p => !usedIds.has(p.item.id) && p.item.rating > currentItem.rating);
        if (upgradeCandidate) { usedIds.delete(currentItem.id); selected[upgradeIdx] = upgradeCandidate; usedIds.add(upgradeCandidate.item.id); } else break;
    }

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot, i) => { if (selected[i]) finalArray[slot.index] = selected[i].item; });
    squad.setPlayers(finalArray);
    squad.onDataUpdated.notify();
    if (!challenge.squad) challenge.squad = squad;
    win.services.SBC.saveChallenge(challenge).observe({ name: "Save" }, (obs, res) => {
        console.log(`[SERVER] Save: ${res.success} | Final Rating: ${calculateSquadRating(selected)} | Chem: ${squad.getChemistry()}`);
    });
    if (controller._overviewController?._pushSquadToView) controller._overviewController._pushSquadToView(squad);
})();
