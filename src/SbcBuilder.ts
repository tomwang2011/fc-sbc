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
  _staticData?: {
    name: string;
  };
  isPlayer?: () => boolean;
  isLoanItem?: () => boolean;
  isEvo?: () => boolean;
  _isSafeSource?: boolean;
}

export class SbcBuilder {
  private static _clubPlayersMemory: EAItem[] = [];

  /**
   * Targets the verified paths from discovery.
   */
  public static getSbcContext(): { challenge: any, squad: any, controller: any } | null {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    try {
      const root = win.getAppMain().getRootViewController();
      
      const findController = (node: any): any => {
        if (!node) return null;
        if (node._squad && node._challenge) return node;

        const children = [
          ...(node.childViewControllers || []),
          ...(node.presentedViewController ? [node.presentedViewController] : []),
          ...(node.currentController ? [node.currentController] : []),
          ...(node._viewControllers || [])
        ];
        for (const child of children) {
          const found = findController(child);
          if (found) return found;
        }
        return null;
      };

      const controller = findController(root);
      if (controller) {
        return { 
          challenge: controller._challenge, 
          squad: controller._squad, 
          controller 
        };
      }
    } catch (e) {}
    return null;
  }

  /**
   * Entity Sync logic from V44
   */
  public static async primeInventory(): Promise<{ total: number, storage: number, unassigned: number }> {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    const repo = win.repositories.Item;
    if (!repo) return { total: 0, storage: 0, unassigned: 0 };

    console.log("[FC-SBC] Priming Inventory (Club + Storage)...");
    
    const clubCriteria = new win.UTSearchCriteriaDTO();
    clubCriteria.type = 'player';
    clubCriteria.level = 'gold';
    clubCriteria.count = 250;

    const storageCriteria = new win.UTSearchCriteriaDTO();
    storageCriteria.type = 'player';

    const searches = [
      new Promise<void>(r => win.services.Club.search(clubCriteria).observe(this, () => r())),
      new Promise<void>(r => {
        if (win.services.Item.searchStorageItems) {
          win.services.Item.searchStorageItems(storageCriteria).observe(this, () => r());
        } else {
          r();
        }
      })
    ];

    await Promise.all(searches);

    const allPlayers = new Map<number, EAItem>();
    let storageCount = 0;
    let unassignedCount = 0;

    const addEntities = (source: any, isStorage: boolean = false, isUnassigned: boolean = false) => {
      if (!source) return;
      const raw = source._collection || source.items || source;
      const items = Array.isArray(raw) ? raw : (typeof raw === 'object' ? Object.values(raw) : []);

      items.forEach((p: any) => {
        if (p && p.id && (p.type === 'player' || (typeof p.isPlayer === 'function' && p.isPlayer()))) {
          p.itemType = isStorage ? 'sbcstorage' : (isUnassigned ? 'unassigned' : 'club');
          p._isSafeSource = isStorage || isUnassigned;
          if (isStorage) storageCount++;
          if (isUnassigned) unassignedCount++;
          
          // Priority: Storage > Unassigned > Club
          if (!allPlayers.has(p.id) || isStorage) {
            allPlayers.set(p.id, p);
          }
        }
      });
    };

    addEntities(repo.unassigned, false, true);
    addEntities(repo.getStorage()?.items, true, false);
    addEntities(repo.getClub()?.items, false, false);

    this._clubPlayersMemory = Array.from(allPlayers.values());
    console.log(`[FC-SBC] Sync Ready: ${this._clubPlayersMemory.length} players (${storageCount} from Storage).`);
    return { total: this._clubPlayersMemory.length, storage: storageCount, unassigned: unassignedCount };
  }

  public static calculateSquadRating(players: (EAItem | null)[]): number {
    const active = players.filter(p => p !== null) as EAItem[];
    if (active.length < 11) return 0;
    
    const ratings = active.map(p => p.rating);
    const sum = ratings.reduce((a, b) => a + b, 0);
    const avg = sum / 11;
    
    let cf = 0;
    ratings.forEach(r => { if (r > avg) cf += (r - avg); });
    
    return Math.floor((sum + cf) / 11 + 0.0401); 
  }

