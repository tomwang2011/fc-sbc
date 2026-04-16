/**
 * Milestone 6: Hybrid Solver Console Script (V4 - Search Fix)
 */

(async () => {
    const win = window;
    console.log("%c[FC-SBC] Milestone 6 Hybrid Solver Initializing...", "color: #6366f1; font-weight: bold;");

    const SbcBuilder = {
        _players: [],

        getSbcContext() {
            try {
                const root = win.getAppMain().getRootViewController();
                const findController = (node) => {
                    if (!node) return null;
                    if (node._squad && node._challenge) return node;
                    const children = [
                        ...(node.childViewControllers || []),
                        ...(node.presentedViewController ? [node.presentedViewController] : []),
                        ...(node.currentController ? [node.currentController] : []),
                        ...(node._viewControllers || [])
                    ];
                    for (const child of children) {
                        const found = findController(child);
                        if (found) return found;
                    }
                    return null;
                };
                const controller = findController(root);
                return controller ? { challenge: controller._challenge, squad: controller._squad, controller } : null;
            } catch (e) { return null; }
        },

        async targetedSearch(minRating, maxRating) {
            return new Promise(resolve => {
                const searchCriteria = new win.UTSearchCriteriaDTO();
                // Using Milestone 4 pattern: Object.assign + level: 'gold'
                // Property names in DTO are minRating/maxRating
                Object.assign(searchCriteria, { 
                    type: 'player', 
                    count: 250, 
                    level: 'gold', 
                    minRating: minRating, 
                    maxRating: maxRating 
                });
                
                win.services.Club.search(searchCriteria).observe({name:`search_${minRating}_${maxRating}`}, (obs, res) => {
                    const items = res.response?.items || res.items || [];
                    console.log(`[SEARCH] Club ${minRating}-${maxRating} OVR: Found ${items.length} players.`);
                    resolve(items);
                });
            });
        },

        async primeInventory() {
            const repo = win.repositories.Item;
            if (!repo) return { total: 0 };

            console.log("[FC-SBC] Syncing Storage & Club...");
            
            const storageCriteria = new win.UTSearchCriteriaDTO();
            storageCriteria.type = 'player';

            const searchPromises = [
                // 1. Storage Search
                new Promise(resolve => {
                    if (win.services.Item.searchStorageItems) {
                        win.services.Item.searchStorageItems(storageCriteria).observe({name:'storage_search'}, (obs, res) => {
                            const items = res.response?.items || res.items || [];
                            console.log(`[SEARCH] Storage: Found ${items.length} players.`);
                            resolve({ type: 'sbcstorage', items });
                        });
                    } else { resolve({ type: 'sbcstorage', items: [] }); }
                }),
                // 2. Unassigned
                Promise.resolve({ type: 'unassigned', items: repo.unassigned?._collection || repo.unassigned || [] }),
                // 3. Multi-Pass Club Search (Milestone 4 Strategy)
                this.targetedSearch(75, 79).then(items => ({ type: 'club', items })),
                this.targetedSearch(80, 82).then(items => ({ type: 'club', items })),
                this.targetedSearch(83, 84).then(items => ({ type: 'club', items })),
                this.targetedSearch(85, 87).then(items => ({ type: 'club', items }))
            ];

            const results = await Promise.all(searchPromises);
            
            const allPlayers = new Map();
            const priorities = { 'sbcstorage': 0, 'unassigned': 1, 'club': 2 };

            results.forEach(res => {
                const items = Array.isArray(res.items) ? res.items : Object.values(res.items || {});
                items.forEach(p => {
                    if (p && p.id && (p.type === 'player' || (typeof p.isPlayer === 'function' && p.isPlayer()))) {
                        // Keep highest priority source
                        const priority = priorities[res.type] ?? 2;
                        if (!allPlayers.has(p.id) || priority < allPlayers.get(p.id)._sourcePriority) {
                            p.itemType = res.type;
                            p._sourcePriority = priority;
                            allPlayers.set(p.id, p);
                        }
                    }
                });
            });

            this._players = Array.from(allPlayers.values());
            console.log(`[FC-SBC] Total Pooled Players (Pre-Filter): ${this._players.length}`);
            return { total: this._players.length };
        },

        calculateSquadRating(players) {
            const active = players.filter(p => p !== null);
            if (active.length < 11) return 0;
            const ratings = active.map(p => p.rating);
            const sum = ratings.reduce((a, b) => a + b, 0);
            const avg = sum / 11;
            let cf = 0;
            ratings.forEach(r => { if (r > avg) cf += (r - avg); });
            return Math.floor((sum + cf) / 11 + 0.0401);
        },

        async solve() {
            const context = this.getSbcContext();
            if (!context) return console.error("[FC-SBC] Error: Navigate to SBC screen first.");

            const { challenge, squad, controller } = context;
            const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
            const targetRating = 84;

            await this.primeInventory();

            // Refined Filtering
            const pool = this._players.filter(p => {
                const isLoan = (typeof p.isLoanItem === 'function' && p.isLoanItem()) || (p.loan > 0) || p.limitedUseType === 2;
                const isEvo = (typeof p.isEvo === 'function' && p.isEvo()) || !!p.evolutionInfo || p.rareflag === 116;
                if (isLoan || isEvo) return false;

                // PROTECTION: No Storage > 85
                if (p.itemType === 'sbcstorage' && p.rating > 85) return false;
                
                // PROTECTION: No Club > 85 unless TOTW
                const isTotw = p.rarityId === 3;
                if (p.itemType === 'club' && p.rating > 85 && !isTotw) return false;

                // Gold Only (75+)
                const isGold = p.rating >= 75 && (p.quality === 2 || p.quality === 3 || p.rareflag <= 3);
                return isGold || isTotw;
            });

            const sortedPool = [...pool].sort((a, b) => {
                if (a.rating !== b.rating) return a.rating - b.rating;
                return a._sourcePriority - b._sourcePriority;
            });

            console.log(`[FC-SBC] Filtered Pool Size: ${sortedPool.length}`);

            const selected = new Array(11).fill(null);
            const usedDefIds = new Set();

            // 1. Mandatory TOTW
            const totw = sortedPool.find(p => p.rarityId === 3); 
            if (totw) {
                selected[0] = { item: totw, type: 'MANDATORY' };
                usedDefIds.add(totw.definitionId);
                console.log(`[PASS 1] Using TOTW: ${totw._staticData?.name} (${totw.rating}) from ${totw.itemType}`);
            }

            // 2. Initial Fill (Lowest rated)
            activeSlots.forEach((slot, i) => {
                if (selected[i]) return;
                const match = sortedPool.find(p => !usedDefIds.has(p.definitionId));
                if (match) {
                    selected[i] = { item: match, type: 'FILLER' };
                    usedDefIds.add(match.definitionId);
                }
            });

            // 3. BFS Rating Optimization
            let attempts = 0;
            let currentRating = this.calculateSquadRating(selected.map(s => s?.item));
            console.log(`[BFS] Starting Rating: ${currentRating}`);

            while (currentRating < targetRating && attempts < 500) {
                attempts++;
                const fillers = selected.map((s, idx) => s?.type === 'FILLER' ? idx : -1).filter(i => i !== -1);
                if (fillers.length === 0) break;

                const minRatingInSquad = Math.min(...fillers.map(i => selected[i].item.rating));
                const upgradeIdx = fillers.find(i => selected[i].item.rating === minRatingInSquad);
                
                const currentItem = selected[upgradeIdx].item;
                const nextBest = sortedPool.find(p => !usedDefIds.has(p.definitionId) && p.rating > currentItem.rating);

                if (nextBest) {
                    usedDefIds.delete(currentItem.definitionId);
                    selected[upgradeIdx] = { item: nextBest, type: 'FILLER' };
                    usedDefIds.add(nextBest.definitionId);
                    currentRating = this.calculateSquadRating(selected.map(s => s?.item));
                } else {
                    console.warn(`[BFS] Stuck at ${currentRating}. No upgrade for ${currentItem.rating} found.`);
                    break;
                }
            }

            console.log(`[FINAL] Success: ${currentRating} OVR | Steps: ${attempts}`);

            // Apply to UI
            const finalPlayers = new Array(23).fill(null);
            activeSlots.forEach((slot, i) => {
                if (selected[i]) finalPlayers[slot.index] = selected[i].item;
            });

            squad.setPlayers(finalPlayers);
            squad.onDataUpdated.notify();
            
            if (controller._pushSquadToView) controller._pushSquadToView(squad);
            else if (controller._overviewController?._pushSquadToView) controller._overviewController._pushSquadToView(squad);

            if (!challenge.squad) challenge.squad = squad;
            win.services.SBC.saveChallenge(challenge).observe({name: 'save'}, (obs, res) => {
                console.log(`[SERVER] Save: ${res.success ? 'SUCCESS' : 'FAILED'}`);
            });

            alert(`SBC Solved! Rating: ${currentRating}`);
        }
    };

    await SbcBuilder.solve();
})();
