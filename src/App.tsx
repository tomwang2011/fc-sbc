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

  const runSolver = async (type: 'league' | 'declog' | 'efficient' | 'challenge') => {
    setIsSolving(true);
    setStatus(`Solving ${type}...`);
    try {
      const solverMap = {
        league: SbcBuilder.solveLeague.bind(SbcBuilder),
        declog: SbcBuilder.solveDeClogger.bind(SbcBuilder),
        efficient: SbcBuilder.solveEfficient.bind(SbcBuilder),
        challenge: SbcBuilder.solveChallenge.bind(SbcBuilder)
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
    <div 
        style={{ 
            position: 'fixed', 
            top: '50%', 
            left: '8px', 
            transform: 'translateY(-50%)', 
            pointerEvents: 'auto',
            zIndex: 2147483647
        }}
        className="font-sans select-none"
    >
      {/* Floating Toggle Bubble - Left Side */}
      <button
        onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen && stats.total === 0) handleScan();
        }}
        style={{ 
            backgroundColor: isOpen ? '#ef4444' : '#4f46e5', 
            width: '48px', height: '48px', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: '1 !important'
        }}
      >
        <span style={{ fontSize: '24px', fontWeight: '900' }}>{isOpen ? '✕' : '⚡'}</span>
      </button>

      {/* Main Panel - Expanding from Left */}
      {isOpen && (
        <div 
            style={{ 
                backgroundColor: '#09090b', 
                opacity: '1 !important', 
                border: '1px solid #3f3f46',
                width: 'calc(100vw - 24px)',
                maxWidth: '320px',
                position: 'absolute',
                top: '50%',
                left: '60px',
                transform: 'translateY(-50%)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 40px 100px rgba(0,0,0,1)',
                display: 'block'
            }}
            className="animate-in slide-in-from-left-4 fade-in duration-300"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xs font-black text-white tracking-widest uppercase opacity-60">SBC Master V1.0.18</h2>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              style={{ background: '#18181b', borderRadius: '8px', border: '1px solid #27272a' }}
              className={`p-2 ${isScanning ? 'animate-spin opacity-50' : ''} text-zinc-400`}
            >
              🔄
            </button>
          </div>
          
          <div className="space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div style={{ background: '#18181b' }} className="p-3 rounded-2xl text-center border border-zinc-800 shadow-sm">
                <div className="text-[8px] text-zinc-500 font-bold uppercase mb-1">Club</div>
                <div className="font-black text-white text-base">{stats.total}</div>
              </div>
              <div style={{ background: '#172554' }} className="p-3 rounded-2xl text-center border border-blue-900 shadow-sm">
                <div className="text-[8px] text-blue-400 font-bold uppercase mb-1">Storage</div>
                <div className="font-black text-blue-300 text-base">{stats.sbcStorage}</div>
              </div>
              <div style={{ background: '#431407' }} className="p-3 rounded-2xl text-center border border-orange-950 shadow-sm">
                <div className="text-[8px] text-orange-400 font-bold uppercase mb-1">Unasgn</div>
                <div className="font-black text-orange-300 text-base">{stats.unassigned}</div>
              </div>
            </div>

            {/* Ignore Leagues Grid */}
            <div style={{ background: '#18181b' }} className="p-4 rounded-2xl border border-zinc-800 shadow-inner">
                <h3 className="text-[9px] font-black text-zinc-500 uppercase mb-3 tracking-widest text-center">Ignore Leagues</h3>
                <div className="grid grid-cols-4 gap-2">
                    {leagues.map(l => (
                        <button
                            onClick={() => toggleLeague(l.id)}
                            style={{ 
                                background: excludedLeagues.includes(l.id) ? '#dc2626' : '#27272a',
                                minHeight: '32px'
                            }}
                            className={`text-[8px] font-black rounded-lg transition-all ${excludedLeagues.includes(l.id) ? 'text-white border-red-800' : 'text-zinc-500 border-zinc-800'} border shadow-sm`}
                        >
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Settings */}
            <div style={{ background: '#18181b' }} className="p-4 rounded-2xl border border-zinc-800">
                <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Untradeable Only</span>
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={untradOnly} onChange={(e) => setUntradOnly(e.currentTarget.checked)} />
                        <div className={`w-11 h-6 rounded-full transition-colors ${untradOnly ? 'bg-indigo-600' : 'bg-zinc-700'}`}></div>
                        <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${untradOnly ? 'translate-x-5' : ''}`}></div>
                    </div>
                </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                disabled={isSolving}
                onClick={() => runSolver('challenge')}
                style={{ background: '#7c3aed', borderBottom: '4px solid #5b21b6', minHeight: '48px' }}
                className="w-full text-white rounded-2xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                🏆 Challenge Solver
              </button>

              <button
                disabled={isSolving}
                onClick={() => runSolver('league')}
                style={{ background: '#4f46e5', borderBottom: '4px solid #3730a3', minHeight: '48px' }}
                className="w-full text-white rounded-2xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                ⚽ League Solver
              </button>
              
              <button
                disabled={isSolving}
                onClick={() => runSolver('declog')}
                style={{ background: '#d97706', borderBottom: '4px solid #92400e', minHeight: '48px' }}
                className="w-full text-white rounded-2xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                📦 De-Clogger
              </button>

              <button
                disabled={isSolving}
                onClick={() => runSolver('efficient')}
                style={{ background: '#059669', borderBottom: '4px solid #065f46', minHeight: '48px' }}
                className="w-full text-white rounded-2xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                💎 Efficient
              </button>
            </div>
            
            {/* Status Indicator */}
            <div style={{ background: '#000' }} className="rounded-2xl p-4 min-h-[56px] flex items-center justify-center border border-zinc-800 shadow-inner">
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
