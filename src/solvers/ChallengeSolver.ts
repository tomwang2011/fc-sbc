import { EAItem, SolverSettings, SbcSummary } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';
import { SbcParser } from '../core/SbcParser';

export class ChallengeSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Structural Requirements...");
    const summary = SbcParser.parseCurrentSbc();
    if (!summary) return log("❌ Failed to parse SBC requirements");

    log(`Targets: ${summary.minChem} Chem | ${summary.minRating} Rating`);

    log("Performing 1000-Player Deep Scan...");
    await Inventory.primeInventory();

    const ratingFloor = Math.max(0, summary.minRating - 3);
    const pool = Inventory.memory.filter(p => 
        p.tradable === false && !p.evolutionInfo && p.rating >= ratingFloor && p.rating <= 83
    ).sort((a,b) => a.rating - b.rating);

    log(`[INFO] Deep Pool: ${pool.length} candidates.`);

    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10).map((s: any) => ({
        index: s.index, pos: Utils.normalizePos(s.positionId || s.position?.id)
    }));

    // --- TEMPLATE ENGINE ---
    const solveTemplate = (lA: number, lB: number): EAItem[] | null => {
        const selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);
        const usedIds = new Set<number>();
        const counts: any = { nation: new Map(), league: new Map(), club: new Map() };
        let iterations = 0;

        const updateMap = (map: Map<number, number>, key: number, mod: number) => {
            const v = (map.get(key) || 0) + mod;
            if (v <= 0) map.delete(key); else map.set(key, v);
        };

        const recurse = (idx: number): boolean => {
            iterations++;
            if (iterations > 30000) return false;

            if (idx === activeSlots.length) {
                const finalArr = new Array(23).fill(null);
                activeSlots.forEach((s: any, i: number) => finalArr[s.index] = selected[i]);
                squad.setPlayers(finalArr);
                
                const finalC = squad.getChemistry();
                const rt = selected.map(p => p!.rating), sum = rt.reduce((a,b)=>a+b,0), avg = sum/11;
                let cf=0; rt.forEach(v=>{if(v>avg)cf+=(v-avg);});
                const finalR = Math.floor((sum+cf)/11 + 0.0401);

                return (finalC >= summary.minChem && finalR >= summary.minRating && counts.nation.size >= summary.minTotalNations);
            }

            const slot = activeSlots[idx];
            const candidates = pool.filter(p => {
                if (usedIds.has(p.id) || Utils.normalizePos(p.preferredPosition) !== slot.pos) return false;
                if (p.leagueId !== lA && p.leagueId !== lB) return false; 
                if (counts.nation.size >= 3 && !counts.nation.has(p.nationId)) return false;
                if ((counts.club.get(p.teamId!)||0) >= summary.maxSameClub) return false;
                return true;
            }).map(p => {
                let score = 0;
                if (counts.club.get(p.teamId!) === 1) score += 30000;
                if (counts.nation.get(p.nationId!) === 1) score += 20000;
                return { p, score };
            }).sort((a,b) => b.score - a.score || (a.p.rating - b.p.rating)).slice(0, 12).map(c => c.p);

            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id);
                updateMap(counts.club, p.teamId!, 1); updateMap(counts.nation, p.nationId!, 1); updateMap(counts.league, p.leagueId!, 1);
                if (recurse(idx + 1)) return true;
                updateMap(counts.club, p.teamId!, -1); updateMap(counts.nation, p.nationId!, -1); updateMap(counts.league, p.leagueId!, -1);
                selected[idx] = null; usedIds.delete(p.id);
            }
            return false;
        };
        
        if (recurse(0)) return selected as EAItem[];
        return null;
    };

    const optimizeFodder = (items: EAItem[]) => {
        let current = [...items];
        let changed = true;
        log("🔍 Starting Multi-Axis Optimization (V30)...");
        
        const tryApply = (next: EAItem[]): boolean => {
            if (Utils.calculateRating(next) < summary.minRating) return false;
            const tempArr = new Array(23).fill(null);
            activeSlots.forEach((s: any, idx: number) => tempArr[s.index] = next[idx]);
            squad.setPlayers(tempArr);
            return squad.getChemistry() >= summary.minChem;
        };

        while (changed) {
            changed = false;
            
            // Pass 1: Aggressive Solo Downgrade (Lowest Rating First)
            const sortedByRating = current.map((p, i) => ({ p, i })).sort((a, b) => b.p.rating - a.p.rating);
            for (const { p, i } of sortedByRating) {
                const possible = pool.filter(cand => !current.some(ci => ci.id === cand.id) && cand.rating < p.rating && Utils.normalizePos(cand.preferredPosition) === Utils.normalizePos(p.preferredPosition)).sort((a,b) => a.rating - b.rating);
                for (const swap of possible) {
                    const next = [...current]; next[i] = swap;
                    if (tryApply(next)) { current = next; changed = true; log(`[SOLO] Downgraded ${p.rating} -> ${swap.rating}`); break; }
                }
                if (changed) break;
            }
            if (changed) continue;

            // Pass 2: Pair-Wise Bridge (Swap 2 players to unlock rating drop)
            // We look for a pair where one might go UP slightly but the other goes DOWN significantly
            for (let i = 0; i < current.length && !changed; i++) {
                for (let j = 0; j < current.length && !changed; j++) {
                    if (i === j) continue;
                    const pI = current[i], pJ = current[j];
                    if (pI.rating < 75 && pJ.rating < 75) continue; // Don't bridge low cards

                    const candidatesI = pool.filter(c => !current.some(ci => ci.id === c.id) && Utils.normalizePos(c.preferredPosition) === Utils.normalizePos(pI.preferredPosition)).slice(0, 10);
                    const candidatesJ = pool.filter(c => !current.some(ci => ci.id === c.id) && Utils.normalizePos(c.preferredPosition) === Utils.normalizePos(pJ.preferredPosition)).slice(0, 10);

                    for (const cI of candidatesI) {
                        for (const cJ of candidatesJ) {
                            if (cI.id === cJ.id || (cI.rating + cJ.rating >= pI.rating + pJ.rating)) continue;
                            const next = [...current]; next[i] = cI; next[j] = cJ;
                            if (tryApply(next)) {
                                current = next; changed = true;
                                log(`[BRIDGE] Optimized Pair: (${pI.rating},${pJ.rating}) -> (${cI.rating},${cJ.rating})`);
                                break;
                            }
                        }
                        if (changed) break;
                    }
                }
            }
        }
        return current;
    };

    // --- EXECUTION LOOP ---
    const leagues: Record<number, number> = {};
    pool.forEach(p => { if(!leagues[p.leagueId!]) leagues[p.leagueId!] = 0; leagues[p.leagueId!]++; });
    const trialLeagues = Object.keys(leagues).filter(id => leagues[Number(id)] >= 5).sort((a,b) => leagues[Number(b)] - leagues[Number(a)]).map(Number).slice(0, 8);

    log(`Testing permutations of ${trialLeagues.length} major leagues...`);
    for (let i=0; i<trialLeagues.length; i++) {
        for (let j=i+1; j<trialLeagues.length; j++) {
            log(`... trial: L${trialLeagues[i]} + L${trialLeagues[j]}`);
            const res = solveTemplate(trialLeagues[i], trialLeagues[j]);
            if (res) {
                const optimized = optimizeFodder(res);
                const finalArr = new Array(23).fill(null);
                activeSlots.forEach((s: any, idx: number) => finalArr[s.index] = optimized[idx]);
                squad.setPlayers(finalArr);
                await Utils.saveSquad(challenge, squad, controller);
                return log("✅ Optimized Architect Solution Applied!");
            }
        }
    }
    log("❌ All structures failed.");
  }
}
