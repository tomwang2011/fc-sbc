(function diagnosticSbcInspector() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    
    const findSbcContext = (node) => {
        if (!node) return null;
        if (node._squad && node._challenge) return { challenge: node._challenge, squad: node._squad, controller: node };
        const children = [...(node.childViewControllers || []), ...(node.presentedViewController ? [node.presentedViewController] : []), ...(node.currentController ? [node.currentController] : []), ...(node._viewControllers || [])];
        for (const child of children) { const r = findSbcContext(child); if (r) return r; }
        return null;
    };

    const ctx = findSbcContext(win.getAppMain().getRootViewController());
    if (!ctx) return console.error("❌ Diagnostic: SBC screen not detected.");
    const { challenge } = ctx;

    const getCleanValue = (val) => {
        if (Array.isArray(val)) return val.map(v => (v?.value !== undefined ? v.value : v));
        return (val?.value !== undefined ? val.value : val);
    };

    console.log("%c--- 🔍 METICULOUS SBC DIAGNOSTIC ---", "font-size: 16px; font-weight: bold; color: #3b82f6;");
    console.log("Challenge Name:", challenge.name);
    console.log("Raw Requirements Count:", challenge.eligibilityRequirements?.length);

    const constraints = {
        maxSameClub: 11, maxSameNation: 11, maxSameLeague: 11,
        maxTotalNations: 11, maxTotalLeagues: 11,
        minGold: 0, minRare: 0, targetRating: 0, targetChem: 0
    };
    const hardReqs = [];

    challenge.eligibilityRequirements.forEach((r, idx) => {
        const col = r.kvPairs._collection || r.kvPairs;
        console.group(`Requirement [${idx}]: ${r.requirementLabel}`);
        console.log("Label:", r.requirementLabel);
        console.log("Count:", r.count);
        console.log("Scope:", r.scope);
        
        for (let k in col) {
            const key = parseInt(k);
            const val = getCleanValue(col[k]);
            const vals = Array.isArray(val) ? val : [val];
            console.log(` > Key: ${key}, Values:`, vals);

            // SIMULATE PARSER
            if (key === 19) {
                const tr = Math.max(constraints.targetRating, r.count || vals[0] || 0);
                console.log(`   [MATCH] Rating -> ${tr}`);
                constraints.targetRating = tr;
            }
            if (key === 35 || key === 20) {
                const tc = Math.max(constraints.targetChem, vals[0] || 0);
                console.log(`   [MATCH] Chem -> ${tc}`);
                constraints.targetChem = tc;
            }
            if (key === 17 && vals.includes(3)) {
                console.log(`   [MATCH] Gold -> ${r.count}`);
                constraints.minGold = r.count;
            }
            if (key === 25 && vals.includes(4)) {
                console.log(`   [MATCH] Rare -> ${r.count}`);
                constraints.minRare = r.count;
            }

            // Diversity Mapping
            if (key === 5 && r.scope === 1) {
                console.log(`   [MATCH] MaxSameNation -> ${vals[0]}`);
                constraints.maxSameNation = vals[0];
            }
            if (key === 6 && r.scope === 1) {
                console.log(`   [MATCH] MaxSameLeague -> ${vals[0]}`);
                constraints.maxSameLeague = vals[0];
            }
            if (key === 9 && vals[0] === -1) {
                console.log(`   [MATCH] MaxTotalNations -> ${r.count}`);
                constraints.maxTotalNations = r.count;
            }
            if (key === 10 && vals[0] === -1) {
                console.log(`   [MATCH] MaxTotalLeagues -> ${r.count}`);
                constraints.maxTotalLeagues = r.count;
            }

            // Entity Mapping
            if (key === 14) {
                console.log(`   [SEED] Club IDs:`, vals, "Count:", r.count);
                vals.forEach(id => hardReqs.push({ type: 'club', id, count: r.count || 1 }));
            }
            if (key === 15 && vals[0] > 0) {
                console.log(`   [SEED] Nation IDs:`, vals, "Count:", r.count);
                vals.forEach(id => hardReqs.push({ type: 'nation', id, count: r.count || 1 }));
            }
            if (key === 11 && vals[0] > 10) {
                console.log(`   [SEED] League IDs:`, vals, "Count:", r.count);
                vals.forEach(id => hardReqs.push({ type: 'league', id, count: r.count || 1 }));
            }
        }
        console.groupEnd();
    });

    console.log("%c--- FINAL INTERPRETATION ---", "font-size: 14px; font-weight: bold; color: #10b981;");
    console.log("Calculated Constraints:", constraints);
    console.log("Calculated Hard Seeds:", hardReqs);
})();
