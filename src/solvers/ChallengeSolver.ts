import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';

export class ChallengeSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Complex Constraints...");
    const constraints = {
        maxSameClub: 11, maxSameNation: 11, maxSameLeague: 11,
        maxTotalNations: 11, maxTotalLeagues: 11,
        minGold: 0, minRare: 0, targetRating: 0, targetChem: 0
    };

    (challenge.eligibilityRequirements || []).forEach((r: any) => {
        const col = r.kvPairs._collection || r.kvPairs;
        const keys = Object.keys(col).map(k => parseInt(k));
        const vals = Object.values(col).map(v => Utils.getCleanValue(v)).flat();
        
        if (keys.includes(19)) constraints.targetRating = Math.max(constraints.targetRating, r.count || vals[0] || 0);
        if (keys.includes(35)) constraints.targetChem = Math.max(constraints.targetChem, vals[0] || 0);
        if (keys.includes(17) && (vals.includes(3) || vals.includes(17))) constraints.minGold = r.count;
        if (keys.includes(25) && (vals.includes(4) || vals.includes(25))) constraints.minRare = r.count;

        // Diversity/Limits
        if (keys.includes(15) || keys.includes(5)) {
            if (r.count > 0 && r.count < 11) constraints.maxTotalNations = Math.min(constraints.maxTotalNations, r.count);
        }
        if (keys.includes(12) || keys.includes(6)) {
            if (r.count > 0 && r.count < 11) constraints.maxTotalLeagues = Math.min(constraints.maxTotalLeagues, r.count);
        }
    });

    log(`Targets: ${constraints.targetChem} Chem | ${constraints.minGold} Gold`);

    log("Performing Multi-Pass Sync...");
    await Promise.all([
        Inventory.fetchItems({ count: 250 }),
        Inventory.fetchItems({ league: 13, count: 50 }),
        Inventory.fetchItems({ league: 53, count: 50 }),
        Inventory.fetchItems({ league: 19, count: 50 }),
        Inventory.fetchItems({ league: 31, count: 50 }),
        Inventory.fetchItems({ league: 16, count: 50 })
    ]);
    await Inventory.primeInventory();

    const pool = Inventory.memory.filter(p => 
        p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 85
    );

    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);

    const getStats = (items: (EAItem | null)[]) => {
        const active = items.filter(p => p !== null) as EAItem[];
        if (active.length === 0) return { chem: 0, rating: 0, nations: 0, rare: 0, gold: 0 };
        
        const tempPlayers = new Array(23).fill(null);
        activeSlots.forEach((slot: any, i: number) => { if (items[i]) tempPlayers[slot.index] = items[i]; });
        squad.setPlayers(tempPlayers);
        
        return { 
            chem: squad.getChemistry(), 
            rating: Utils.calculateRating(items), 
            nations: new Set(active.map(p => p.nationId)).size, 
            gold: active.filter(p => p.rating >= 75).length, 
            rare: active.filter(p => p.rareflag === 1).length 
        };
    };

    const runTrial = (lid: number, nid: number) => {
        const selected: (EAItem | null)[] = new Array(11).fill(null);
        const usedIds = new Set<number>(); const usedPersonaIds = new Set<number>();
        const counts: any = { club: {}, nation: {}, league: {}, gold: 0, rare: 0 };
        let iterations = 0;

        const isValid = (p: EAItem, slotIdx: number) => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId!)) return false;
            // Basic limits
            if ((counts.club[p.teamId!] || 0) >= 4) return false; // Default club limit
            if ((counts.nation[p.nationId!] || 0) >= constraints.maxSameNation) return false;
            if ((counts.league[p.leagueId!] || 0) >= (p.leagueId === lid ? 11 : constraints.maxSameLeague)) return false;
            
            const slotsLeft = 11 - slotIdx - 1;
            if (counts.gold < constraints.minGold && (constraints.minGold - counts.gold) > slotsLeft + (p.rating >= 75 ? 1 : 0)) return false;
            if (counts.rare < constraints.minRare && (constraints.minRare - counts.rare) > slotsLeft + (p.rareflag === 1 ? 1 : 0)) return false;
            return true;
        };

        const sortedPool = [...pool].sort((a,b) => {
            const aMatch = (a.leagueId === lid || a.nationId === nid) ? 0 : 1;
            const bMatch = (b.leagueId === lid || b.nationId === nid) ? 0 : 1;
            return aMatch - bMatch || (a.rating - b.rating);
        });

        const solve = (idx: number): boolean => {
            iterations++; if (iterations > 2000) return false;
            if (idx === 11) return true;
            const slotPos = Utils.normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            
            const candidates = sortedPool.filter(p => isValid(p, idx))
                .sort((a,b) => {
                    const aPosMatch = Utils.normalizePos(a.preferredPosition) === slotPos ? 0 : 1;
                    const bPosMatch = Utils.normalizePos(b.preferredPosition) === slotPos ? 0 : 1;
                    return aPosMatch - bPosMatch;
                })
                .slice(0, 8);
            
            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId!);
                counts.club[p.teamId!] = (counts.club[p.teamId!] || 0) + 1;
                counts.nation[p.nationId!] = (counts.nation[p.nationId!] || 0) + 1;
                counts.league[p.leagueId!] = (counts.league[p.leagueId!] || 0) + 1;
                if (p.rating >= 75) counts.gold++; if (p.rareflag === 1) counts.rare++;

                if (solve(idx + 1)) return true;

                selected[idx] = null; usedIds.delete(p.id); usedPersonaIds.delete(p._personaId!);
                counts.club[p.teamId!]--; counts.nation[p.nationId!]--; counts.league[p.leagueId!]--;
                if (p.rating >= 75) counts.gold--; if (p.rareflag === 1) counts.rare--;
            }
            return false;
        };
        return solve(0) ? { squad: selected, lid, nid } : null;
    };

    const lCounts: any = {}; pool.forEach(p => lCounts[p.leagueId!] = (lCounts[p.leagueId!] || 0) + 1);
    const topLeagues = Object.entries(lCounts).sort((a: any,b: any) => b[1]-a[1]).slice(0, 8).map(x => parseInt(x[0]));
    
    let best: any = null;
    for (const lid of topLeagues) {
        const res = runTrial(lid, 0);
        if (!res) continue;
        const stats = getStats(res.squad);
        const valid = stats.chem >= constraints.targetChem && stats.rating >= constraints.targetRating && stats.gold >= constraints.minGold && stats.rare >= constraints.minRare;
        if (valid && (!best || stats.chem > best.chem)) best = { ...res, ...stats };
        if (best && best.chem >= 33) break;
    }

    if (best) {
        log(`✅ CSP Success: ${best.chem} Chem | ${best.rating} Rating`);
        
        // Phase 4: Position Shuffle for extra chem
        for (let i = 0; i < 11; i++) {
            for (let j = i + 1; j < 11; j++) {
                const temp = [...best.squad];
                [temp[i], temp[j]] = [temp[j], temp[i]];
                const newChem = getStats(temp).chem;
                if (newChem > best.chem) {
                    best.squad = temp; best.chem = newChem;
                    console.log(`[SHUFFLE] Improved chem to ${newChem}`);
                }
            }
        }

        const final = new Array(23).fill(null);
        best.squad.forEach((p: any, i: number) => { if (p) final[activeSlots[i].index] = p; });
        squad.setPlayers(final);
        await Utils.saveSquad(challenge, squad, controller);
        log("✅ Challenge Solved.");
    } else {
        log("❌ CSP Engine failed to find valid solution.");
    }

  }
}
