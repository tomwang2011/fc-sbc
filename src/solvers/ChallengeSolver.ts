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

    // --- UNIVERSAL ENGINE ---
    const solveUniversal = (anchorLeagues: number[]): EAItem[] | null => {
        const selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);
        const usedIds = new Set<number>();
        const counts: any = { nation: new Map(), league: new Map(), club: new Map() };
        let iterations = 0;

        const updateMap = (map: Map<number, number>, key: number, mod: number) => {
            const v = (map.get(key) || 0) + mod;
            if (v <= 0) map.delete(key); else map.set(key, v);
        };

        // SEED IDENTIFICATION
        const isSeed = (p: EAItem) => {
            return summary.specificConstraints.some(s => 
                (s.type === 'club' && s.ids.includes(p.teamId!)) ||
                (s.type === 'nation' && s.ids.includes(p.nationId!)) ||
                (s.type === 'league' && s.ids.includes(p.leagueId!))
            );
        };

        const recurse = (idx: number): boolean => {
            iterations++;
            if (iterations > 20000) return false;

            if (idx === activeSlots.length) {
                const finalArr = new Array(23).fill(null);
                activeSlots.forEach((s: any, i: number) => finalArr[s.index] = selected[i]);
                squad.setPlayers(finalArr);
                
                const finalC = squad.getChemistry();
                const rt = selected.map(p => p!.rating), sum = rt.reduce((a,b)=>a+b,0), avg = sum/11;
                let cf=0; rt.forEach(v=>{if(v>avg)cf+=(v-avg);});
                const finalR = Math.floor((sum+cf)/11 + 0.0401);

                if (finalR < summary.minRating || finalC < summary.minChem) return false;
                if (counts.nation.size < summary.minTotalNations || counts.league.size < summary.minTotalLeagues) return false;
                
                for (const constraint of summary.specificConstraints) {
                    const count = selected.filter(p => 
                        (constraint.type === 'club' && constraint.ids.includes(p!.teamId!)) ||
                        (constraint.type === 'nation' && constraint.ids.includes(p!.nationId!)) ||
                        (constraint.type === 'league' && constraint.ids.includes(p!.leagueId!))
                    ).length;
                    if (count < constraint.count) return false;
                }
                return true;
            }

            const slot = activeSlots[idx];
            const candidates = pool.filter(p => {
                if (usedIds.has(p.id) || Utils.normalizePos(p.preferredPosition) !== slot.pos) return false;
                const matchesLeagues = anchorLeagues.length === 0 || anchorLeagues.includes(p.leagueId!);
                if (!matchesLeagues && !isSeed(p)) return false;
                if (counts.nation.size >= 3 && !counts.nation.has(p.nationId)) return false;
                if ((counts.club.get(p.teamId!)||0) >= summary.maxSameClub) return false;
                return true;
            }).map(p => {
                let score = 0;
                if (isSeed(p)) score += 50000;
                if (anchorLeagues.includes(p.leagueId!)) score += 10000;
                if (counts.club.get(p.teamId!) === 1) score += 30000;
                if (counts.nation.get(p.nationId!) === 1) score += 20000;
                return { p, score };
            }).sort((a,b) => b.score - a.score || (a.p.rating - b.p.rating)).slice(0, 15).map(c => c.p);

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

            for (let i = 0; i < current.length && !changed; i++) {
                for (let j = 0; j < current.length && !changed; j++) {
                    if (i === j) continue;
                    const pI = current[i], pJ = current[j];
                    if (pI.rating < 75 && pJ.rating < 75) continue; 
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

    // --- ADAPTIVE EXECUTION ---
    const leagues: Record<number, number> = {};
    pool.forEach(p => { if(!leagues[p.leagueId!]) leagues[p.leagueId!] = 0; leagues[p.leagueId!]++; });
    const sortedLeagues = Object.keys(leagues).sort((a,b) => leagues[Number(b)] - leagues[Number(a)]).map(Number).slice(0, 10);

    const leagueCountToTry = Math.max(2, summary.minTotalLeagues);
    log(`Strategizing for ${leagueCountToTry} leagues with ${summary.specificConstraints.length} specific constraints...`);

    if (summary.minChem < 15) {
        log("Low Chem Detected: Using Wide-Pool mode.");
        const res = solveUniversal([]); // No anchor leagues
        if (res) {
            const optimized = optimizeFodder(res);
            const finalArr = new Array(23).fill(null);
            activeSlots.forEach((s: any, idx: number) => finalArr[s.index] = optimized[idx]);
            squad.setPlayers(finalArr);
            await Utils.saveSquad(challenge, squad, controller);
            return log("✅ Wide-Pool Solution Applied!");
        }
    } else {
        // High Chem Template permutations
        for (let i=0; i < sortedLeagues.length; i++) {
            for (let j=i+1; j < sortedLeagues.length; j++) {
                const anchors = [sortedLeagues[i], sortedLeagues[j]];
                log(`... trial: L${anchors[0]} + L${anchors[1]}`);
                const res = solveUniversal(anchors);
                if (res) {
                    const optimized = optimizeFodder(res);
                    const finalArr = new Array(23).fill(null);
                    activeSlots.forEach((s: any, idx: number) => finalArr[s.index] = optimized[idx]);
                    squad.setPlayers(finalArr);
                    await Utils.saveSquad(challenge, squad, controller);
                    return log("✅ Adaptive Template Solution Applied!");
                }
            }
        }
    }
    log("❌ All structures failed.");
  }
}