  private static normalizePos(id: any): number | null {
    if (!id && id !== 0) return null;
    const rawId = typeof id === 'object' ? id.id : id;
    const map: Record<number, number> = { 2: 3, 8: 7, 4: 5, 6: 5, 9: 10, 11: 10, 13: 14, 15: 14, 17: 18, 19: 18, 20: 21, 22: 21, 24: 25, 26: 25 };
    return map[rawId] || rawId;
  }

  /**
   * Targeted search using UTSearchCriteriaDTO
   */
  public static searchPlayers(criteria: any): Promise<EAItem[]> {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    return new Promise((resolve) => {
      const searchCriteria = new win.UTSearchCriteriaDTO();
      Object.assign(searchCriteria, { 
        type: 'player', 
        count: 150, 
        excludeLimitedUse: true, 
        ...criteria 
      });
      
      win.services.Club.search(searchCriteria).observe({ name: "SolverTargeted" }, (obs: any, res: any) => {
        const items = (res.response?.items || res.items || []).filter((p: any) => {
          const isLoan = (typeof p.isLoanItem === 'function' && p.isLoanItem()) || (p.loan && p.loan > 0) || p.limitedUseType === 2;
          const isEvo = (typeof p.isEvo === 'function' && p.isEvo()) || !!p.evolutionInfo || p.rareflag === 116 || p.upgrades !== null;
          return !isLoan && !isEvo;
        });
        resolve(items);
      });
    });
  }

