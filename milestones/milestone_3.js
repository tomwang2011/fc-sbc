(async function requirementSolverV4() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    
    console.log("%c--- 🧩 MILESTONE 3: REQUIREMENT-AWARE SOLVER V4 ---", "font-size: 16px; font-weight: bold; color: #e67e22;");

    // 1. Context Discovery
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

    // 2. Analyze Requirements
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

    // 3. Multi-Stage Priming
    const fetchPlayers = (criteria) => {
        return new Promise((resolve) => {
            const searchCriteria = new win.UTSearchCriteriaDTO();
            Object.assign(searchCriteria, { type: 'player', count: 150, excludeLimitedUse: false, ...criteria });
            win.services.Club.search(searchCriteria).observe({ name: "ReqSearch" }, (obs, res) => {
                const items = (res.response?.items || res.items || []).filter(p => {
                    const isLoan = (p.loan > 0) || (p.limitedUseType === 2);
                    const isEvo = !!p.evolutionInfo || (p.upgrades !== null);
                    return !isLoan && !isEvo;
                });
                resolve(items);
            });
        });
    };

    let mandatoryPool = [];
    let fillerPool = [];

    // STAGE A: Find TOTW
    const totwReq = requirements.find(r => r.rules.some(rule => rule.key === 18 && rule.value === 3));
    if (totwReq) {
        console.log("[1/3] Searching for Mandatory TOTW...");
        const totws = await fetchPlayers({ level: 'SP', rarities: [3] });
        if (totws.length > 0) {
            totws.sort((a,b) => a.rating - b.rating);
            mandatoryPool.push(totws[0]);
            console.log(`[OK] Mandatory: ${totws[0]._staticData?.name || 'Unknown'} (Alt Positions: ${totws[0].possiblePositions})`);
        } else {
            return console.error("❌ No TOTW players found.");
        }
    }

    // STAGE B: Find Fillers
    console.log("[2/3] Fetching PL Gold support players...");
    fillerPool = await fetchPlayers({ league: 13, level: 'gold', ovrMin: 83, ovrMax: 84 });

    // 4. Mapping Logic
    const normalizePos = (id) => {
        if (!id && id !== 0) return null;
        const map = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
        return map[id] || id;
    };

    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
    const newPlayers = new Array(23).fill(null);
    const usedIds = new Set();

    const getSlotPosId = (s) => {
        const raw = s.position || s._position;
        return (raw && typeof raw === 'object') ? raw.id : raw;
    };

    // 1. PLACE MANDATORY PLAYERS FIRST (With Alt Pos Awareness)
    mandatoryPool.forEach(p => {
        const preferred = normalizePos(p.preferredPosition);
        const alternates = (p.possiblePositions || []).map(normalizePos);
        const allCapable = [preferred, ...alternates];

        // Try Preferred first
        let slot = activeSlots.find(s => !newPlayers[s.index] && normalizePos(getSlotPosId(s)) === preferred);
        
        // Try any Alternate second
        if (!slot) {
            slot = activeSlots.find(s => !newPlayers[s.index] && alternates.includes(normalizePos(getSlotPosId(s))));
        }

        // Fallback: First empty slot
        if (!slot) slot = activeSlots.find(s => !newPlayers[s.index]);

        if (slot) {
            newPlayers[slot.index] = p;
            usedIds.add(p.id);
            const slotPosId = normalizePos(getSlotPosId(slot));
            const isFit = allCapable.includes(slotPosId);
            console.log(`[REQ] Slot ${slot.index} (${slotPosId}) -> ${p._staticData?.name || 'Unknown'} [${isFit ? 'FIT' : 'OUT'}]`);
        }
    });

    // 2. FILL REMAINING SLOTS
    activeSlots.forEach(slot => {
        if (newPlayers[slot.index]) return; 

        const targetPos = normalizePos(getSlotPosId(slot));
        let match = fillerPool.find(p => !usedIds.has(p.id) && normalizePos(p.preferredPosition) === targetPos);
        if (!match) match = fillerPool.find(p => !usedIds.has(p.id));

        if (match) {
            usedIds.add(match.id);
            newPlayers[slot.index] = match;
            console.log(`[XI] Slot ${slot.index} -> ${match._staticData?.name || 'Unknown'}`);
        }
    });

    // 5. Apply
    console.log("[3/3] Finalizing squad...");
    squad.setPlayers(newPlayers);
    squad.onDataUpdated.notify();
    if (!challenge.squad) challenge.squad = squad;

    win.services.SBC.saveChallenge(challenge).observe({ name: "Save" }, (obs, res) => {
        let chem = 0;
        try { chem = squad.getChemistry(); } catch(e) {}
        console.log(`[SERVER] Save: ${res.success} | Chemistry: ${chem}`);
    });

    const overview = controller._overviewController || controller;
    if (overview && overview._pushSquadToView) overview._pushSquadToView(squad);
})();
