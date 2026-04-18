import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';

export class ChallengeSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Complex Constraints...");
    const rules = {
        targetRating: 0, targetChem: 0, minGold: 0, minRare: 0,
        maxSameClub: 11, maxSameNation: 11, maxSameLeague: 11,
        maxTotalNations: 11, maxTotalLeagues: 11,
        seeds: [] as { type: string, ids: number[], count: number }[]
    };

    (challenge.eligibilityRequirements || []).forEach((r: any) => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const key = parseInt(k);
            const val = Utils.getCleanValue(col[k]);
            const vals = (Array.isArray(val) ? val : [val]).filter(v => v !== undefined);
            
            if (key === 19) rules.targetRating = Math.max(rules.targetRating, vals[0] || 0);
            if (key === 35 || key === 20) rules.targetChem = Math.max(rules.targetChem, vals[0] || 0);
            if (key === 17 && vals.includes(3)) rules.minGold = r.count;
            if (key === 25 && vals.includes(4)) rules.minRare = r.count;

            if (r.count === -1) {
                if (r.scope === 1) {
                    if (key === 5 || key === 7 || key === 9) rules.maxTotalNations = Math.min(rules.maxTotalNations, vals[0]);
                    if (key === 6 || key === 10 || key === 12) rules.maxTotalLeagues = Math.min(rules.maxTotalLeagues, vals[0]);
                } else {
                    if (key === 5 || key === 9) rules.maxSameNation = Math.min(rules.maxSameNation, vals[0]);
                    if (key === 6 || key === 10) rules.maxSameLeague = Math.min(rules.maxSameLeague, vals[0]);
                    if (key === 7 || key === 12) rules.maxSameClub = Math.min(rules.maxSameClub, vals[0]);
                }
            } else {
                const validIds = vals.filter(id => id > 0);
                if (validIds.length > 0) {
                    const type = (key === 14 || key === 12 || key === 7) ? 'club' : ((key === 15 || key === 5 || key === 9) ? 'nation' : 'league');
                    rules.seeds.push({ type, ids: validIds, count: r.count });
                }
            }
        }
    });

    log(`Targets: ${rules.targetChem} Chem | Nations: ${rules.maxTotalNations} Max Total`);

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
        p.tradable === false && !p.evolutionInfo && p.rareflag <= 1 && p.rating < 89
    );

    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);

    // --- STEP 3: OVERLAP DISCOVERY ---
    const overlaps: Record<string, { lid: number, nid: number, count: number }> = {};
    pool.forEach(p => {
        const key = `${p.leagueId}-${p.nationId}`;
        if (!overlaps[key]) overlaps[key] = { lid: p.leagueId!, nid: p.nationId!, count: 0 };
        overlaps[key].count++;
    });

    const trialOverlaps = Object.values(overlaps)
        .sort((a,b) => b.count - a.count)
        .slice(0, 15);

    const calculateRating = (items: (EAItem | null)[]) => {
        const active = items.filter(p => p !== null);
        if (active.length < 11) return 0;
        const ratings = active.map(p => p!.rating);
        const sum = ratings.reduce((a, b) => a + b, 0);
        const avg = sum / 11;
        let cf = 0; ratings.forEach(r => { if (r > avg) cf += (r - avg); });
        return Math.floor((sum + cf) / 11 + 0.0401);
    };

    const runTrial = (ov: { lid: number, nid: number }) => {
        const selected: (EAItem | null)[] = new Array(11).fill(null);
        const usedIds = new Set<number>(); const usedPersonaIds = new Set<number>();
        const counts: any = { nation: new Map(), league: new Map(), club: {} };
        const fulfilled = new Array(rules.seeds.length).fill(0);
        let iterations = 0;

        const updateState = (p: EAItem, add: boolean) => {
            const mod = add ? 1 : -1;
            counts.club[p.teamId!] = (counts.club[p.teamId!] || 0) + mod;
            rules.seeds.forEach((s, i) => {
                const match = (s.type === 'club' && s.ids.includes(p.teamId!)) ||
                              (s.type === 'nation' && s.ids.includes(p.nationId!)) ||
                              (s.type === 'league' && s.ids.includes(p.leagueId!));
                if (match) fulfilled[i] += mod;
            });
            if (add) {
                counts.nation.set(p.nationId, (counts.nation.get(p.nationId) || 0) + 1);
                counts.league.set(p.leagueId, (counts.league.get(p.leagueId) || 0) + 1);
            } else {
                const nC = counts.nation.get(p.nationId) - 1;
                if (nC <= 0) counts.nation.delete(p.nationId); else counts.nation.set(p.nationId, nC);
                const lC = counts.league.get(p.leagueId) - 1;
                if (lC <= 0) counts.league.delete(p.leagueId); else counts.league.set(p.leagueId, lC);
            }
        };

        const isValid = (p: EAItem, slotIdx: number) => {
            if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId!)) return false;
            if ((counts.club[p.teamId!] || 0) >= rules.maxSameClub) return false;
            if ((counts.nation.get(p.nationId) || 0) >= rules.maxSameNation) return false;
            if ((counts.league.get(p.leagueId) || 0) >= rules.maxSameLeague) return false;
            if (!counts.nation.has(p.nationId) && counts.nation.size >= rules.maxTotalNations) return false;
            if (!counts.league.has(p.leagueId) && counts.league.size >= rules.maxTotalLeagues) return false;
            
            const left = 11 - slotIdx - 1;
            for (let i = 0; i < rules.seeds.length; i++) {
                if (rules.seeds[i].count - fulfilled[i] > left + 1) return false;
            }
            return true;
        };

        const solve = (idx: number): boolean => {
            iterations++; if (iterations > 5000) return false;
            if (idx === 11) {
                const tempArr = new Array(23).fill(null);
                activeSlots.forEach((slot: any, i: number) => tempArr[slot.index] = selected[i]);
                squad.setPlayers(tempArr);
                return calculateRating(selected) >= rules.targetRating && squad.getChemistry() >= rules.targetChem;
            }

            const slotPos = Utils.normalizePos(activeSlots[idx].position?.id || activeSlots[idx]._position);
            const candidates = pool.filter(p => isValid(p, idx))
                .map(p => {
                    let score = 0;
                    rules.seeds.forEach((s, si) => { if (fulfilled[si] < s.count && ((s.type==='club' && s.ids.includes(p.teamId!))||(s.type==='nation' && s.ids.includes(p.nationId!))||(s.type==='league' && s.ids.includes(p.leagueId!)))) score += 10000; });
                    if (p.leagueId === ov.lid && p.nationId === ov.nid) score += 5000;
                    else if (p.nationId === ov.nid) score += 1000;
                    if (Utils.normalizePos(p.preferredPosition) === slotPos) score += 500;
                    return { p, score };
                })
                .sort((a,b) => b.score - a.score || (a.p.rating - b.p.rating))
                .slice(0, 15).map(c => c.p);

            for (const p of candidates) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId!);
                updateState(p, true);
                if (solve(idx + 1)) return true;
                updateState(p, false);
                selected[idx] = null; usedIds.delete(p.id); usedPersonaIds.delete(p._personaId!);
            }
            return false;
        };
        return solve(0) ? { squad: [...selected] } : null;
    };

    let best: any = null;
    for (const ov of trialOverlaps) {
        const res = runTrial(ov);
        if (res) {
            const tempArr = new Array(23).fill(null);
            activeSlots.forEach((slot: any, i: number) => tempArr[slot.index] = res.squad[i]);
            squad.setPlayers(tempArr);
            const chem = squad.getChemistry();
            if (!best || chem > best.chem) { best = { squad: res.squad, chem }; if (chem >= 33) break; }
        }
    }

    if (best) {
        const final = new Array(23).fill(null);
        best.squad.forEach((p: any, i: number) => { if (p) final[activeSlots[i].index] = p; });
        squad.setPlayers(final);
        await Utils.saveSquad(challenge, squad, controller);
        log(`✅ Challenge Solved: ${best.chem} Chem`);
    } else {
        log("❌ Failed to find structural solution.");
    }
  }
}
