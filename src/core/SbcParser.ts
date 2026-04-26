import { SbcSummary, SbcConstraint } from '../types';
import { Utils } from './Utils';

export class SbcParser {
    public static parseCurrentSbc(): SbcSummary | null {
        const ctx = Utils.getSbcContext();
        if (!ctx) return null;

        const { challenge } = ctx;
        const summary: SbcSummary = {
            minRating: 0,
            minChem: 0,
            minRare: 0,
            isTotw: false,
            isTots: false,
            minGold: 0,
            minSilver: 0,
            minBronze: 0,
            maxSameNation: 11,
            maxSameLeague: 11,
            maxSameClub: 11,
            minSameNation: 1,
            minSameLeague: 1,
            minSameClub: 1,
            minTotalNations: 1,
            minTotalLeagues: 1,
            minTotalClubs: 1,
            maxTotalNations: 11,
            maxTotalLeagues: 11,
            maxTotalClubs: 11,
            specificConstraints: []
        };

        const requirements = challenge.eligibilityRequirements || [];

        requirements.forEach((r: any) => {
            const col = r.kvPairs?._collection || r.kvPairs || {};
            for (let k in col) {
                const key = parseInt(k);
                const vals: any[] = [].concat(Utils.getCleanValue(col[k]));

                // Quality & Rarity (Keys 3, 17: Quality, 18, 25: Rarity)
                if (key === 3 || key === 17) {
                    const qualityLevel = vals[0];
                    const numPlayers = (r.count === -1) ? 11 : r.count;
                    if (qualityLevel === 3) summary.minGold = Math.max(summary.minGold, numPlayers);
                    if (qualityLevel === 2) summary.minSilver = Math.max(summary.minSilver, numPlayers);
                    if (qualityLevel === 1) summary.minBronze = Math.max(summary.minBronze, numPlayers);
                } else if (key === 25 || key === 18) {
                    summary.minRare = Math.max(summary.minRare, (r.count === -1) ? 11 : r.count);
                    if (key === 18 && vals.includes(3)) summary.isTotw = true;
                    if (key === 25 && vals.includes(44)) summary.isTots = true;
                } else {
                    const actualValue = (r.count === -1) ? vals[0] : r.count;

                    // Core Stats
                    if (key === 19) summary.minRating = Math.max(summary.minRating, actualValue, r.count);
                    if (key === 35 || key === 20) summary.minChem = Math.max(summary.minChem, actualValue, r.count);

                    // Scope 1: Max Same
                    if (r.scope === 1) {
                        if (key === 4) summary.maxSameNation = actualValue;
                        if (key === 5) summary.maxSameLeague = actualValue;
                        if (key === 6) summary.maxSameClub = actualValue;
                        
                        // Max Total Diversity
                        if (key === 7) summary.maxTotalNations = actualValue;
                        if (key === 8) summary.maxTotalLeagues = actualValue;
                        if (key === 9) summary.maxTotalClubs = actualValue;
                    } 
                    // Scope 0: Min Same / Min Total / Specific
                    else if (r.scope === 0) {
                        // Min Same
                        if (key === 4) summary.minSameNation = Math.max(summary.minSameNation, actualValue);
                        if (key === 5) summary.minSameLeague = Math.max(summary.minSameLeague, actualValue);
                        if (key === 6) summary.minSameClub = Math.max(summary.minSameClub, actualValue);

                        // Min Total (Diversity)
                        if (key === 7) summary.minTotalNations = Math.max(summary.minTotalNations, actualValue);
                        if (key === 8) summary.minTotalLeagues = Math.max(summary.minTotalLeagues, actualValue);
                        if (key === 9) summary.minTotalClubs = Math.max(summary.minTotalClubs, actualValue);

                        // Specific Entities
                        if (key === 10 || key === 11 || key === 12) {
                            summary.specificConstraints.push({
                                type: key === 10 ? 'nation' : (key === 11 ? 'league' : 'club'),
                                ids: vals,
                                count: actualValue,
                                label: r.requirementLabel || ""
                            });
                        }
                    }
                }
            }
        });

        return summary;
    }
}
