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
        if (keys.includes(17) && vals.includes(3)) constraints.minGold = r.count;
        if (keys.includes(25) && vals.includes(4)) constraints.minRare = r.count;

        if (keys.includes(15) || keys.includes(5)) {
            if (r.count > 0 && r.count < 11) constraints.maxTotalNations = Math.min(constraints.maxTotalNations, r.count);
            vals.forEach((v: any) => { if (typeof v === 'number' && v > 0 && v < 5) constraints.maxTotalNations = Math.min(constraints.maxTotalNations, v); });
        }
        if (keys.includes(12) || keys.includes(6)) {
            if (r.count > 0 && r.count < 11) constraints.maxTotalLeagues = Math.min(constraints.maxTotalLeagues, r.count);
        }
    });

    log(`Targets: ${constraints.targetChem} Chem | ${constraints.maxTotalNations} Nations | ${constraints.minGold} Gold`);

    log("Performing Multi-Pass Sync...");
    await Promise.all([
        Inventory.fetchItems({ count: 250 }), // Broad
        Inventory.fetchItems({ league: 13, count: 50 }), // PL
        Inventory.fetchItems({ league: 53, count: 50 }), // LaLiga
        Inventory.fetchItems({ league: 19, count: 50 })  // Bundesliga
    ]);
    await Inventory.primeInventory();

    const pool = Inventory.memory.filter(p => 
        p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 83
    );

    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);

    const getStats = (items: (EAItem | null)[]) => {
        const active = items.filter(p => p !== null) as EAItem[];
        if (active.length === 0) return { chem: 0, rating: 0, nations: 0, rare: 0, gold: 0 };
        
        let chem = 0;
        const nMap: any = {}, lMap: any = {}, cMap: any = {};
        const inPos = items.map((p, i) => {
            if (!p) return false;
            const slotPos = Utils.normalizePos(activeSlots[i].position?.id || activeSlots[i]._position);
            const ok = Utils.normalizePos(p.preferredPosition) === slotPos;
            if (ok) { 
                nMap[p.nationId!] = (nMap[p.nationId!] || 0) + 1; 
                lMap[p.leagueId!] = (lMap[p.leagueId!] || 0) + 1; 
                cMap[p.teamId!] = (cMap[p.teamId!] || 0) + 1; 
            }
            return ok;
        });

        items.forEach((p, i) => {
            if (!p || !inPos[i]) return;
            if (nMap[p.nationId!] >= 9) chem += 3; else if (nMap[p.nationId!] >= 6) chem += 2; else if (nMap[p.nationId!] >= 3) chem += 1;
            if (lMap[p.leagueId!] >= 8) chem += 3; else if (lMap[p.leagueId!] >= 5) chem += 2; else if (lMap[p.leagueId!] >= 3) chem += 1;
            if (cMap[p.teamId!] >= 7) chem += 3; else if (cMap[p.teamId!] >= 4) chem += 2; else if (cMap[p.teamId!] >= 2) chem += 1;
        });
        return { 
            chem, 
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
            if ((counts.club[p.teamId!] || 0) >= constraints.maxSameClub) return false;
            if ((counts.nation[p.nationId!] || 0) >= constraints.maxSameNation) return false;
            if ((counts.league[p.leagueId!] || 0) >= (p.leagueId === lid ? 11 : constraints.maxSameLeague)) return false;
            const curNations = new Set(selected.filter(x => x).map(x => x!.nationId));
            if (!curNations.has(p.nationId) && curNations.size >= constraints.maxTotalNations) return false;
            const slotsLeft = 11 - slotIdx - 1;
            if (counts.gold < constraints.minGold && (constraints.minGold - counts.gold) > slotsLeft + (p.rating >= 75 ? 1 : 0)) return false;
            if (counts.rare < constraints.minRare && (constraints.minRare - counts.rare) > slotsLeft + (p.rareflag === 1 ? 1 : 0)) return false;
            return true;
        };

        const sortedPool = [...pool].sort((a,b) => (a.leagueId === lid && a.nationId === nid) ? -1 : 1);

        const solve = (idx: number): boolean => {
            iterations++; if (iterations > 3000) return false;
            if (idx === 11) return true;
            const slotPos = Utils.normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            const candidates = sortedPool.filter(p => isValid(p, idx)).sort((a,b) => (Utils.normalizePos(a.preferredPosition) === slotPos ? -1 : 1) || (a.rating - b.rating)).slice(0, 15);
            
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
        return solve(0) ? { squad: selected, ...getStats(selected), lid, nid } : null;
    };

    const lCounts: any = {}; pool.forEach(p => lCounts[p.leagueId!] = (lCounts[p.leagueId!] || 0) + 1);
    const topLeagues = Object.entries(lCounts).sort((a: any,b: any) => b[1]-a[1]).slice(0, 10).map(x => parseInt(x[0]));
    const candidates: any[] = [];
    topLeagues.forEach(lid => {
        const lp = pool.filter(p => p.leagueId === lid);
        const nc: any = {}; lp.forEach(p => nc[p.nationId!] = (nc[p.nationId!] || 0) + 1);
        Object.entries(nc).sort((a: any,b: any) => b[1]-a[1]).slice(0, 3).forEach(n => candidates.push({ lid, nid: parseInt(n[0]) }));
    });

    let best: any = null;
    for (const c of candidates) {
        const res = runTrial(c.lid, c.nid);
        if (!res) continue;
        const valid = res.chem >= constraints.targetChem && res.rating >= constraints.targetRating && res.gold >= constraints.minGold && res.rare >= constraints.minRare && res.nations <= constraints.maxTotalNations;
        const score = (res.chem * 100) + (1000 - Math.abs(res.rating - constraints.targetRating) * 10);
        if (valid && (!best || score > best.score)) best = { ...res, score };
    }

    if (best) {
        log(`✅ Found Solution: L:${best.lid} N:${best.nid} (${best.chem} Chem)`);
        const final = new Array(23).fill(null);
        best.squad.forEach((p: any, i: number) => { if (p) final[activeSlots[i].index] = p; });
        squad.setPlayers(final);
        await Utils.saveSquad(challenge, squad, controller);
        log("✅ Challenge Solved and Saved.");
    } else {
        log("❌ No Valid Solution Found. Adjusting discovery might help.");
    }
  }
}
