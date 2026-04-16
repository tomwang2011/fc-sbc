# Milestone 6: Hybrid Storage-AWARE Solver (V16)

## Status: Partially Functional
The solver is successfully combining items from SBC Storage and Club Search into a single prioritized pool. However, it is currently failing to satisfy specific league/nation requirements in complex SBCs (e.g., the Ligue 1 and Eredivisie SBC).

## Observations from V16 Output
- **Detection:** Correcty identifies Ligue 1 (16) and Eredivisie (10).
- **Failure:** Only picked a handful of required players (4 from Ligue 1, 0 from Eredivisie) and then filled the rest of the squad with players from unrelated leagues (L:2228, L:31, L:68, etc.).
- **Outcome:** Squad submitted as "Valid: false" because the league count requirements were not met.
- **Next Steps:** Analyze why the requirement loop is stopping before `req.count` is reached and why the homogeneity filler pass isn't strictly enough to satisfy "Min X" requirements.

## Technical Changes in V16
- Fixed persona duplication issue by refining `_personaId` calculation (`definitionId % 16777216`).
- Improved requirement satisfaction by sorting requirements by restrictiveness and processing them in a strategic loop.
- Added explicit support for "Min X players from [Leagues]" requirements.
- Improved chemistry awareness in both filler selection and BFS upgrade loop.
- Strictly enforced persona uniqueness across all phases.
- Ensured only starting 11 slots (index 0-10) are targeted.
- Added detailed requirement logging to help debug "Valid: false" states.


