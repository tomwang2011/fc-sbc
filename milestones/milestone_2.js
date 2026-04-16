(async function universalChemistryOptimizerV3() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    
    console.log("%c--- 🌍 UNIVERSAL CHEMISTRY OPTIMIZER V3 ---", "font-size: 16px; font-weight: bold; color: #3498db;");

    // 1. Universal Position Normalizer
    const normalizePos = (id) => {
        if (!id && id !== 0) return null;
        const map = {
            2: 3, 8: 7,   // RWB -> RB, LWB -> LB
            4: 5, 6: 5,   // RCB/LCB -> CB
            9: 10, 11: 10, // RDM/LDM -> CDM
            13: 14, 15: 14, // RCM/LCM -> CM
            17: 18, 19: 18, // RAM/LAM -> CAM
            20: 21, 22: 21, // RF/LF -> CF
            24: 25, 26: 25  // RS/LS -> ST
        };
        return map[id] || id;
    };

    // 2. Context Discovery
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
    const pool = (win._directPool || []).sort((a,b) => a.rating - b.rating);
    
    console.log(`[INFO] Challenge: ${challenge.name} | Formation: ${squad._formation?.displayName}`);

    // 3. Mapping Logic (Starting 11 ONLY)
    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick());
    const newPlayers = new Array(23).fill(null); // Initialize 23 slots with null
    const usedIds = new Set();

    activeSlots.forEach(slot => {
        // STRICTLY IGNORE WORKAREA (11-22)
        if (slot.index > 10) return;

        const rawPos = slot.position || slot._position;
        const rawId = (rawPos && typeof rawPos === 'object') ? rawPos.id : rawPos;
        const targetPos = normalizePos(rawId);
        
        // Find best match in pool
        let match = pool.find(p => !usedIds.has(p.id) && normalizePos(p.preferredPosition) === targetPos);
        if (!match) {
            match = pool.find(p => !usedIds.has(p.id) && p.possiblePositions && p.possiblePositions.map(normalizePos).includes(targetPos));
        }
        // Fallback for Starting 11: Take any available player
        if (!match) {
            match = pool.find(p => !usedIds.has(p.id));
        }

        if (match) {
            usedIds.add(match.id);
            newPlayers[slot.index] = match;
            const isMatch = normalizePos(match.preferredPosition) === targetPos;
            console.log(`[XI] Slot ${slot.index} (${targetPos}) -> ${match._staticData?.name} [${isMatch ? 'MATCH' : 'OUT'}]`);
        }
    });

    // 4. Persistence & UI Sync
    console.log("[SYNC] Applying players to Starting XI...");
    squad.setPlayers(newPlayers);
    squad.onDataUpdated.notify();
    
    // Ensure squad link exists for the save service
    if (!challenge.squad) challenge.squad = squad;

    try {
        win.services.SBC.saveChallenge(challenge).observe({ name: "Save" }, (obs, res) => {
            let chem = 0;
            try { chem = squad.getChemistry(); } catch(e) {}
            console.log(`[SERVER] Save: ${res.success} | Chemistry: ${chem}`);
        });
    } catch (e) {}

    const overview = controller._overviewController || controller;
    if (overview && overview._pushSquadToView) {
        overview._pushSquadToView(squad);
    }

    console.log("%c✅ DONE! Starting 11 populated, Work Area empty.", "color: #2ecc71; font-weight: bold;");
})();
