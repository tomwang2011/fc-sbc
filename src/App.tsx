import { useState } from 'preact/hooks';
import { SbcBuilder } from './SbcBuilder';

export function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [status, setStatus] = useState('Ready.');
  const [stats, setStats] = useState({ total: 0, sbcStorage: 0, unassigned: 0 });
  const [untradOnly, setUntradOnly] = useState(true);
  const [excludedLeagues, setExcludedLeagues] = useState<number[]>([]);

  const leagues = [
    { id: 13, name: 'PL' }, { id: 53, name: 'ESP1' }, { id: 19, name: 'GER1' }, { id: 31, name: 'ITA1' },
    { id: 16, name: 'FRA1' }, { id: 10, name: 'NED1' }, { id: 308, name: 'POR1' }, { id: 4, name: 'BEL1' }
  ];

  const toggleLeague = (id: number) => {
    setExcludedLeagues(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };

  const handleScan = async () => {
    setIsScanning(true);
    setStatus('Syncing...');
    try {
      await new Promise(r => setTimeout(r, 100));
      const res = await SbcBuilder.primeInventory();
      setStats({ total: res.total, sbcStorage: res.storage, unassigned: res.unassigned });
      setStatus('Sync Complete.');
    } catch (e: any) {
      setStatus('❌ Sync Failed.');
    } finally {
      setIsScanning(false);
    }
  };

  const runSolver = async (type: 'league' | 'declog' | 'efficient') => {
    setIsSolving(true);
    setStatus(`Solving ${type}...`);
    try {
      const solverMap = {
        league: SbcBuilder.solveLeague.bind(SbcBuilder),
        declog: SbcBuilder.solveDeClogger.bind(SbcBuilder),
        efficient: SbcBuilder.solveEfficient.bind(SbcBuilder)
      };
      await solverMap[type]((msg: string) => setStatus(msg), { untradOnly, excludedLeagues });
      const res = await SbcBuilder.primeInventory();
      setStats({ total: res.total, sbcStorage: res.storage, unassigned: res.unassigned });
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message}`);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="fixed top-2 right-2 z-[9999999] pointer-events-auto font-sans select-none">
      {/* Floating Toggle Bubble */}
      <button
        onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && stats.total === 0) handleScan();
        }}
        style={{ 
            background: isOpen ? '#ef4444' : '#4f46e5', 
            width: '48px', height: '48px', 
            boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
            opacity: '1 !important'
        }}
        className="rounded-full text-white font-bold flex items-center justify-center transition-all hover:scale-110 border-2 border-white/20"
      >
        <span className="text-2xl">{isOpen ? '✕' : '⚡'}</span>
      </button>

      {/* Main Panel */}
      {isOpen && (
        <div 
            style={{ 
                backgroundColor: '#09090b', 
                opacity: '1 !important', 
                border: '1px solid #27272a',
                width: 'calc(100vw - 16px)',
                maxWidth: '320px'
            }}
            className="absolute top-14 right-0 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-5 animate-in zoom-in-95 fade-in duration-200"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-black text-white tracking-widest uppercase">SBC Solver V1.5</h2>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              style={{ background: '#18181b' }}
              className={`p-2 rounded-lg ${isScanning ? 'animate-spin opacity-50' : ''} border border-zinc-800 text-zinc-400`}
            >
              🔄
            </button>
          </div>
          
          <div className="space-y-5">
            {/* Stats Grid - Large Touch Targets */}
            <div className="grid grid-cols-3 gap-3">
              <div style={{ background: '#18181b' }} className="p-3 rounded-xl text-center border border-zinc-800 shadow-sm">
                <div className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Club</div>
                <div className="font-black text-white text-base">{stats.total}</div>
              </div>
              <div style={{ background: '#172554' }} className="p-3 rounded-xl text-center border border-blue-900 shadow-sm">
                <div className="text-[9px] text-blue-400 font-bold uppercase mb-1">Storage</div>
                <div className="font-black text-blue-300 text-base">{stats.sbcStorage}</div>
              </div>
              <div style={{ background: '#431407' }} className="p-3 rounded-xl text-center border border-orange-900 shadow-sm">
                <div className="text-[9px] text-orange-400 font-bold uppercase mb-1">Unasgn</div>
                <div className="font-black text-orange-300 text-base">{stats.unassigned}</div>
              </div>
            </div>

            {/* League Ignoring Section */}
            <div style={{ background: '#18181b' }} className="p-4 rounded-xl border border-zinc-800">
                <h3 className="text-[9px] font-black text-zinc-500 uppercase mb-3 tracking-widest text-center">Protected Leagues</h3>
                <div className="grid grid-cols-4 gap-2">
                    {leagues.map(l => (
                        <button
                            onClick={() => toggleLeague(l.id)}
                            style={{ 
                                background: excludedLeagues.includes(l.id) ? '#dc2626' : '#27272a',
                                minHeight: '34px'
                            }}
                            className={`text-[9px] font-black rounded-lg transition-all ${excludedLeagues.includes(l.id) ? 'text-white border-red-800 scale-95 shadow-inner' : 'text-zinc-400 border-zinc-700 shadow-sm'} border`}
                        >
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Global Settings */}
            <div style={{ background: '#18181b' }} className="p-4 rounded-xl border border-zinc-800">
                <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Untradeable Only</span>
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={untradOnly} onChange={(e) => setUntradOnly(e.currentTarget.checked)} />
                        <div className={`w-12 h-6 rounded-full transition-colors ${untradOnly ? 'bg-indigo-600' : 'bg-zinc-700'}`}></div>
                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${untradOnly ? 'translate-x-6' : ''}`}></div>
                    </div>
                </label>
            </div>

            {/* Heavy Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                disabled={isSolving}
                onClick={() => runSolver('league')}
                style={{ background: '#4f46e5', borderBottom: '4px solid #3730a3', minHeight: '48px' }}
                className="w-full text-white rounded-xl text-xs font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase"
              >
                ⚽ League Solver
              </button>
              
              <button
                disabled={isSolving}
                onClick={() => runSolver('declog')}
                style={{ background: '#d97706', borderBottom: '4px solid #92400e', minHeight: '48px' }}
                className="w-full text-white rounded-xl text-xs font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase"
              >
                📦 De-Clogger (83+)
              </button>

              <button
                disabled={isSolving}
                onClick={() => runSolver('efficient')}
                style={{ background: '#059669', borderBottom: '4px solid #065f46', minHeight: '48px' }}
                className="w-full text-white rounded-xl text-xs font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase"
              >
                💎 Rare/Common
              </button>
            </div>
            
            {/* Status Feedback */}
            <div style={{ background: '#000000' }} className="rounded-xl p-4 min-h-[56px] flex items-center justify-center border border-zinc-800 shadow-inner">
                <p className="text-[10px] text-zinc-400 font-bold text-center leading-tight uppercase tracking-widest">
                    {status}
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
