import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';

export class EfficientSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Requirements...");
    const rawReqs = challenge.eligibilityRequirements || [];
    let minRaresNeeded = 0;
    const buckets: any[] = [];
    let globalLevel: any = null;
    const levelsToDiscover = new Set<string>();

    rawReqs.forEach((r: any) => {
        const rules: any[] = [];
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) rules.push({ key: parseInt(k), value: Utils.getCleanValue(col[k]) });

        const isRare = rules.some(rl => (rl.key === 25 && rl.value.includes(4)) || (rl.key === 18 && rl.value.includes(1)));
        if (isRare) minRaresNeeded = Math.max(minRaresNeeded, r.count || 0);

        const bronze = rules.some(rl => (rl.key === 17 && rl.value.includes(1)) || (rl.key === 3 && rl.value.includes(1)));
        const silver = rules.some(rl => (rl.key === 17 && rl.value.includes(2)) || (rl.key === 3 && rl.value.includes(2)));
        const gold = rules.some(rl => (rl.key === 17 && rl.value.includes(3)) || (rl.key === 3 && rl.value.includes(3)));

        const bInfo = bronze ? { level: "bronze", min: 0, max: 64 } : (silver ? { level: "silver", min: 65, max: 74 } : (gold ? { level: "gold", min: 75, max: 82 } : null));
        if (bInfo) {
            levelsToDiscover.add(bInfo.level);
            if (r.count > 0) buckets.push({ ...bInfo, count: r.count });
            else if (r.count === -1) globalLevel = bInfo;
        }
    });

    if (buckets.length === 0 && !globalLevel) globalLevel = { level: "gold", min: 75, max: 82 };
    await Inventory.primeInventory(Array.from(levelsToDiscover));

    const pool = Inventory.memory.filter(p => {
        if (settings.untradOnly && p.tradable === true) return false;
        if (settings.excludedLeagues.includes(p.leagueId!)) return false;
        const isStandard = p.rareflag === 0 || p.rareflag === 1;
        if (!isStandard) return false;
        return true;
    }).sort((a,b) => (a._sourcePriority! - b._sourcePriority!) || (a.rating - b.rating));

    const usedPersonaIds = new Set<number>();
    const usedIds = new Set<number>();
    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);
    const selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);
    let raresInserted = 0;

    const findMatch = (lvl: any, rareflag: number, ignoreRarity = false) => {
      return pool.find(p => {
        if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId!)) return false;
        if (p.rating < lvl.min || p.rating > (lvl.level === 'gold' ? 82 : lvl.max)) return false;
        if (!ignoreRarity && p.rareflag !== rareflag) return false;
        return true;
      });
    };

    [...buckets, ...(globalLevel ? [{ ...globalLevel, count: 11 }] : [])].forEach(bucket => {
      let count = 0;
      const targetCount = (bucket.count === 11 || bucket.count === -1 ? activeSlots.length : bucket.count);
      activeSlots.forEach((slot: any, i: number) => {
        if (selected[i] || count >= targetCount) return;
        let match = (raresInserted < minRaresNeeded) ? findMatch(bucket, 1) : findMatch(bucket, 0, bucket.level !== 'gold');
        if (!match) match = findMatch(bucket, 0, true);
        if (match) {
          console.log(`[DECISION] Slot ${slot.index}: ${match.rareflag ? "RARE" : "COMMON"} ${match._staticData?.name} (${match.rating})`);
          selected[i] = match; usedIds.add(match.id); usedPersonaIds.add(match._personaId!);
          count++; if (match.rareflag) raresInserted++;
        }
      });
    });

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot: any, i: number) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    await Utils.saveSquad(challenge, squad, controller);
    log("✅ Solve Successful.");
  }
}
