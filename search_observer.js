/**
 * SEARCH OBSERVER
 * 1. Copy this entire script.
 * 2. Paste it into your browser console on the EA FC Web App.
 * 3. Perform a manual search in the Club (e.g., TOTW, Gold Rare, Untradeable).
 * 4. The script will print "CRITERIA JSON" - copy that back here!
 */
(function searchObserver() {
    const oldSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        if (this._url && (this._url.includes('/club') || this._url.includes('/transfermarket'))) {
            console.log("%c[OBSERVER] Intercepted Search Request!", "color: #10b981; font-weight: bold; font-size: 16px;");
            console.log("URL:", this._url);
            try {
                const json = JSON.parse(body);
                console.log("%cCRITERIA JSON BELOW:", "color: #3b82f6; font-weight: bold;");
                console.log(JSON.stringify(json, null, 2));
                
                // Add to window for easy access if copy-paste is still hard
                window.lastSbcSearchCriteria = json;
                console.log("%cSaved to window.lastSbcSearchCriteria", "color: #6366f1;");
            } catch (e) {
                console.log("RAW BODY:", body);
            }
        }
        return oldSend.apply(this, arguments);
    };
    
    const oldOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return oldOpen.apply(this, arguments);
    };
    
    console.log("%c[OBSERVER] Active. Now go to your Club, set your filters, and hit Search.", "color: #10b981; font-weight: bold;");
})();