## Console output for V16
(async function milestone6HybridSolverV16() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const repo = win.repositories.Item;
    
    console.log("%c--- 🔋 MILESTONE 6: HYBRID STORAGE-AWARE SOLVER (V16) ---", "font-size: 16px; font-weight: bold; color: #6366f1;");

    // 1. Context Detection
    const getSbcContext = (n) => {
        if (!n) return null;
        const challenge = n._challenge || (n._overviewController?._challenge) || (n._parentViewController?._challenge);
        const squad = n._squad || (n._squadController?._squad);
        if (challenge && squad) return { challenge, squad, controller: n };
        const children = [...(n.childViewControllers || []), ...(n.presentedViewController ? [n.presentedViewController] : []), ...(n.currentController ? [n.currentController] : []), ...(n._viewControllers || [])];
        for (const c of children) {
            const f = getSbcContext(c);
            if (f) return f;
        }
        return null;
    };

    const ctx = getSbcContext(win.getAppMain().getRootViewController());
    if (!ctx) return console.error("❌ SBC screen not detected.");
    const { challenge, squad, controller } = ctx;

    const requirements = (challenge.eligibilityRequirements || []).map((req) => {
        const col = req.kvPairs._collection || req.kvPairs;
        const rules = [];
        for (let key in col) {
            const val = col[key];
            const cleanValue = Array.isArray(val) 
                ? val.map(v => (v && v.value !== undefined ? v.value : v)) 
                : (val && val.value !== undefined ? val.value : val);
            rules.push({ key: parseInt(key), value: cleanValue });
        }
        return { rules, count: req.count, description: req.requirementLabel || "General" };
    });

    console.log("[SOLVER] Analyzing Requirements...");
    requirements.forEach(r => {
        console.log(`[REQ] ${r.description} | Count: ${r.count}`);
        r.rules.forEach(rule => console.log(`   - Rule Key: ${rule.key} | Value: ${rule.value}`));
    });

    const ratingReq = requirements.find(r => r.rules.some(rule => rule.key === 19));
    const targetRating = ratingReq ? (Array.isArray(ratingReq.rules.find(r => r.key === 19).value) ? ratingReq.rules.find(r => r.key === 19).value[0] : ratingReq.rules.find(r => r.key === 19).value) : 84;
    
    const chemReq = requirements.find(r => r.rules.some(rule => rule.key === 14));
    const targetChem = chemReq ? (Array.isArray(chemReq.rules.find(r => r.key === 14).value) ? chemReq.rules.find(r => r.key === 14).value[0] : chemReq.rules.find(r => r.key === 14).value) : 0;

    const ratingFloor = targetRating - 5; 

    // 2. Inventory Sync
    const primeInventory = async () => {
        console.log("[STORAGE] Syncing Club + Storage...");
        const fetch = (service, method, criteria) => new Promise(r => {
            if (!service || !service[method]) return r([]);
            service[method](criteria).observe({name:'fetch'}, (obs, res) => r(res.response?.items || res.items || []));
        });

        const storageCriteria = new win.UTSearchCriteriaDTO();
        storageCriteria.type = 'player';
        storageCriteria.count = 250;
        const clubCriteria = new win.UTSearchCriteriaDTO();
        clubCriteria.type = 'player';
        clubCriteria.count = 1000;
        clubCriteria.level = 'gold';

        const [sItems, cItems] = await Promise.all([
            fetch(win.services.Item, 'searchStorageItems', storageCriteria),
            fetch(win.services.Club, 'search', clubCriteria)
        ]);

        const allPlayers = [];
        const processedIds = new Set();
        const add = (source, type) => {
            if (!source) return;
            let raw = source._collection || source.items || source;
            let items = Array.isArray(raw) ? raw : (typeof raw === 'object' ? Object.values(raw) : []);
            items.forEach(p => {
                if (p && p.id && !processedIds.has(p.id)) {
                    const isLoan = (typeof p.isLoanItem === 'function' && p.isLoanItem()) || (p.loan && p.loan > 0) || p.limitedUseType === 2;
                    const isEvo = (typeof p.isEvo === 'function' && p.isEvo()) || !!p.evolutionInfo || p.rareflag === 116;
                    if (!isLoan && !isEvo) {
                        p._sourceType = type;
                        p._sourcePriority = (type === 'storage' && p.rating < 83) ? 0 : (type === 'unassigned' ? 1 : (type === 'club' ? 2 : 3));
                        p._personaId = Number(p.definitionId) % 16777216;
                        allPlayers.push(p);
                        processedIds.add(p.id);
                    }
                }
            });
        };
        add(sItems, 'storage');
        add(repo.unassigned?._collection || repo.unassigned || [], 'unassigned');
        add(cItems, 'club');
        add(repo.getClub?.()?.items || repo.getClub?.(), 'club');
        add(repo.getStorage?.()?.items || repo.getStorage?.() || repo.getSbcStorageItems?.(), 'storage');
        return allPlayers;
    };

    const fullPool = await primeInventory();

    // 3. Robust Filter with Persona Deduplication
    const getFilteredPool = (criteria, excludePersonaIds = new Set()) => {
        const pool = fullPool.filter(p => {
            if (excludePersonaIds.has(p._personaId)) return false;
            const isTotw = p.rarityId === 3 || p.rareflag === 3;
            const isBasicGold = (p.rareflag <= 1) && p.rating >= 75;
            const isRequiredRarity = criteria.rarities && (Array.isArray(criteria.rarities) ? criteria.rarities : [criteria.rarities]).includes(p.rarityId);
            if (!isBasicGold && !isRequiredRarity && !isTotw) return false;
            
            if (criteria.leagues && criteria.leagues.length > 0 && !criteria.leagues.includes(p.leagueId)) return false;
            if (criteria.nations && criteria.nations.length > 0 && !criteria.nations.includes(p.nationId)) return false;
            if (p.rating < (criteria.ovrMin || ratingFloor)) return false;
            return true;
        }).sort((a, b) => (a._sourcePriority - b._sourcePriority) || (a.rating - b.rating));

        const distinct = [];
        const seen = new Set(excludePersonaIds);
        for (const p of pool) {
            if (!seen.has(p._personaId)) {
                distinct.push(p);
                seen.add(p._personaId);
            }
        }
        return distinct;
    };

    const usedPersonaIds = new Set();
    const activeSlots = squad.getSBCSlots().filter(s => !s.isBrick() && s.index <= 10);
    const selected = new Array(activeSlots.length).fill(null);

    // 4. Strategic Assignment
    const sortedReqs = requirements.filter(r => r.count > 0).sort((a, b) => a.count - b.count);
    const detectedLeagues = new Set();
    const detectedNations = new Set();

    sortedReqs.forEach(req => {
        const criteria = { leagues: [], nations: [], rarities: [] };
        req.rules.forEach(rule => {
            if (rule.key === 11) { 
                const val = Array.isArray(rule.value) ? rule.value : [rule.value];
                criteria.leagues = val;
                val.forEach(l => detectedLeagues.add(l));
            }
            if (rule.key === 12) {
                const val = Array.isArray(rule.value) ? rule.value : [rule.value];
                criteria.nations = val;
                val.forEach(n => detectedNations.add(n));
            }
            if (rule.key === 18 && (rule.value === 3 || (Array.isArray(rule.value) && rule.value.includes(3)))) criteria.rarities = [3];
        });

        const pool = getFilteredPool(criteria, usedPersonaIds);
        let countFilled = 0;
        
        for (let i = 0; i < activeSlots.length; i++) {
            if (selected[i] || countFilled >= req.count) continue;
            const slot = activeSlots[i];
            const targetPos = (slot.position?.id || slot._position);
            const matchIdx = pool.findIndex(p => (p.preferredPosition === targetPos || (({ 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 }[p.preferredPosition]) || p.preferredPosition) === targetPos));
            
            if (matchIdx !== -1) {
                const match = pool[matchIdx];
                selected[i] = { item: match, type: 'MANDATORY' };
                usedPersonaIds.add(match._personaId);
                pool.splice(matchIdx, 1);
                countFilled++;
            }
        }

        for (let i = 0; i < activeSlots.length; i++) {
            if (selected[i] || countFilled >= req.count) continue;
            const match = pool.shift();
            if (match) {
                selected[i] = { item: match, type: 'MANDATORY' };
                usedPersonaIds.add(match._personaId);
                countFilled++;
            }
        }
    });

    // Filler Pass (Homogeneity Aware)
    activeSlots.forEach((slot, i) => {
        if (selected[i]) return;
        const targetLeagues = Array.from(detectedLeagues);
        const pool = getFilteredPool({ leagues: targetLeagues }, usedPersonaIds);
        const match = pool.shift();
        if (match) {
            selected[i] = { item: match, type: 'FILLER' };
            usedPersonaIds.add(match._personaId);
        } else {
            const anyPool = getFilteredPool({}, usedPersonaIds);
            const anyMatch = anyPool.shift();
            if (anyMatch) {
                selected[i] = { item: anyMatch, type: 'FILLER' };
                usedPersonaIds.add(anyMatch._personaId);
            }
        }
    });

    // 5. Rating & Chem Optimization
    const calculateLocalRating = (items) => {
        const ratings = items.map(s => s?.item?.rating || 0);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0;
        ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        return Math.floor((sum + cf) / 11 + 0.0401);
    };

    const upgradePool = fullPool.filter(p => (p.rareflag <= 1 || p.rarityId === 3)).sort((a, b) => (a._sourcePriority - b._sourcePriority) || (a.rating - b.rating));
    
    let attempts = 0;
    while (attempts < 500) {
        attempts++;
        const currentPlayers = new Array(23).fill(null);
        activeSlots.forEach((slot, i) => { if (selected[i]) currentPlayers[slot.index] = selected[i].item; });
        squad.setPlayers(currentPlayers);
        
        const rating = calculateLocalRating(selected);
        const chem = squad.getChemistry() || 0;
        if (rating >= targetRating && (targetChem <= 0 || chem >= targetChem)) break;

        const fillerIdxs = selected.map((s, i) => s?.type === 'FILLER' ? i : -1).filter(i => i !== -1);
        if (fillerIdxs.length === 0) break;
        const minR = Math.min(...fillerIdxs.map(i => selected[i].item.rating));
        const upIdx = fillerIdxs.find(i => selected[i].item.rating === minR);
        
        let upgrade = null;
        if (targetChem > 0 && chem < targetChem) {
            const targetLeagues = Array.from(detectedLeagues);
            upgrade = upgradePool.find(p => !usedPersonaIds.has(p._personaId) && targetLeagues.includes(p.leagueId) && p.rating >= selected[upIdx].item.rating);
        }
        if (!upgrade) {
            upgrade = upgradePool.find(p => !usedPersonaIds.has(p._personaId) && p.rating > selected[upIdx].item.rating);
        }

        if (upgrade) { 
            usedPersonaIds.delete(selected[upIdx].item._personaId);
            selected[upIdx] = { item: upgrade, type: 'FILLER' };
            usedPersonaIds.add(upgrade._personaId);
        } else break;
    }

    // 6. Applying
    console.log(`[SOLVER] Final Rating: ${calculateLocalRating(selected)} | Chem: ${squad.getChemistry()}`);
    activeSlots.forEach((slot, i) => { 
        if (selected[i]) console.log(`   - Slot ${slot.index}: ${selected[i].item.rating} OVR (${selected[i].item._staticData?.name}) [Persona: ${selected[i].item._personaId}] from ${selected[i].item._sourceType}`);
    });

    squad.onDataUpdated.notify();
    if (controller._pushSquadToView) controller._pushSquadToView(squad);
    else if (controller._overviewController?._pushSquadToView) controller._overviewController._pushSquadToView(squad);

    setTimeout(() => {
        const r = squad.getRating ? squad.getRating() : '??';
        const c = squad.getChemistry ? squad.getChemistry() : '??';
        const v = squad.isValid ? squad.isValid() : '??';
        console.log(`%c[SBC TOOL] Internal Rating: ${r} | Chem: ${c} | Valid: ${v}`, "font-weight: bold; color: #e67e22;");
    }, 1000);
})();
