import { EAItem } from '../types';

declare const unsafeWindow: any;

export class Inventory {
  private static _clubPlayersMemory: EAItem[] = [];

  public static get memory() {
    return this._clubPlayersMemory;
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
          const isEvo = !!p.evolutionInfo || p.rareflag === 116 || p.upgrades !== null;
          if (p.limitedUseType === 2 || isEvo) return;
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
}
