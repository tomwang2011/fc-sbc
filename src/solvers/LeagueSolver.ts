import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';

export class LeagueSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Requirements...");
    const rawReqs = challenge.eligibilityRequirements || [];
    let targetRating = 0; let targetChem = 0; let isTotwReq = false;
    const detectedLeagues = new Set<number>();

    rawReqs.forEach((r: any) => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const val = Utils.getCleanValue(col[k]);
            const key = parseInt(k);
            if (key === 19) targetRating = Math.max(targetRating, Number(Array.isArray(val) ? val[0] : val) || 0);
            if (key === 35) targetChem = Math.max(targetChem, Number(Array.isArray(val) ? val[0] : val) || 0);
            if (key === 11) (Array.isArray(val) ? val : [val]).forEach(l => detectedLeagues.add(l));
            if (key === 18 && val.includes(3)) isTotwReq = true;
        }
    });

    log(`Target: ${targetRating} OVR | Chem: ${targetChem}`);
    
    // Deeper Discovery for more options
    const discoveryLeagues = Array.from(detectedLeagues).slice(0, 3);
    await Promise.all(discoveryLeagues.map(l => Inventory.fetchItems({ league: l, count: 250 })));
    await Inventory.primeInventory();
    
    const globalLeagues = Array.from(detectedLeagues);
    const pool = Inventory.memory.filter(p => {
        if (settings.untradOnly && p.tradable === true) return false;
        if (settings.excludedLeagues.includes(p.leagueId!)) return false;
        // Strictly cap at 82 for League SBCs to protect high-rated fodder
        if (p.rating > 82) return false;
        if (globalLeagues.length > 0 && !globalLeagues.includes(p.leagueId!)) return false;
        const isStandard = p.rareflag === 0 || p.rareflag === 1 || (isTotwReq && (p.rarityId === 3 || p.rareflag === 3));
        if (!isStandard) return false;
        return true;
    }).sort((a,b) => (a._sourcePriority! - b._sourcePriority!) || (a.rating - b.rating));

    const usedPersonaIds = new Set<number>();
    const usedIds = new Set<number>();
    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);
    let selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);

    const getChem = (items: (EAItem | null)[]) => {
        const tempPlayers = new Array(23).fill(null);
        activeSlots.forEach((slot: any, i: number) => { if (items[i]) tempPlayers[slot.index] = items[i]; });
        squad.setPlayers(tempPlayers);
        return squad.getChemistry();
    };

    const fillPass = (source: string | null, matchPos: boolean) => {
        activeSlots.forEach((slot: any, i: number) => {
            if (selected[i]) return;
            if (matchPos && targetChem > 0 && getChem(selected) >= targetChem) return; 
            const slotPos = Utils.normalizePos(slot.position?.id || slot._position);
            const match = pool.find(p => {
                if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId!)) return false;
                if (source && p._sourceType !== source) return false;
                if (matchPos && Utils.normalizePos(p.preferredPosition) !== slotPos) return false;
                return true;
            });
            if (match) { 
                selected[i] = match; usedIds.add(match.id); usedPersonaIds.add(match._personaId!); 
            }
        });
    };

    // 1. Secured Chem Pass
    fillPass('storage', true);
    fillPass('club', true);
    // 2. Storage Dump (Negative Value clearing)
    fillPass('storage', false);
    // 3. Final Fill
    fillPass('club', false);

    // --- DEEP CHECK 1: POSITION SHUFFLE ---
    log("Running Position Re-Optimizer...");
    const currentItems = selected.filter(s => s) as EAItem[];
    if (currentItems.length === 11) {
        // Try to reassign these same 11 players to best slots
        let maxChem = getChem(selected);
        
        // Simple greedy swap to boost chem without changing players
        for (let i = 0; i < 11; i++) {
            for (let j = i + 1; j < 11; j++) {
                const temp = [...selected];
                [temp[i], temp[j]] = [temp[j], temp[i]];
                const newChem = getChem(temp);
                if (newChem > maxChem) {
                    maxChem = newChem;
                    selected = [...temp];
                    console.log(`[DEEP CHECK] Swapped slots ${i} & ${j} for +chem`);
                }
            }
        }
    }

    // --- DEEP CHECK 2: UPWARD RATING BRIDGE ---
    if (targetRating > 0 && Utils.calculateRating(selected) < targetRating) {
        log(`Increasing rating to ${targetRating}...`);
        let bridgeAttempts = 0;
        while (bridgeAttempts < 50 && Utils.calculateRating(selected) < targetRating) {
            bridgeAttempts++;
            const clubItems = selected.filter(s => s && s._sourceType !== 'storage') as EAItem[];
            if (clubItems.length === 0) break;

            const minR = Math.min(...clubItems.map(s => s.rating));
            const upIdx = selected.findIndex(s => s && s.rating === minR && s._sourceType !== 'storage');
            if (upIdx === -1) break;
            const currentItem = selected[upIdx]!;
            const slotPos = Utils.normalizePos(activeSlots[upIdx].position?.id || activeSlots[upIdx]._position);
            const isChemSlot = Utils.normalizePos(currentItem.preferredPosition) === slotPos;

            let upgrade = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rating > currentItem.rating && p.leagueId === currentItem.leagueId && (isChemSlot ? Utils.normalizePos(p.preferredPosition) === slotPos : true));
            if (!upgrade) upgrade = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rating > currentItem.rating && p.leagueId === currentItem.leagueId);

            if (upgrade) {
                usedIds.delete(currentItem.id); usedPersonaIds.delete(currentItem._personaId!);
                selected[upIdx] = upgrade; usedIds.add(upgrade.id); usedPersonaIds.add(upgrade._personaId!);
            } else break;
        }
    }

    // --- DEEP CHECK 3: DOWNWARD RATING TRIMMING ---
    if (targetRating > 0 && Utils.calculateRating(selected) > targetRating) {
        log("Trimming excess rating...");
        let trimAttempts = 0;
        while (trimAttempts < 50) {
            trimAttempts++;
            const currentR = Utils.calculateRating(selected);
            if (currentR <= targetRating) break;

            const clubItems = selected.filter(s => s && s._sourceType !== 'storage') as EAItem[];
            if (clubItems.length === 0) break;

            const maxR = Math.max(...clubItems.map(s => s.rating));
            const downIdx = selected.findIndex(s => s && s.rating === maxR && s._sourceType !== 'storage');
            if (downIdx === -1) break;
            const currentItem = selected[downIdx]!;

            // Find lowest rated valid replacement that doesn't drop us below target
            const replacement = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rating < currentItem.rating);
            if (replacement) {
                const temp = [...selected];
                temp[downIdx] = replacement;
                if (Utils.calculateRating(temp) >= targetRating) {
                    console.log(`[TRIM] Downgrading ${currentItem.rating} -> ${replacement.rating}`);
                    usedIds.delete(currentItem.id); usedPersonaIds.delete(currentItem._personaId!);
                    selected[downIdx] = replacement; usedIds.add(replacement.id); usedPersonaIds.add(replacement._personaId!);
                } else break;
            } else break;
        }
    }

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot: any, i: number) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    await Utils.saveSquad(challenge, squad, controller);
    log(`✅ Deep Solve Complete. Chem: ${getChem(selected)}`);
  }
}
