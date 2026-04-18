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
    
    const hardReqs: { type: 'club' | 'nation' | 'league', id: number, count: number }[] = [];

    (challenge.eligibilityRequirements || []).forEach((r: any) => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const key = parseInt(k);
            const val = Utils.getCleanValue(col[k]);
            const vals = Array.isArray(val) ? val : [val];

            if (key === 19) constraints.targetRating = Math.max(constraints.targetRating, r.count || vals[0] || 0);
            if (key === 35 || key === 20) constraints.targetChem = Math.max(constraints.targetChem, vals[0] || 0);
            if (key === 17 && vals.includes(3)) constraints.minGold = r.count;
            if (key === 25 && vals.includes(4)) constraints.minRare = r.count;

            // Diversity Mapping (Semantic)
            if (key === 5) {
                if (r.scope === 1) constraints.maxSameNation = vals[0];
                else constraints.maxTotalNations = vals[0];
            }
            if (key === 6) {
                if (r.scope === 1) constraints.maxSameLeague = vals[0];
                else constraints.maxTotalLeagues = vals[0];
            }
            if (key === 7) {
                constraints.maxSameClub = vals[0];
            }
            if (key === 9 && vals[0] === -1) constraints.maxTotalNations = r.count;
            if (key === 10 && vals[0] === -1) constraints.maxTotalLeagues = r.count;

            // Entity Mapping (Specific Seeds)
            if (key === 14) vals.forEach(id => hardReqs.push({ type: 'club', id, count: r.count || 1 }));
            if (key === 15 && vals[0] > 0) vals.forEach(id => hardReqs.push({ type: 'nation', id, count: r.count || 1 }));
            if (key === 11 && vals[0] > 10) vals.forEach(id => hardReqs.push({ type: 'league', id, count: r.count || 1 }));
        }
    });

    log(`Targets: ${constraints.targetChem} Chem | Nations: ${constraints.maxTotalNations} (MaxSame: ${constraints.maxSameNation})`);

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
        const fulfilled = { club: {} as any, nation: {} as any, league: {} as any };
        let iterations = 0;

        const isValid = (p: EAItem, slotIdx: number) => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId!)) return false;
            
            const currentNations = new Set(selected.filter(x => x).map(x => x!.nationId));
            const currentLeagues = new Set(selected.filter(x => x).map(x => x!.leagueId));

            // Diversity Limits check (Total count)
            if (!currentNations.has(p.nationId) && currentNations.size >= constraints.maxTotalNations) return false;
            if (!currentLeagues.has(p.leagueId) && currentLeagues.size >= constraints.maxTotalLeagues) return false;

            // Same Entity Limits check (Per-nation/per-league count)
            if ((counts.club[p.teamId!] || 0) >= constraints.maxSameClub) return false;
            if ((counts.nation[p.nationId!] || 0) >= constraints.maxSameNation) return false;
            if ((counts.league[p.leagueId!] || 0) >= (p.leagueId === lid ? 11 : constraints.maxSameLeague)) return false;

            const slotsLeft = 11 - slotIdx - 1;
            
            // Hard req pruning
            for (const req of hardReqs) {
                const current = (fulfilled as any)[req.type][req.id] || 0;
                const needed = req.count - current;
                if (needed > slotsLeft + 1) return false;
            }

            if (counts.gold < constraints.minGold && (constraints.minGold - counts.gold) > slotsLeft + (p.rating >= 75 ? 1 : 0)) return false;
            if (counts.rare < constraints.minRare && (constraints.minRare - counts.rare) > slotsLeft + (p.rareflag === 1 ? 1 : 0)) return false;
            return true;
        };

        const solve = (idx: number): boolean => {
            iterations++; if (iterations > 3000) return false;
            if (idx === 11) return true;
            const slotPos = Utils.normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            
            // Heuristic Scoring
            const candidates = pool.filter(p => isValid(p, idx))
                .map(p => {
                    let score = 0;
                    hardReqs.forEach(req => {
                        const current = (fulfilled as any)[req.type][req.id] || 0;
                        if (current < req.count) {
                            if (req.type === 'club' && p.teamId === req.id) score += 2000;
                            if (req.type === 'nation' && p.nationId === req.id) score += 1000;
                            if (req.type === 'league' && p.leagueId === req.id) score += 500;
                        }
                    });
                    if (p.leagueId === lid || p.nationId === nid) score += 50;
                    if (Utils.normalizePos(p.preferredPosition) === slotPos) score += 100;
                    return { p, score };
                })
                .sort((a,b) => b.score - a.score || (a.p.rating - b.p.rating))
                .slice(0, 10)
                .map(c => c.p);
            
            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId!);
                counts.club[p.teamId!] = (counts.club[p.teamId!] || 0) + 1;
                counts.nation[p.nationId!] = (counts.nation[p.nationId!] || 0) + 1;
                counts.league[p.leagueId!] = (counts.league[p.leagueId!] || 0) + 1;
                if (p.rating >= 75) counts.gold++; if (p.rareflag === 1) counts.rare++;
                
                // Track fulfilled hard reqs
                hardReqs.forEach(req => {
                    if (req.type === 'club' && p.teamId === req.id) fulfilled.club[req.id] = (fulfilled.club[req.id] || 0) + 1;
                    if (req.type === 'nation' && p.nationId === req.id) fulfilled.nation[req.id] = (fulfilled.nation[req.id] || 0) + 1;
                    if (req.type === 'league' && p.leagueId === req.id) fulfilled.league[req.id] = (fulfilled.league[req.id] || 0) + 1;
                });

                if (solve(idx + 1)) return true;

                selected[idx] = null; usedIds.delete(p.id); usedPersonaIds.delete(p._personaId!);
                counts.club[p.teamId!]--; counts.nation[p.nationId!]--; counts.league[p.leagueId!]--;
                if (p.rating >= 75) counts.gold--; if (p.rareflag === 1) counts.rare--;
                
                hardReqs.forEach(req => {
                    if (req.type === 'club' && p.teamId === req.id) fulfilled.club[req.id]--;
                    if (req.type === 'nation' && p.nationId === req.id) fulfilled.nation[req.id]--;
                    if (req.type === 'league' && p.leagueId === req.id) fulfilled.league[req.id]--;
                });
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
        const valid = stats.chem >= constraints.targetChem && 
                      stats.rating >= constraints.targetRating && 
                      stats.gold >= constraints.minGold && 
                      stats.rare >= constraints.minRare &&
                      stats.nations <= constraints.maxTotalNations;
        
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
