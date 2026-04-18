import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';

export class DeCloggerSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Requirements...");
    let isTotwRequired = false;
    let targetRating = 0;
    (challenge.eligibilityRequirements || []).forEach((r: any) => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const val = Utils.getCleanValue(col[k]);
            const key = parseInt(k);
            if (key === 18 && (val === 3 || (Array.isArray(val) && val.includes(3)))) isTotwRequired = true;
            if (key === 19) targetRating = Math.max(targetRating, Number(Array.isArray(val) ? val[0] : val) || 0);
        }
    });

    log(`Target: ${targetRating} OVR | TOTW Required: ${isTotwRequired}`);
    await Inventory.primeInventory(isTotwRequired ? ['special'] : ['gold']);

    const pool = Inventory.memory.filter(p => {
        if (settings.untradOnly && p.tradable === true) return false;
        if (settings.excludedLeagues.includes(p.leagueId!)) return false;
        if (p.rating >= 89 || !!p.evolutionInfo || p.rareflag === 116) return false;
        return true;
    }).sort((a,b) => (a._sourcePriority! - b._sourcePriority!) || (a.rating - b.rating));

    const usedPersonaIds = new Set<number>();
    const usedIds = new Set<number>();
    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);
    const selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);

    // 1. Mandatory Anchor
    let anchorRating = 87;
    if (targetRating === 83) anchorRating = 83;
    else if (targetRating === 84) anchorRating = 84;
    else if (targetRating >= 85) anchorRating = 87;
    if (targetRating >= 86) anchorRating = 88;

    let anchor = isTotwRequired ? pool.find(p => p.rarityId === 3 || p.rareflag === 3) : pool.find(p => p.rating === anchorRating && p.rareflag === 1);
    if (!anchor && !isTotwRequired && anchorRating > 83) {
        // Fallback for anchor if exact rating not found
        anchor = pool.find(p => p.rating >= anchorRating && p.rating <= 88 && p.rareflag === 1);
    }

    if (anchor) {
        console.log(`[DECISION] Anchor: ${anchor._staticData?.name} (${anchor.rating}) [Source: ${anchor._sourceType}]`);
        selected[0] = anchor; usedIds.add(anchor.id); usedPersonaIds.add(anchor._personaId!);
    } else if (isTotwRequired) {
        return log("❌ No Untradeable TOTW found.");
    }

    // 2. Pattern Fill
    const clogs = { 83: 0, 84: 0 };
    pool.forEach(p => { if (p._sourceType === 'storage' && (p.rating === 83 || p.rating === 84)) (clogs as any)[p.rating]++; });
    
    let pattern: { r: number, c: number }[] = [];
    if (targetRating === 83) {
        pattern = [{ r: 83, c: 10 }];
    } else if (targetRating === 84) {
        pattern = [{ r: 84, c: 10 }];
    } else {
        pattern = (anchor && anchor.rating >= 88) ? [{ r: 83, c: 10 }] : (clogs[84] >= 6 ? [{ r: 84, c: 6 }, { r: 83, c: 4 }] : [{ r: 87, c: 1 }, { r: 83, c: 9 }]);
    }

    pattern.forEach(pReq => {
        let count = 0;
        // Primary fill: exactly matching the target rating
        pool.filter(p => p.rating === pReq.r && p.rareflag <= 1).forEach(p => {
            const idx = selected.findIndex(s => s === null);
            if (count < pReq.c && idx !== -1 && !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!)) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId!); count++;
                console.log(`[DECISION] Pattern Slot (Exact): ${p._staticData?.name} (${p.rating})`);
            }
        });
        
        // Failsafe fill: if we still need more and it's an 83 pattern, try 84s
        if (count < pReq.c && pReq.r === 83) {
            pool.filter(p => p.rating === 84 && p.rareflag <= 1).forEach(p => {
                const idx = selected.findIndex(s => s === null);
                if (count < pReq.c && idx !== -1 && !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!)) {
                    selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId!); count++;
                    console.log(`[DECISION] Pattern Slot (Failsafe 84): ${p._staticData?.name} (${p.rating})`);
                }
            });
        }
    });

    // 3. Failsafe remainder
    activeSlots.forEach((slot: any, i: number) => {
        if (selected[i]) return;
        const filler = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rareflag <= 1);
        if (filler) { selected[i] = filler; usedIds.add(filler.id); usedPersonaIds.add(filler._personaId!); }
    });

    // --- DOWNWARD OPTIMIZATION PASS ---
    if (targetRating > 0) {
        log("Optimizing fodder usage...");
        let optAttempts = 0;
        while (optAttempts < 50) {
            optAttempts++;
            const currentRating = Utils.calculateRating(selected);
            if (currentRating <= targetRating) break;

            const ratings = selected.map((s, idx) => ({ rating: s!.rating, index: idx })).filter(x => x.index !== 0);
            const maxR = Math.max(...ratings.map(r => r.rating));
            const downIdx = ratings.find(r => r.rating === maxR)!.index;
            const currentItem = selected[downIdx]!;

            const downgrade = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rating < currentItem.rating && p.rareflag <= 1);
            
            if (downgrade) {
                const tempSquad = [...selected];
                tempSquad[downIdx] = downgrade;
                if (Utils.calculateRating(tempSquad) >= targetRating) {
                    console.log(`[OPTIMIZE] Downgrading Slot ${downIdx}: ${currentItem.rating} -> ${downgrade.rating} (${downgrade._staticData?.name})`);
                    usedIds.delete(currentItem.id); usedPersonaIds.delete(currentItem._personaId!);
                    selected[downIdx] = downgrade;
                    usedIds.add(downgrade.id); usedPersonaIds.add(downgrade._personaId!);
                } else break;
            } else break;
        }
    }

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot: any, i: number) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    await Utils.saveSquad(challenge, squad, controller);
    log(`✅ De-Clogger Complete. Rating: ${Utils.calculateRating(selected)}`);
  }
}
