(async function robustInsertion() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    
    console.log("%c--- 📥 ROBUST SBC INSERTION ---", "font-size: 16px; font-weight: bold; color: #2ecc71;");

    // 1. Find Context
    const findContext = () => {
        const root = win.getAppMain().getRootViewController();
        const search = (n) => {
            if (!n) return null;
            const challenge = n._challenge || (n._overviewController?._challenge) || (n._parentViewController?._challenge);
            const squad = n._squad || (n._squadController?._squad);
            if (challenge && squad) return { challenge, squad, controller: n };
            const children = [...(n.childViewControllers || []), ...(n.presentedViewController ? [n.presentedViewController] : []), ...(n.currentController ? [n.currentController] : []), ...(n._viewControllers || [])];
            for (const c of children) {
                const f = search(c);
                if (f) return f;
            }
            return null;
        };
        return search(root);
    };

    const context = findContext();
    if (!context) return console.error("❌ SBC screen not detected.");
    const { challenge, squad, controller } = context;

    const pool = win._directPool || [];
    if (pool.length === 0) return console.error("❌ No players in 'window._directPool'.");

    // 2. Prepare the Squad Array (23 slots)
    const newPlayers = new Array(23).fill(null);
    
    // 3. Identify Active Pitch Slots
    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick());
    console.log(`[INFO] Found ${activeSlots.length} active slots.`);

    // 4. Assign players from pool to slots
    let inserted = 0;
    activeSlots.forEach((slot, index) => {
        if (pool[index]) {
            console.log(`[FILL] Slot ${slot.index}: Adding ${pool[index]._staticData?.name}`);
            newPlayers[slot.index] = pool[index];
            inserted++;
        }
    });

    if (inserted === 0) return console.error("❌ Failed to map any players to slots.");

    // 5. Apply to Squad Object
    console.log(`[SYNC] Applying ${inserted} players to squad...`);
    squad.setPlayers(newPlayers);
    
    // 6. Trigger UI & Server Sync
    squad.onDataUpdated.notify();
    
    // Save to Server
    win.services.SBC.saveChallenge(challenge).observe({ name: "Save" }, (obs, res) => {
        console.log(`[SERVER] Save Success: ${res.success}`);
    });

    // Force UI Refresh (Trying multiple paths)
    const overview = controller._overviewController || controller;
    if (overview && overview._pushSquadToView) {
        overview._pushSquadToView(squad);
        console.log("[UI] Pushed squad to view via _pushSquadToView");
    } else if (controller._pushSquadToView) {
        controller._pushSquadToView(squad);
        console.log("[UI] Pushed squad to view via controller direct");
    }

    console.log(`%c✅ DONE! ${inserted} players should now be visible.`, "color: #2ecc71; font-weight: bold;");
})();
