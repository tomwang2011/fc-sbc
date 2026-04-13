import { EAItem } from './SbcBuilder';

export interface EAItem {
  id: number;
  rating: number;
  type: string;
  concept: boolean;
  rareflag: number;
  _staticData?: {
    name: string;
  };
  isPlayer?: () => boolean;
}

export class SbcBuilder {
  /**
   * Targets the verified paths from discovery.
   */
  public static getSbcContext(): { challenge: any, squad: any, controller: any } | null {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    try {
      const root = win.getAppMain().getRootViewController();
      
      const findController = (node: any, targetName: string): any => {
        if (!node) return null;
        if (node.className === targetName) return node;
        const children = [
          ...(node.childViewControllers || []),
          ...(node.presentedViewController ? [node.presentedViewController] : []),
          ...(node.currentController ? [node.currentController] : [])
        ];
        for (const child of children) {
          const found = findController(child, targetName);
          if (found) return found;
        }
        return null;
      };

      const controller = findController(root, 'UTSBCSquadSplitViewController');
      if (controller) {
        const overview = controller._overviewController;
        const challenge = overview?._challenge || overview?.challenge;
        const squad = controller._squad;
        if (challenge && squad) return { challenge, squad, controller };
      }
    } catch (e) {}
    return null;
  }

  /**
   * Uses the "Pure Item" method to update the squad.
   */
  public static async solveSbc() {
    const context = this.getSbcContext();
    if (!context) return alert('SBC Grid not detected.');

    const { challenge, squad, controller } = context;
    const overview = controller._overviewController;

    try {
      let allPlayers = this.getAllAvailablePlayers();
      
      // Filter for low rated players first as a safety/default
      const available = allPlayers.filter(p => p.rating < 83).sort((a,b) => a.rating - b.rating);
      
      if (available.length === 0) {
        return alert('No players under 83 OVR found in club.');
      }

      console.log(`[FC-SBC] Solving with ${available.length} available players.`);

      // 1. Create the "Pure Item" array (23 slots)
      const newPlayers = new Array(23).fill(null);
      
      // 2. Keep existing players from current squad
      squad._players.forEach((p: any, i: number) => {
        if (p) {
          const item = p.getItem ? p.getItem() : (p.item || null);
          if (item && item.rating > 0) {
              newPlayers[i] = item;
          }
        }
      });

      // 3. Fill empty SBC slots with available players
      const slots = squad.getSBCSlots();
      let addedCount = 0;

      for (const slot of slots) {
        const idx = slot.index;
        if (newPlayers[idx]) continue; // Slot already filled

        if (available.length > addedCount) {
          const player = available[addedCount++];
          newPlayers[idx] = player;
          console.log(`[FC-SBC] Adding ${player.rating} ${player._staticData?.name} to slot ${idx}`);
        }
      }

      // 4. Bulk Update via setPlayers
      squad.setPlayers(newPlayers);

      // 5. Notify and Persist
      if (squad.onDataUpdated?.notify) squad.onDataUpdated.notify();
      
      const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
      if (win.services.SBC && challenge) {
        win.services.SBC.saveChallenge(challenge).observe(this, function(obs: any, res: any) {
          console.log(`[FC-SBC] Server Save: ${res.success ? 'SUCCESS' : 'FAILED'}`);
        });
      }

      // 6. Force Visual Refresh
      if (overview?._pushSquadToView) {
        overview._pushSquadToView(squad);
      }

      alert(`Successfully added ${addedCount} players!`);
    } catch (e: any) {
      alert('Solver failed: ' + e.message);
      console.error(e);
    }
  }

  /**
   * Verified Inventory source
   */
  public static getAllAvailablePlayers(): EAItem[] {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    const repo = win.repositories?.Item;
    if (!repo) return [];

    try {
      const club = repo.getClub();
      const coll = club.items?._collection || {};
      const allItems = Array.isArray(coll) ? coll : Object.values(coll);

      return allItems.filter(item => {
        if (!item || item.concept) return false;
        const isPlayer = (typeof item.isPlayer === 'function' && item.isPlayer()) || item.type === 'player';
        const isNotCosmetic = !['stadium', 'staff', 'badge', 'kit'].includes(item.type);
        return isPlayer && isNotCosmetic && item.rating > 0;
      });
    } catch (e) { return []; }
  }
}