  /**
   * Hybrid Solver Engine (Milestone 6)
   * Targets Storage players first, respects 85-rating storage limit, 
   * and uses BFS to hit target rating.
   */
  public static async solveSbc(options: { targetRating?: number, requireTotw?: boolean } = {}) {
    const context = this.getSbcContext();
    if (!context) return alert('SBC Squad screen not detected.');

    const { challenge, squad, controller } = context;
    const activeSlots = squad.getSBCSlots().filter((s: any) => !s.isBrick() && s.index <= 10);

    try {
      // 1. Context & Requirement Detection
      const requirements = (challenge.eligibilityRequirements || []).map((req: any) => {
        const col = req.kvPairs._collection || req.kvPairs;
        const rules = [];
        for (let key in col) {
          const val = col[key];
          const cleanValue = Array.isArray(val) ? val[0] : (val && val.value !== undefined ? val.value : val);
          rules.push({ key: parseInt(key), value: cleanValue });
        }
        return { rules, count: req.count, description: req.requirementLabel || "General" };
      });

      const ratingReq = requirements.find(r => r.rules.some(rule => rule.key === 19));
      const targetRating = options.targetRating || (ratingReq ? ratingReq.rules.find((rule: any) => rule.key === 19).value : 84);
      const needsTotw = options.requireTotw || requirements.some(r => r.rules.some(rule => rule.key === 18 && rule.value === 3));

      console.log(`[FC-SBC] Goal: ${targetRating} Rated Squad | TOTW: ${needsTotw}`);

      // 2. Prime Inventory if empty
      if (this._clubPlayersMemory.length === 0) {
        await this.primeInventory();
      }

      // 3. Pool Preparation with Constraints
      const filteredPool = this._clubPlayersMemory.filter(p => {
        // Basic exclusions (Loans, Evos)
        const isLoan = (typeof p.isLoanItem === 'function' && p.isLoanItem()) || (p.loan && p.loan > 0) || p.limitedUseType === 2;
        const isEvo = (typeof p.isEvo === 'function' && p.isEvo()) || !!p.evolutionInfo || p.rareflag === 116;
        if (isLoan || isEvo) return false;

        // Constraint: No SBC storage higher than 85 rated
        if (p.itemType === 'sbcstorage' && p.rating > 85) return false;

        return true;
      });

      // Sort pool: Storage > Unassigned > Club (for same rating)
      const prioritySort = (a: EAItem, b: EAItem) => {
        if (a.rating !== b.rating) return a.rating - b.rating;
        const weights: Record<string, number> = { 'sbcstorage': 0, 'unassigned': 1, 'club': 2 };
        return (weights[a.itemType || 'club'] ?? 2) - (weights[b.itemType || 'club'] ?? 2);
      };

      const sortedPool = [...filteredPool].sort(prioritySort);

      // 4. Requirement Satisfaction (Mandatory Pass)
      const selected: ({ item: EAItem, type: 'MANDATORY' | 'FILLER' } | null)[] = new Array(11).fill(null);
      const usedIds = new Set<number>();

      if (needsTotw) {
        // Find a TOTW (rarityId 3) - Prioritize Storage
        const totwCandidate = sortedPool.find(p => p.rarityId === 3);
        if (totwCandidate) {
          selected[0] = { item: totwCandidate, type: 'MANDATORY' };
          usedIds.add(totwCandidate.id);
          console.log(`[FC-SBC] Selected TOTW: ${totwCandidate._staticData?.name} (${totwCandidate.rating}) from ${totwCandidate.itemType}`);
        } else {
          console.warn("[FC-SBC] No TOTW found in pool!");
        }
      }

      // 5. Initial Filler Pass (Lowest rated available)
      activeSlots.forEach((slot, i) => {
        if (selected[i]) return;
        const match = sortedPool.find(p => !usedIds.has(p.id));
        if (match) {
          selected[i] = { item: match, type: 'FILLER' };
          usedIds.add(match.id);
        }
      });

      // 6. BFS Rating Optimization (Breadth-First Search)
      // Increment the entire squad horizontally to hit target OVR
      let attempts = 0;
      const MAX_ATTEMPTS = 200;
      
      while (this.calculateSquadRating(selected.map(s => s ? s.item : null)) < targetRating && attempts < MAX_ATTEMPTS) {
        attempts++;
        
        // Identify indices of 'FILLER' players (don't upgrade MANDATORY if they already hit requirements)
        const fillerIndices = selected
          .map((entry, idx) => (entry && entry.type === 'FILLER') ? idx : -1)
          .filter(i => i !== -1);
          
        if (fillerIndices.length === 0) break;

        // Pick the lowest rated filler to upgrade
        const minRating = Math.min(...fillerIndices.map(i => selected[i]!.item.rating));
        const upgradeIdx = fillerIndices.find(i => selected[i]!.item.rating === minRating);
        
        if (upgradeIdx === undefined) break;

        const currentItem = selected[upgradeIdx]!.item;
        // Find next best player in sorted pool
        const upgradeCandidate = sortedPool.find(p => !usedIds.has(p.id) && p.rating > currentItem.rating);

        if (upgradeCandidate) {
          usedIds.delete(currentItem.id);
          selected[upgradeIdx] = { item: upgradeCandidate, type: 'FILLER' };
          usedIds.add(upgradeCandidate.id);
        } else {
          // No more upgrades possible for this slot rating
          // If we can't upgrade the lowest, maybe we can upgrade the next lowest?
          // But BFS says we move horizontally. If we're stuck, we're stuck.
          break; 
        }
      }

      console.log(`[FC-SBC] Solver finished in ${attempts} steps. Final Rating: ${this.calculateSquadRating(selected.map(s => s ? s.item : null))}`);

      // 7. Apply to Squad
      const finalArray = new Array(23).fill(null);
      activeSlots.forEach((slot, i) => { 
        if (selected[i]) finalArray[slot.index] = selected[i]!.item; 
      });
      
      squad.setPlayers(finalArray);
      squad.onDataUpdated.notify();
      
      if (!challenge.squad) challenge.squad = squad;
      const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
      win.services.SBC.saveChallenge(challenge).observe(this, (obs: any, res: any) => {
        if (res.success) {
          console.log("[FC-SBC] Squad saved successfully.");
        } else {
          console.error("[FC-SBC] Failed to save squad.");
        }
      });

      if (controller._overviewController?._pushSquadToView) {
        controller._overviewController._pushSquadToView(squad);
      } else if (controller._pushSquadToView) {
        controller._pushSquadToView(squad);
      }

      alert(`Successfully populated squad! Final Rating: ${this.calculateSquadRating(selected.map(s => s ? s.item : null))}`);

    } catch (e: any) {
      alert('Solver failed: ' + e.message);
      console.error(e);
    }
  }

}
