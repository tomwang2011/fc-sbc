import { useState } from 'preact/hooks';
import { SbcBuilder } from './SbcBuilder';

export function App() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [status, setStatus] = useState('Ready for action.');
  const [stats, setStats] = useState({ total: 0, sbcStorage: 0, unassigned: 0 });
  const [untradOnly, setUntradOnly] = useState(true);

  const handleScan = async () => {
    setIsScanning(true);
    setStatus('Syncing Inventory...');
    try {
      await new Promise(r => setTimeout(r, 100));
      const res = await SbcBuilder.primeInventory();
      setStats({
        total: res.total,
        sbcStorage: res.storage,
        unassigned: res.unassigned
      });
      setStatus('Inventory Sync Complete.');
    } catch (e: any) {
      console.error('[FC-SBC] Scan error:', e.message);
      setStatus('❌ Sync Failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const runSolver = async (type: 'league' | 'declog' | 'efficient') => {
    setIsSolving(true);
    setStatus(`Running ${type.toUpperCase()} Solver...`);
    try {
      const solverMap = {
        league: SbcBuilder.solveLeague.bind(SbcBuilder),
        declog: SbcBuilder.solveDeClogger.bind(SbcBuilder),
        efficient: SbcBuilder.solveEfficient.bind(SbcBuilder)
      };
      
      await solverMap[type](
        (msg: string) => setStatus(msg),
        { untradOnly }
      );
      
      // Refresh stats after solve
      const res = await SbcBuilder.primeInventory();
      setStats({ total: res.total, sbcStorage: res.storage, unassigned: res.unassigned });
    } catch (e: any) {
      console.error('[FC-SBC] Solve error:', e);
      setStatus(`❌ Error: ${e.message}`);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-[9999999] pointer-events-auto font-sans">
      <button
        onClick={() => {
          setShowBuilder(!showBuilder);
          if (!showBuilder && stats.total === 0) handleScan();
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-xl transition-all hover:scale-105 flex items-center gap-2 border border-white/20"
      >
        <span className="text-xl">⚡</span>
        <span>{showBuilder ? 'CLOSE' : 'SBC SOLVER'}</span>
      </button>

      {showBuilder && (
        <div className="absolute top-14 left-0 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">SBC Master Tool</h2>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className={`text-xs ${isScanning ? 'animate-spin opacity-50' : ''} bg-zinc-800 p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400`}
            >
              🔄
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-zinc-800/50 rounded-lg text-center border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase">Club</div>
                <div className="font-bold text-white">{stats.total}</div>
              </div>
              <div className="p-2 bg-blue-900/10 rounded-lg text-center border border-blue-900/30">
                <div className="text-[10px] text-blue-500 uppercase">Storage</div>
                <div className="font-bold text-blue-400">{stats.sbcStorage}</div>
              </div>
              <div className="p-2 bg-orange-900/10 rounded-lg text-center border border-orange-900/30">
                <div className="text-[10px] text-orange-500 uppercase">Unassgn</div>
                <div className="font-bold text-orange-400">{stats.unassigned}</div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-zinc-800/30 p-2 rounded-lg border border-zinc-800/50">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={untradOnly} 
                            onChange={(e) => setUntradOnly(e.currentTarget.checked)}
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${untradOnly ? 'bg-indigo-600' : 'bg-zinc-700'}`}></div>
                        <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${untradOnly ? 'translate-x-5' : ''}`}></div>
                    </div>
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">Untradeable Only</span>
                </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <button
                disabled={isSolving}
                onClick={() => runSolver('league')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                ⚽ LEAGUE SOLVER
              </button>
              
              <button
                disabled={isSolving}
                onClick={() => runSolver('declog')}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                📦 DE-CLOGGER (83x14)
              </button>

              <button
                disabled={isSolving}
                onClick={() => runSolver('efficient')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                💎 RARE/COMMON EFFICIENT
              </button>
            </div>
            
            {/* Status Indicator */}
            <div className="mt-2 bg-black/40 rounded p-2.5 min-h-[40px] flex items-center justify-center border border-zinc-800/50">
                <p className="text-[10px] text-zinc-400 text-center leading-tight">
                    {status}
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
