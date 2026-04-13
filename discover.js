/**
 * RECON & SOLVER V2: Fixing TOTW detection and inventory count.
 */
(function reconAndSolve() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    
    async function run() {
        console.clear();
        console.log("%c--- 🔍 RECON: FINDING TOTW & FULL CLUB ---", "font-size: 16px; font-weight: bold; color: #f39c12;");

        const repo = win.repositories.Item;
        const clubItems = repo.getClub().items._collection || repo.getClub().items || {};
        const allPlayers = Object.values(clubItems).filter(p => p && (p.type === 'player' || p.isPlayer?.()));

        console.log(`[RECON] Initial scan found ${allPlayers.length} players.`);

        const totwSample = allPlayers.find(p => {
            return p.rareflag === 3 || p.rarityId === 3 || p.versionId === 3;
        });

        if (totwSample) {
            console.log("✅ Found a TOTW-like player:", totwSample._staticData?.name);
            console.log(" - rarityId:", totwSample.rarityId);
            console.log(" - rareflag:", totwSample.rareflag);
        } else {
            console.warn("❌ No TOTW player found with current filters. Inspecting all unique rarityIds...");
            const rarities = [...new Set(allPlayers.map(p => p.rarityId))];
            console.log("Unique rarityIds in club:", rarities);
        }

        console.log("\n%c--- 🚀 STARTING IMPROVED SOLVER ---", "font-weight: bold; color: #2ecc71;");
        
        const findSbcController = (node) => {
            if (!node) return null;
            if (node.className === 'UTSBCSquadSplitViewController') return node;
            const children = [...(node.childViewControllers || []), ...(node.presentedViewController ? [node.presentedViewController] : []), ...(node.currentController ? [node.currentController] : [])];
            for (const child of children) { const found = findSbcController(child); if (found) return found; }
            return null;
        };

        const controller = findSbcController(win.getAppMain().getRootViewController());
        if (!controller) return;

        const squad = controller._squad;
        const pitchSlots = squad.getSBCSlots().filter(s => s.position !== null);

        const l53Candidates = allPlayers.filter(p => p.leagueId === 53);
        const totwCandidates = allPlayers.filter(p => p.rarityId === 3 || p.rareflag === 3);

        console.log(`[SOLVER] Candidates: LaLiga(${l53Candidates.length}), TOTW(${totwCandidates.length})`);

        if (l53Candidates.length > 0 && totwCandidates.length > 0) {
            const selected = [];
            const usedIds = new Set();

            const add = (p) => { if (p && !usedIds.has(p.id)) { selected.push(p); usedIds.add(p.id); return true; } return false; };

            add(l53Candidates[0]);
            add(totwCandidates[0]);

            allPlayers.forEach(p => { if (selected.length < 11) add(p); });

            const newPlayers = new Array(23).fill(null);
            pitchSlots.forEach((slot, index) => { newPlayers[slot.index] = selected[index]; });

            console.log("[SOLVER] Pushing 11 players...");
            try {
                squad.setPlayers(newPlayers);
                if (squad.onDataUpdated?.notify) squad.onDataUpdated.notify();
                if (controller._overviewController?._pushSquadToView) controller._overviewController._pushSquadToView(squad);
                console.log("✅ DONE.");
            } catch(e) { console.error(e); }
        } else {
            console.error("❌ Missing TOTW or LaLiga. Try searching for one in Club Search first.");
        }
    }

    run();
})();
