import { useState, useEffect } from 'preact/hooks';
import { SbcBuilder } from './SbcBuilder';

export function App() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [status, setStatus] = useState('Ready for action.');
  const [stats, setStats] = useState({ total: 0, sbcStorage: 0, unassigned: 0 });
  const [untradOnly, setUntradOnly] = useState(true);
  const [excludedLeagues, setExcludedLeagues] = useState<number[]>([]);

  const leagues = [
    { id: 13, name: 'PL' },
    { id: 53, name: 'ESP1' },
    { id: 19, name: 'GER1' },
    { id: 31, name: 'ITA1' },
    { id: 16, name: 'FRA1' },
    { id: 10, name: 'NED1' },
    { id: 308, name: 'POR1' },
    { id: 4, name: 'BEL1' }
  ];

  const toggleLeague = (id: number) => {
    setExcludedLeagues(prev => 
        prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const handleScan = async () => {
    setIsScanning(true);
    setStatus('Syncing Inventory...');
    try {
      await new Promise(r => setTimeout(r, 100));
      const res = await SbcBuilder.primeInventory();
      setStats({ total: res.total, sbcStorage: res.storage, unassigned: res.unassigned });
      setStatus('Inventory Sync Complete.');
    } catch (e: any) {
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
        { untradOnly, excludedLeagues }
      );
      const res = await SbcBuilder.primeInventory();
      setStats({ total: res.total, sbcStorage: res.storage, unassigned: res.unassigned });
    } catch (e: any) {
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
        style={{ background: '#4f46e5', opacity: '1 !important' }}
        className="text-white font-bold py-2 px-4 rounded-lg shadow-xl transition-all hover:scale-105 flex items-center gap-2 border border-white/20"
      >
        <span className="text-xl">⚡</span>
        <span>{showBuilder ? 'CLOSE' : 'SBC SOLVER'}</span>
      </button>

      {showBuilder && (
        <div 
            style={{ backgroundColor: '#09090b', opacity: '1 !important', border: '1px solid #3f3f46' }}
            className="absolute top-14 left-0 w-80 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-4 overflow-hidden animate-in fade-in slide-in-from-top-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-white tracking-tight uppercase">SBC Master Tool</h2>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              style={{ background: '#27272a' }}
              className={`text-xs ${isScanning ? 'animate-spin opacity-50' : ''} p-1.5 rounded-md hover:bg-zinc-700 text-zinc-300 border border-zinc-600`}
            >
              🔄
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div style={{ background: '#18181b' }} className="p-2 rounded-lg text-center border border-zinc-800">
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Club</div>
                <div className="font-bold text-white text-lg">{stats.total}</div>
              </div>
              <div style={{ background: '#172554' }} className="p-2 rounded-lg text-center border border-blue-900">
                <div className="text-[10px] text-blue-400 font-bold uppercase">Storage</div>
                <div className="font-bold text-blue-300 text-lg">{stats.sbcStorage}</div>
              </div>
              <div style={{ background: '#431407' }} className="p-2 rounded-lg text-center border border-orange-950">
                <div className="text-[10px] text-orange-400 font-bold uppercase">Unassgn</div>
                <div className="font-bold text-orange-300 text-lg">{stats.unassigned}</div>
              </div>
            </div>

            {/* League Exclusion Panel */}
            <div style={{ background: '#18181b' }} className="p-3 rounded-lg border border-zinc-800">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-2 tracking-widest">Ignore Leagues</h3>
                <div className="grid grid-cols-4 gap-1.5">
                    {leagues.map(l => (
                        <button
                            onClick={() => toggleLeague(l.id)}
                            style={{ background: excludedLeagues.includes(l.id) ? '#dc2626' : '#27272a' }}
                            className={`text-[9px] font-black py-1.5 rounded transition-colors ${excludedLeagues.includes(l.id) ? 'text-white border-red-800' : 'text-zinc-400 border-zinc-700'} border`}
                        >
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings */}
            <div style={{ background: '#18181b' }} className="p-3 rounded-lg border border-zinc-800">
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
                    <span className="text-[10px] font-black text-zinc-300 group-hover:text-white transition-colors uppercase tracking-widest">Untradeable Only</span>
                </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <button
                disabled={isSolving}
                onClick={() => runSolver('league')}
                style={{ background: '#4f46e5', borderBottom: '4px solid #3730a3' }}
                className="w-full hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-lg text-xs font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2"
              >
                ⚽ LEAGUE SOLVER
              </button>
              
              <button
                disabled={isSolving}
                onClick={() => runSolver('declog')}
                style={{ background: '#d97706', borderBottom: '4px solid #92400e' }}
                className="w-full hover:bg-amber-500 disabled:opacity-50 text-white py-3 rounded-lg text-xs font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2"
              >
                📦 DE-CLOGGER (83x14)
              </button>

              <button
                disabled={isSolving}
                onClick={() => runSolver('efficient')}
                style={{ background: '#059669', borderBottom: '4px solid #065f46' }}
                className="w-full hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-lg text-xs font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2"
              >
                💎 RARE/COMMON EFFICIENT
              </button>
            </div>
            
            {/* Status Indicator */}
            <div style={{ background: '#000000' }} className="mt-2 rounded-lg p-3 min-h-[50px] flex items-center justify-center border border-zinc-800 shadow-inner">
                <p className="text-[11px] text-zinc-400 font-bold text-center leading-tight uppercase tracking-tight">
                    {status}
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
