import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';
import { SbcParser } from '../core/SbcParser';

export class DeCloggerSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Requirements...");
    const summary = SbcParser.parseCurrentSbc();
    if (!summary) return log("❌ Failed to parse SBC requirements");

    log(`Target: ${summary.minRating} OVR | Special Required: ${summary.isTotw || summary.isTots}`);
    await Inventory.primeInventory(summary.isTotw || summary.isTots ? ['special'] : ['gold']);

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

    // 1. Mandatory Anchor (Special Card)
    let anchorRating = 87;
    if (summary.minRating === 83) anchorRating = 83;
    else if (summary.minRating === 84) anchorRating = 84;
    else if (summary.minRating >= 85) anchorRating = 87;
    if (summary.minRating >= 86) anchorRating = 88;

    let anchor = (summary.isTotw || summary.isTots) ? 
        pool.find(p => p.rarityId === 3 || p.rareflag === 3 || p.rarityId === 44 || p.rareflag === 44) : 
        pool.find(p => p.rating === anchorRating && p.rareflag === 1);
    
    if (!anchor && !(summary.isTotw || summary.isTots) && anchorRating > 83) {
        anchor = pool.find(p => p.rating >= anchorRating && p.rating <= 88 && p.rareflag === 1);
    }

    if (anchor) {
        console.log(`[DECISION] Anchor: ${anchor._staticData?.name} (${anchor.rating}) [Source: ${anchor._sourceType}]`);
        selected[0] = anchor; usedIds.add(anchor.id); usedPersonaIds.add(anchor._personaId!);
    } else if (summary.isTotw || summary.isTots) {
        return log("❌ No Untradeable TOTW/TOTS found.");
    }

    // 2. Pattern Fill
    const clogs = { 83: 0, 84: 0 };
    pool.forEach(p => { if (p._sourceType === 'storage' && (p.rating === 83 || p.rating === 84)) (clogs as any)[p.rating]++; });
    
    let pattern: { r: number, c: number }[] = [];
    if (summary.minRating === 83) {
        pattern = [{ r: 83, c: 10 }];
    } else if (summary.minRating === 84) {
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
    if (summary.minRating > 0) {
        log("Optimizing fodder usage...");
        let optAttempts = 0;
        // Increase attempts and ensure we check the whole pool for 81/82s
        while (optAttempts < 100) {
            optAttempts++;
            const currentRating = Utils.calculateRating(selected);
            if (currentRating <= summary.minRating) break;

            // Target the highest rated non-anchor card
            const ratings = selected.map((s, idx) => ({ rating: s!.rating, index: idx, sourceType: s!._sourceType })).filter(x => x.index !== 0);
            if (ratings.length === 0) break;

            const maxR = Math.max(...ratings.map(r => r.rating));
            const downIdx = ratings.find(r => r.rating === maxR)!.index;
            const currentItem = selected[downIdx]!;

            // Find a downgrade. If we have 84s in an 83 squad, this will naturally look for 82s/81s
            const downgrade = pool.find(p => 
                !usedIds.has(p.id) && 
                !usedPersonaIds.has(p._personaId!) && 
                p.rating < currentItem.rating && 
                p.rareflag <= 1
            );
            
            if (downgrade) {
                const tempSquad = [...selected];
                tempSquad[downIdx] = downgrade;
                const newRating = Utils.calculateRating(tempSquad);
                // Accept the downgrade if it brings us closer to or hits the target
                if (newRating >= summary.minRating || (currentRating > summary.minRating && newRating < currentRating)) {
                    console.log(`[OPTIMIZE] Downgrading Slot ${downIdx}: ${currentItem.rating} -> ${downgrade.rating} to offset high-rated cards.`);
                    usedIds.delete(currentItem.id); usedPersonaIds.delete(currentItem._personaId!);
                    selected[downIdx] = downgrade;
                    usedIds.add(downgrade.id); usedPersonaIds.add(downgrade._personaId!);
                    
                    // If we hit target exactly, we can stop
                    if (newRating === summary.minRating) break;
                } else {
                    // If this specific player doesn't work, we need to stop this branch to avoid infinite loop
                    break;
                }
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
