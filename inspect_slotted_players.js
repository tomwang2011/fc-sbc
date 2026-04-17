/**
 * INSPECT SLOTTED PLAYERS
 * 1. Manually place an untradeable TOTW (like Saibari) into the SBC squad.
 * 2. Copy this entire script and paste it into your browser console.
 * 3. It will print the exact internal properties of the card so we can see how EA marks it "untradeable" and "TOTW".
 * 4. Please share the console output!
 */
(function inspectSlottedPlayers() {
    const win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
    
    const getCtx = () => {
        const root = win.getAppMain().getRootViewController();
        const find = (n) => {
            if (!n) return null;
            if (n._squad && n._challenge) return { squad: n._squad };
            const children = [...(n.childViewControllers || []), ...(n.presentedViewController ? [n.presentedViewController] : []), ...(n.currentController ? [n.currentController] : []), ...(n._viewControllers || [])];
            for (const c of children) { const r = find(c); if (r) return r; }
            return null;
        };
        return find(root);
    };

    const ctx = getCtx();
    if (!ctx) return console.error("❌ SBC screen not detected.");
    
    const activePlayers = ctx.squad.getPlayers().filter(p => p.item);
    
    if (activePlayers.length === 0) {
        return console.log("❌ No players found in squad. Please place the TOTW first.");
    }

    console.log("%c[INSPECTOR] Found " + activePlayers.length + " slotted player(s).", "color: #10b981; font-weight: bold; font-size: 14px;");
    
    activePlayers.forEach((slot, i) => {
        const p = slot.item;
        console.log(`%c--- SLOT ${slot.index}: ${p._staticData?.name} (${p.rating}) ---`, "color: #3b82f6; font-weight: bold;");
        console.log("- untradeable:", p.untradeable);
        console.log("- isUntradeable (function?):", typeof p.isUntradeable === 'function' ? p.isUntradeable() : p.isUntradeable);
        console.log("- rarityId:", p.rarityId);
        console.log("- rareflag:", p.rareflag);
        console.log("- full item dump:", p);
        
        // Save to window for easy inspection in the console if needed
        window.lastInspectedPlayer = p;
        console.log("%cSaved to window.lastInspectedPlayer", "color: #6366f1;");
    });
})();