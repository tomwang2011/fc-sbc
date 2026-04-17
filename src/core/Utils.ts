import { EAItem } from '../types';

declare const unsafeWindow: any;

export class Utils {
  public static getSbcContext(): { challenge: any, squad: any, controller: any } | null {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    try {
      const root = win.getAppMain().getRootViewController();
      const find = (n: any): any => {
          if (!n) return null;
          if (n._squad && n._challenge) return n;
          const kids = [...(n.childViewControllers || []), ...(n.presentedViewController ? [n.presentedViewController] : []), ...(n.currentController ? [n.currentController] : []), ...(n._viewControllers || [])];
          for (const k of kids) { const r = find(k); if (r) return r; }
          return null;
      };
      const controller = find(root);
      return controller ? { challenge: controller._challenge, squad: controller._squad, controller } : null;
    } catch (e) { return null; }
  }

  public static getCleanValue(val: any): any {
    if (Array.isArray(val)) return val.map(v => (v?.value !== undefined ? v.value : v));
    return (val?.value !== undefined ? val.value : val);
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

  public static async saveSquad(challenge: any, squad: any, controller: any): Promise<boolean> {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window) as any;
    challenge.squad = squad;
    return new Promise((resolve) => {
      win.services.SBC.saveChallenge(challenge).observe({ name: 'Save' }, (obs: any, res: any) => {
        squad.onDataUpdated.notify();
        if (squad.isValid) squad.isValid();
        if (controller._pushSquadToView) controller._pushSquadToView(squad);
        else if (controller._overviewController?._pushSquadToView) controller._overviewController._pushSquadToView(squad);
        resolve(res.success);
      });
    });
  }
}
