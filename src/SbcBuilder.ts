declare const unsafeWindow: any;

export interface EAItem {
  id: number;
  definitionId: number;
  rating: number;
  type: string;
  itemType?: string;
  concept: boolean;
  rareflag: number;
  rarityId?: number;
  subtype?: number;
  unassigned?: boolean;
  loan?: number;
  leagueId?: number;
  nationId?: number;
  teamId?: number;
  quality?: number;
  preferredPosition?: any;
  possiblePositions?: any[];
  evolutionInfo?: any;
  limitedUseType?: number;
  tradable: boolean;
  untradeable?: boolean;
  _staticData?: {
    name: string;
  };
  isPlayer?: () => boolean;
  isLoanItem?: () => boolean;
  isEvo?: () => boolean;
  _sourceType?: string;
  _sourcePriority?: number;
  _personaId?: number;
}

export interface SolverSettings {
    untradOnly: boolean;
    excludedLeagues: number[];
}

export class SbcBuilder {
  private static _clubPlayersMemory: EAItem[] = [];

  public static getSbcContext(): { challenge: any, squad: any, controller: any } | null {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    try {
      const root = win.getAppMain().getRootViewController();
      const findController = (node: any): any => {
        if (!node) return null;
        if (node._squad && node._challenge) return node;
        const children = [...(node.childViewControllers || []), ...(node.presentedViewController ? [node.presentedViewController] : []), ...(node.currentController ? [node.currentController] : []), ...(node._viewControllers || [])];
        for (const child of children) {
          const found = findController(child);
          if (found) return found;
        }
        return null;
      };
      const controller = findController(root);
      return controller ? { challenge: controller._challenge, squad: controller._squad, controller } : null;
    } catch (e) { return null; }
  }

  public static getCleanValue(val: any): any {
    if (Array.isArray(val)) return val.map(v => (v?.value !== undefined ? v.value : v));
    return (val?.value !== undefined ? val.value : val);
  }

  public static fetchItems(criteriaParams: any): Promise<EAItem[]> {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    return new Promise(r => {
      const criteria = new win.UTSearchCriteriaDTO();
      const finalParams = Object.assign({
        type: 'player', count: 200, excludeLoans: true, isUntradeable: "true", searchAltPositions: true, sortBy: "ovr", sort: "asc"
      }, criteriaParams);
      Object.assign(criteria, finalParams);
      win.services.Club.search(criteria).observe({ name: 'fetch' }, (obs: any, res: any) => {
        const raw = res.response?.items || res.items || res._collection || res;
        r(Array.isArray(raw) ? raw : (raw?._collection || Object.values(raw || {})));
      });
    });
  }

  public static async primeInventory(targetLevels: string[] = []): Promise<{ total: number, storage: number, unassigned: number }> {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    const repo = win.repositories.Item;
    if (!repo) return { total: 0, storage: 0, unassigned: 0 };

    const storageCriteria = new win.UTSearchCriteriaDTO();
    storageCriteria.type = 'player';
    const storageItems = await new Promise<any[]>(r => {
        win.services.Item.searchStorageItems(storageCriteria).observe({ name: 'storage' }, (obs: any, res: any) => {
            const raw = res.response?.items || res.items || res._collection || res;
            r(Array.isArray(raw) ? raw : (raw?._collection || Object.values(raw || {})));
        });
    });

    const clubFetches = [this.fetchItems({ count: 250 })];
    targetLevels.forEach(lvl => clubFetches.push(this.fetchItems({ level: lvl, count: 250 })));
    const clubResults = await Promise.all(clubFetches);

    const allPlayers = new Map<number, EAItem>();
    let storageCount = 0; let unassignedCount = 0;

    const addEntities = (items: any[], source: string) => {
      items.forEach((p: any) => {
        if (p && p.id && !allPlayers.has(p.id)) {
          p._sourceType = source;
          p._sourcePriority = (source === 'storage' ? 0 : (source === 'unassigned' ? 1 : 2));
          p._personaId = Number(p.definitionId) % 16777216;
          if (source === 'storage') storageCount++;
          if (source === 'unassigned') unassignedCount++;
          allPlayers.set(p.id, p);
        }
      });
    };

    addEntities(storageItems, 'storage');
    const unRaw = repo.unassigned?._collection || repo.unassigned || [];
    addEntities(Array.isArray(unRaw) ? unRaw : Object.values(unRaw), 'unassigned');
    clubResults.forEach(list => addEntities(list, 'club'));

    this._clubPlayersMemory = Array.from(allPlayers.values());
    return { total: this._clubPlayersMemory.length, storage: storageCount, unassigned: unassignedCount };
  }

