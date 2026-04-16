(async function milestone5StorageSolverV6() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;
    
    console.log("%c--- 📦 MILESTONE 5: STORAGE-FIRST SOLVER (V6) ---", "font-size: 16px; font-weight: bold; color: #3498db;");

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
    const { challenge, squad } = ctx;

    const primeInventory = async () => {
        console.log("[STORAGE] Deep Syncing Club + Storage (1000 items)...");
        
        const storageCriteria = new win.UTSearchCriteriaDTO();
        storageCriteria.type = 'player';
        storageCriteria.count = 250;

        const clubCriteria = new win.UTSearchCriteriaDTO();
        clubCriteria.type = 'player';
        // Remove level restriction to ensure we find everything, filter locally
        clubCriteria.count = 1000; 

        await Promise.all([
            new Promise(r => {
                if (win.services.Item.searchStorageItems) {
                    win.services.Item.searchStorageItems(storageCriteria).observe({name:'s'}, () => r());
                } else r();
            }),
            new Promise(r => win.services.Club.search(clubCriteria).observe({name:'c'}, () => r()))
        ]);

        const allPlayers = [];
        const processedIds = new Set();
        const rejectionStats = { loan: 0, evo: 0, lowRating: 0, special: 0 };

        const addPlayers = (source, type) => {
            if (!source) return;
            let raw = source._collection || source.items || source;
            let items = Array.isArray(raw) ? raw : (typeof raw === 'object' ? Object.values(raw) : []);
            
            items.forEach(p => {
                if (p && p.id && !processedIds.has(p.id) && (p.type === 'player' || (typeof p.isPlayer === 'function' && p.isPlayer()))) {
                    const isLoan = (typeof p.isLoanItem === 'function' && p.isLoanItem()) || (p.loan && p.loan > 0) || p.limitedUseType === 2;
                    const isEvo = (typeof p.isEvo === 'function' && p.isEvo()) || !!p.evolutionInfo || p.rareflag === 116;
                    const isGold = p.rating >= 75;
                    
                    if (isLoan) rejectionStats.loan++;
                    else if (isEvo) rejectionStats.evo++;
                    else if (!isGold) rejectionStats.lowRating++;
                    else {
                        p._sourceType = type;
                        const priorities = { 'storage': 0, 'unassigned': 1, 'club': 2 };
                        p._sourcePriority = priorities[type] ?? 2;
                        
                        // Tag specials for logging but INCLUDE them in V6
                        p._isSpecial = p.rareflag > 1 && p.rareflag !== 116;
                        if (p._isSpecial) rejectionStats.special++;
                        
                        allPlayers.push(p);
                        processedIds.add(p.id);
                    }
                }
            });
        };

        addPlayers(repo.getStorage?.()?.items || repo.getStorage?.() || repo.getSbcStorageItems?.(), 'storage');
        addPlayers(repo.unassigned, 'unassigned');
        addPlayers(repo.getClub?.()?.items || repo.getClub?.(), 'club');

        console.log("[STORAGE] Rejection Stats:", rejectionStats);
        return allPlayers;
    };

    try {
        const pool = await primeInventory();

        // SORTING: 1. Rating ASC, 2. Storage Priority
        pool.sort((a, b) => {
            if (a.rating !== b.rating) return a.rating - b.rating;
            return a._sourcePriority - b._sourcePriority;
        });

        const stats = pool.reduce((acc, p) => {
            acc[p._sourceType] = (acc[p._sourceType] || 0) + 1;
            return acc;
        }, {});
        console.log("[STORAGE] Clean Pool Stats:", stats);
        
        const storageStats = pool.filter(p => p._sourceType === 'storage').map(p => `${p.rating}${p._isSpecial?'*':''}`);
        console.log("[STORAGE] Storage Ratings Found (Stars = Special):", storageStats.join(', '));

        const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
        const finalPlayers = new Array(23).fill(null);
        const usedDefIds = new Set();

        console.log(`[SOLVER] Filling ${activeSlots.length} slots...`);

        activeSlots.forEach((slot) => {
            const player = pool.find(p => !usedDefIds.has(p.definitionId));

            if (player) {
                const label = player._sourceType.toUpperCase() + (player._isSpecial ? "*" : "");
                console.log(`[SLOT ${slot.index}] Using ${label}: ${player.rating} OVR (${player._staticData?.name || player.definitionId})`);
                finalPlayers[slot.index] = player;
                usedDefIds.add(player.definitionId);
            }
        });

        squad.setPlayers(finalPlayers);
        squad.onDataUpdated.notify();
        
        const controller = ctx.controller;
        const pushView = controller._overviewController?._pushSquadToView || controller._pushSquadToView;
        if (pushView) pushView.call(controller._overviewController || controller, squad);

        if (!challenge.squad) challenge.squad = squad;
        win.services.SBC.saveChallenge(challenge).observe({ name: "Save" }, (obs, res) => {
            console.log(`%c[SERVER] Save: ${res.success ? 'SUCCESS' : 'FAILED'}`, "font-weight: bold; color: " + (res.success ? "#2ecc71" : "#e74c3c"));
        });

        console.log("%c✅ MILESTONE 5 V6 COMPLETE", "color: #2ecc71; font-weight: bold;");
    } catch (e) {
        console.error("❌ Milestone 5 V6 Failed:", e);
    }
})();
