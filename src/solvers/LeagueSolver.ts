import { EAItem, SolverSettings } from '../types';
import { Utils } from '../core/Utils';
import { Inventory } from '../core/Inventory';

export class LeagueSolver {
  public static async solve(log: (m: string) => void, settings: SolverSettings) {
    const ctx = Utils.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Target Rating...");
    const rawReqs = challenge.eligibilityRequirements || [];
    let targetRating = 0; let isTotwReq = false;
    const detectedLeagues = new Set<number>();

    rawReqs.forEach((r: any) => {
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const val = Utils.getCleanValue(col[k]);
            const key = parseInt(k);
            if (key === 19) targetRating = Math.max(targetRating, Number(Array.isArray(val) ? val[0] : val) || 0);
            if (key === 11) (Array.isArray(val) ? val : [val]).forEach(l => detectedLeagues.add(l));
            if (key === 18 && val.includes(3)) isTotwReq = true;
        }
    });

    log(`Goal: ${targetRating} OVR | Required Leagues: ${Array.from(detectedLeagues).join(',')}`);
    
    const discoveryLeagues = Array.from(detectedLeagues).slice(0, 3);
    await Promise.all(discoveryLeagues.map(l => Inventory.fetchItems({ league: l, count: 150 })));
    await Inventory.primeInventory();
    
    const globalLeagues = Array.from(detectedLeagues);
    const pool = Inventory.memory.filter(p => {
        if (settings.untradOnly && p.tradable === true) return false;
        if (settings.excludedLeagues.includes(p.leagueId!)) return false;
        if (p.rating >= 83) return false;
        if (globalLeagues.length > 0 && !globalLeagues.includes(p.leagueId!)) return false;
        const isStandard = p.rareflag === 0 || p.rareflag === 1 || (isTotwReq && (p.rarityId === 3 || p.rareflag === 3));
        if (!isStandard) return false;
        return true;
    }).sort((a,b) => (a._sourcePriority! - b._sourcePriority!) || (a.rating - b.rating));

    const usedPersonaIds = new Set<number>();
    const usedIds = new Set<number>();
    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);
    const selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);

    const fillPass = (source: string | null, matchPos: boolean) => {
        activeSlots.forEach((slot: any, i: number) => {
            if (selected[i]) return;
            const slotPos = Utils.normalizePos(slot.position?.id || slot._position);
            const match = pool.find(p => {
                if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId!)) return false;
                if (source && p._sourceType !== source) return false;
                if (matchPos && Utils.normalizePos(p.preferredPosition) !== slotPos) return false;
                return true;
            });
            if (match) { 
                console.log(`[DECISION] Slot ${slot.index}: ${match._staticData?.name} [PosMatch: ${matchPos}] [Source: ${match._sourceType}]`);
                selected[i] = match; usedIds.add(match.id); usedPersonaIds.add(match._personaId!); 
            }
        });
    };

    fillPass('storage', true); fillPass('club', true); fillPass('storage', false); fillPass('club', false);

    if (targetRating > 0) {
        log(`Balancing Rating to ${targetRating}...`);
        let bridgeAttempts = 0;
        while (bridgeAttempts < 50 && Utils.calculateRating(selected) < targetRating) {
            bridgeAttempts++;
            const minR = Math.min(...selected.filter(s => s).map(s => s!.rating));
            const upIdx = selected.findIndex(s => s && s.rating === minR);
            if (upIdx === -1) break;
            const currentItem = selected[upIdx]!;
            const slot = activeSlots[upIdx];
            const slotPos = Utils.normalizePos(slot.position?.id || slot._position);
            const wasPosMatch = Utils.normalizePos(currentItem.preferredPosition) === slotPos;
            let upgrade = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rating > currentItem.rating && p.leagueId === currentItem.leagueId && (wasPosMatch ? Utils.normalizePos(p.preferredPosition) === slotPos : true));
            if (!upgrade) upgrade = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rating > currentItem.rating && p.leagueId === currentItem.leagueId);
            if (upgrade) {
                console.log(`[BRIDGE] Upgrading Slot ${slot.index}: ${currentItem.rating} -> ${upgrade.rating} (${upgrade._staticData?.name})`);
                usedIds.delete(currentItem.id); usedPersonaIds.delete(currentItem._personaId!);
                selected[upIdx] = upgrade; usedIds.add(upgrade.id); usedPersonaIds.add(upgrade._personaId!);
            } else break;
        }
    }

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot: any, i: number) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    await Utils.saveSquad(challenge, squad, controller);
    log(`✅ League Solve Complete.`);
  }
}