  public static async saveSquad(challenge: any, squad: any, controller: any): Promise<boolean> {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    challenge.squad = squad;
    return new Promise((resolve) => {
      win.services.SBC.saveChallenge(challenge).observe({ name: 'Save' }, (obs: any, res: any) => {
        squad.onDataUpdated.notify();
        if (squad.isValid) squad.isValid();
        if (controller._pushSquadToView) controller._pushSquadToView(squad);
        resolve(res.success);
      });
    });
  }

  public static calculateRating(items: (EAItem | null)[]): number {
    const active = items.filter(p => p !== null) as EAItem[];
    if (active.length < 11) return 0;
    const ratings = active.map(p => p.rating);
    const sum = ratings.reduce((a, b) => a + b, 0);
    const avg = sum / 11;
    let cf = 0; ratings.forEach(r => { if (r > avg) cf += (r - avg); });
    return Math.floor((sum + cf) / 11 + 0.0401);
  }

  public static normalizePos(id: any): number | null {
    if (!id && id !== 0) return null;
    const rawId = typeof id === 'object' ? id.id : id;
    const map: Record<number, number> = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
    return map[rawId] || rawId;
  }

  // --- SOLVER: EFFICIENT ---
  public static async solveEfficient(log: (m: string) => void, settings: SolverSettings) {
    const ctx = this.getSbcContext();
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
        for (let k in col) rules.push({ key: parseInt(k), value: this.getCleanValue(col[k]) });

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
    await this.primeInventory(Array.from(levelsToDiscover));

    const pool = this._clubPlayersMemory.filter(p => {
        if (settings.untradOnly && p.tradable !== false) return false;
        if (settings.excludedLeagues.includes(p.leagueId!)) return false;
        if (p.limitedUseType === 2 || !!p.evolutionInfo || p.rareflag > 1) return false;
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
      activeSlots.forEach((slot: any, i: number) => {
        if (selected[i] || count >= (bucket.count === 11 || bucket.count === -1 ? activeSlots.length : bucket.count)) return;
        let match = (raresInserted < minRaresNeeded) ? findMatch(bucket, 1) : findMatch(bucket, 0, bucket.level !== 'gold');
        if (!match) match = findMatch(bucket, 0, true);
        if (match) {
          selected[i] = match; usedIds.add(match.id); usedPersonaIds.add(match._personaId!);
          count++; if (match.rareflag) raresInserted++;
        }
      });
    });

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot: any, i: number) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    await this.saveSquad(challenge, squad, controller);
    log("✅ Solve Successful.");
  }

  // --- SOLVER: DE-CLOGGER ---
  public static async solveDeClogger(log: (m: string) => void, settings: SolverSettings) {
    const ctx = this.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Checking Anchor...");
    let isTotwRequired = false;
    (challenge.eligibilityRequirements || []).forEach((r: any) => {
        const rules = this.getCleanValue(r.kvPairs._collection || r.kvPairs);
        if (rules.some && rules.some((rl: any) => rl.key === 18 && rl.value.includes(3))) isTotwRequired = true;
    });

    await this.primeInventory(isTotwRequired ? ['special'] : ['gold']);

    const pool = this._clubPlayersMemory.filter(p => {
        if (settings.untradOnly && p.tradable !== false) return false;
        if (settings.excludedLeagues.includes(p.leagueId!)) return false;
        if (p.rating >= 89 || !!p.evolutionInfo || p.rareflag === 116) return false;
        return true;
    }).sort((a,b) => (a._sourcePriority! - b._sourcePriority!) || (a.rating - b.rating));

    const usedPersonaIds = new Set<number>();
    const usedIds = new Set<number>();
    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);
    const selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);

    let anchor = isTotwRequired ? pool.find(p => p.rarityId === 3 || p.rareflag === 3) : pool.find(p => p.rating >= 87 && p.rating <= 88 && p.rareflag === 1);
    if (anchor) {
        selected[0] = anchor; usedIds.add(anchor.id); usedPersonaIds.add(anchor._personaId!);
    } else {
        return log("❌ No valid Anchor found.");
    }

    const clogs = { 83: 0, 84: 0 };
    pool.forEach(p => { if (p._sourceType === 'storage' && (p.rating === 83 || p.rating === 84)) (clogs as any)[p.rating]++; });
    let pattern = (anchor.rating >= 88) ? [{ r: 83, c: 10 }] : (clogs[84] >= 6 ? [{ r: 84, c: 6 }, { r: 83, c: 4 }] : [{ r: 87, c: 1 }, { r: 83, c: 9 }]);

    pattern.forEach(pReq => {
        let count = 0;
        pool.filter(p => p.rating === pReq.r && p.rareflag <= 1).forEach(p => {
            const idx = selected.findIndex(s => s === null);
            if (count < pReq.c && idx !== -1 && !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!)) {
                selected[idx] = p; usedIds.add(p.id); usedPersonaIds.add(p._personaId!); count++;
            }
        });
    });

    activeSlots.forEach((slot: any, i: number) => {
        if (selected[i]) return;
        const filler = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rareflag <= 1);
        if (filler) { selected[i] = filler; usedIds.add(filler.id); usedPersonaIds.add(filler._personaId!); }
    });

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot: any, i: number) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    await this.saveSquad(challenge, squad, controller);
    log("✅ De-Clogger Complete.");
  }

  // --- SOLVER: LEAGUE ---
  public static async solveLeague(log: (m: string) => void, settings: SolverSettings) {
    const ctx = this.getSbcContext();
    if (!ctx) return log("❌ SBC Screen Not Found");
    const { challenge, squad, controller } = ctx;

    log("Analyzing Target Rating...");
    const rawReqs = challenge.eligibilityRequirements || [];
    let targetRating = 0;
    const detectedLeagues = new Set<number>();

    rawReqs.forEach((r: any) => {
        const rules: any[] = [];
        const col = r.kvPairs._collection || r.kvPairs;
        for (let k in col) {
            const val = this.getCleanValue(col[k]);
            const key = parseInt(k);
            if (key === 19) targetRating = Math.max(targetRating, val || 0);
            if (key === 11) (Array.isArray(val) ? val : [val]).forEach(l => detectedLeagues.add(l));
        }
    });

    log(`Goal: ${targetRating} Rating | Required Leagues: ${Array.from(detectedLeagues).join(',')}`);
    
    const discoveryLeagues = Array.from(detectedLeagues).slice(0, 3);
    await Promise.all(discoveryLeagues.map(l => this.fetchItems({ league: l, count: 150 })));
    await this.primeInventory();
    
    const globalLeagues = Array.from(detectedLeagues);
    const pool = this._clubPlayersMemory.filter(p => {
        if (settings.untradOnly && p.tradable !== false) return false;
        if (settings.excludedLeagues.includes(p.leagueId!)) return false;
        if (p.rating >= 83 || !!p.evolutionInfo) return false;
        if (globalLeagues.length > 0 && !globalLeagues.includes(p.leagueId!)) return false;
        return true;
    }).sort((a,b) => (a._sourcePriority! - b._sourcePriority!) || (a.rating - b.rating));

    const usedPersonaIds = new Set<number>();
    const usedIds = new Set<number>();
    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);
    const selected: (EAItem | null)[] = new Array(activeSlots.length).fill(null);

    const fillPass = (source: string | null, matchPos: boolean) => {
        activeSlots.forEach((slot: any, i: number) => {
            if (selected[i]) return;
            const slotPos = SbcBuilder.normalizePos(slot.position?.id || slot._position);
            const match = pool.find(p => {
                if (usedIds.has(p.id) || usedPersonaIds.has(p._personaId!)) return false;
                if (source && p._sourceType !== source) return false;
                if (matchPos && SbcBuilder.normalizePos(p.preferredPosition) !== slotPos) return false;
                return true;
            });
            if (match) { 
                selected[i] = match; usedIds.add(match.id); usedPersonaIds.add(match._personaId!); 
            }
        });
    };

    fillPass('storage', true); fillPass('storage', false); fillPass('club', true); fillPass('club', false);

    // --- RATING BRIDGE PASS ---
    if (targetRating > 0) {
        log(`Optimizing Rating to hit ${targetRating}...`);
        let bridgeAttempts = 0;
        while (bridgeAttempts < 50 && this.calculateRating(selected) < targetRating) {
            bridgeAttempts++;
            const minR = Math.min(...selected.filter(s => s).map(s => s!.rating));
            const upIdx = selected.findIndex(s => s && s.rating === minR);
            if (upIdx === -1) break;

            const currentItem = selected[upIdx]!;
            const upgrade = pool.find(p => !usedIds.has(p.id) && !usedPersonaIds.has(p._personaId!) && p.rating > currentItem.rating && p.leagueId === currentItem.leagueId);
            
            if (upgrade) {
                console.log(`[BRIDGE] Upgrading Slot ${upIdx}: ${currentItem.rating} -> ${upgrade.rating} (${upgrade._staticData?.name})`);
                usedIds.delete(currentItem.id); usedPersonaIds.delete(currentItem._personaId!);
                selected[upIdx] = upgrade;
                usedIds.add(upgrade.id); usedPersonaIds.add(upgrade._personaId!);
            } else break;
        }
    }

    const finalArray = new Array(23).fill(null);
    activeSlots.forEach((slot: any, i: number) => { if (selected[i]) finalArray[slot.index] = selected[i]; });
    squad.setPlayers(finalArray);
    await this.saveSquad(challenge, squad, controller);
    log(`✅ League Solve Complete. Rating: ${this.calculateRating(selected)}`);
  }
}
