import { useState } from 'preact/hooks';
import { SbcBuilder } from './SbcBuilder';

export function App() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [stats, setStats] = useState({ total: 0, sbcStorage: 0, unassigned: 0 });

  const handleScan = async () => {
    setIsScanning(true);
    try {
      // Use a small timeout to allow UI update before heavy scan
      await new Promise(r => setTimeout(r, 100));
      const players = SbcBuilder.getAllAvailablePlayers();
      
      const sbcStorageCount = players.filter(p => (p as any).isStorage || (p as any)._isStorage || (p as any).itemType === 'sbcstorage').length;
      const unassignedCount = players.filter(p => p.unassigned).length;

      setStats({
        total: players.length,
        sbcStorage: sbcStorageCount,
        unassigned: unassignedCount
      });
    } catch (e: any) {
      console.error('[FC-SBC] Scan error:', e.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-[9999999] pointer-events-auto font-sans text-zinc-900">
      <button
        onClick={() => {
          setShowBuilder(!showBuilder);
          if (!showBuilder && stats.total === 0) handleScan();
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-xl transition-all hover:scale-105 flex items-center gap-2 border border-white/20"
      >
        <span className="text-xl">🚀</span>
        <span>{showBuilder ? 'CLOSE' : 'SBC BUILDER'}</span>
      </button>

      {showBuilder && (
        <div className="absolute top-14 left-0 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">SBC Optimizer</h2>
            <button 
              onClick={handleScan}
              className={`text-xs ${isScanning ? 'animate-spin' : ''} bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700`}
            >
              🔄
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-center">
                <div className="text-[10px] text-zinc-400 uppercase">Club</div>
                <div className="font-bold text-zinc-900 dark:text-white">{stats.total}</div>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center border border-blue-100 dark:border-blue-900/30">
                <div className="text-[10px] text-blue-500 uppercase">Storage</div>
                <div className="font-bold text-blue-600 dark:text-blue-400">{stats.sbcStorage}</div>
              </div>
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center border border-orange-100 dark:border-orange-900/30">
                <div className="text-[10px] text-orange-500 uppercase">Unassgn</div>
                <div className="font-bold text-orange-600 dark:text-orange-400">{stats.unassigned}</div>
              </div>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-zinc-500">Target Rating:</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 rounded">84.x</span>
              </div>
              
              <button
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mb-2"
                onClick={() => SbcBuilder.solveSbc()}
              >
                🚀 GENERATE SQUAD
              </button>
            </div>
            
            <p className="text-[10px] text-zinc-400 text-center italic">
              Prioritizing SBC Storage and Duplicates...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
