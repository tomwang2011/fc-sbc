(function sbcInspectorV13() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    const findSbcContext = (node) => {
        if (!node) return null;
        if (node._squad && node._challenge) return { challenge: node._challenge, squad: node._squad, controller: node };
        const children = [...(node.childViewControllers || []), ...(node.presentedViewController ? [node.presentedViewController] : []), ...(node.currentController ? [node.currentController] : []), ...(node._viewControllers || [])];
        for (const child of children) { const r = findSbcContext(child); if (r) return r; }
        return null;
    };

    const ctx = findSbcContext(win.getAppMain().getRootViewController());
    if (!ctx) return console.error("❌ SBC screen not detected.");
    
    const { challenge } = ctx;
    const getVal = (v) => (v?.value !== undefined ? v.value : v);
    const getCleanValue = (val) => (Array.isArray(val) ? val.map(getVal) : getVal(val));

    const sbcData = {
        name: challenge.name,
        summary: {
            minRating: 0,
            minChem: 0,
            minRare: 0,
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
            specificConstraints: []
        }
    };

    console.log("%c--- 🔍 VERBOSE SBC DIAGNOSTIC (v13) ---", "font-size: 14px; font-weight: bold; color: #3b82f6;");

    challenge.eligibilityRequirements.forEach((r, idx) => {
        const col = r.kvPairs?._collection || r.kvPairs || {};
        const diag = { idx, label: r.requirementLabel || "NO_LABEL", scope: r.scope, count: r.count, kv: {} };
        
        for (let k in col) {
            const key = parseInt(k);
            const vals = [].concat(getCleanValue(col[k]));
            diag.kv[key] = vals;

            // SPECIAL LOGIC FOR QUALITY AND RARITY
            if (key === 3 || key === 17) {
                const qualityLevel = vals[0];
                const numPlayers = (r.count === -1) ? 11 : r.count;
                if (qualityLevel === 3) sbcData.summary.minGold = numPlayers;
                if (qualityLevel === 2) sbcData.summary.minSilver = numPlayers;
                if (qualityLevel === 1) sbcData.summary.minBronze = numPlayers;
            } else if (key === 25 || key === 18) {
                sbcData.summary.minRare = (r.count === -1) ? 11 : r.count;
            } else {
                // STANDARD LOGIC FOR EVERYTHING ELSE
                const actualValue = (r.count === -1) ? vals[0] : r.count;
                if (key === 19) sbcData.summary.minRating = actualValue;
                if (key === 35 || key === 20) sbcData.summary.minChem = actualValue;

                if (r.scope === 1) {
                    if (key === 4) sbcData.summary.maxSameNation = actualValue;
                    if (key === 5) sbcData.summary.maxSameLeague = actualValue;
                    if (key === 6) sbcData.summary.maxSameClub = actualValue;
                } else {
                    if (key === 4) sbcData.summary.minSameNation = actualValue;
                    if (key === 5) sbcData.summary.minSameLeague = actualValue;
                    if (key === 6) sbcData.summary.minSameClub = actualValue;
                    if (key === 7) sbcData.summary.minTotalNations = actualValue;
                    if (key === 8) sbcData.summary.minTotalLeagues = actualValue;
                    if (key === 9) sbcData.summary.minTotalClubs = actualValue;
                    if (key === 10 || key === 11 || key === 12) {
                        sbcData.summary.specificConstraints.push({
                            type: key === 10 ? 'nation' : (key === 11 ? 'league' : 'club'),
                            ids: vals,
                            count: actualValue,
                            label: r.requirementLabel || ""
                        });
                    }
                }
            }
        }
        console.log(`REQ_${idx}: ${JSON.stringify(diag)}`);
    });

    console.log("%c--- 📦 UPDATED SBC SUMMARY (v13) ---", "font-size: 14px; font-weight: bold; color: #10b981;");
    console.log(JSON.stringify(sbcData.summary, null, 2));
    return sbcData;
})();
