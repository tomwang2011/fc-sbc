import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';
import { SbcParser } from '../core/SbcParser';

export class EfficientSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Requirements...");
    const summary = SbcParser.parseCurrentSbc();
    if (!summary) return log("❌ Failed to parse SBC requirements");

    const levelsToDiscover = new Set<string>();
    if (summary.minGold > 0) levelsToDiscover.add('gold');
    if (summary.minSilver > 0) levelsToDiscover.add('silver');
    if (summary.minBronze > 0) levelsToDiscover.add('bronze');
    if (levelsToDiscover.size === 0) levelsToDiscover.add('gold');

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

    const buckets = [
        ...(summary.minBronze > 0 ? [{ level: 'bronze', min: 0, max: 64, count: summary.minBronze }] : []),
        ...(summary.minSilver > 0 ? [{ level: 'silver', min: 65, max: 74, count: summary.minSilver }] : []),
        ...(summary.minGold > 0 ? [{ level: 'gold', min: 75, max: 82, count: summary.minGold }] : [])
    ];

    // If no buckets, default to gold 11
    if (buckets.length === 0) buckets.push({ level: 'gold', min: 75, max: 82, count: 11 });

    buckets.forEach(bucket => {
      let count = 0;
      const targetCount = (bucket.count >= 11 ? activeSlots.length : bucket.count);
      activeSlots.forEach((slot: any, i: number) => {
        if (selected[i] || count >= targetCount) return;
        let match = (raresInserted < summary.minRare) ? findMatch(bucket, 1) : findMatch(bucket, 0, bucket.level !== 'gold');
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
