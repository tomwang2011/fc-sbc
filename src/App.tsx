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
    <div 
        style={{ 
            position: 'fixed', 
            top: '50%', 
            left: '8px', 
            transform: 'translateY(-50%)', 
            zIndex: 9999999, 
            pointerEvents: 'auto' 
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
            background: isOpen ? '#ef4444' : 'rgba(79, 70, 229, 1)', 
            width: '48px', height: '48px', 
            boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.3)',
            cursor: 'pointer'
        }}
        className="transition-all hover:scale-110"
      >
        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{isOpen ? '✕' : '⚡'}</span>
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
                left: '56px',
                transform: 'translateY(-50%)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 30px 70px rgba(0,0,0,0.9)',
                display: 'block'
            }}
            className="animate-in slide-in-from-left-4 fade-in duration-200"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xs font-black text-white tracking-widest uppercase opacity-80">SBC Master V1.6</h2>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              style={{ background: '#18181b' }}
              className={`p-2 rounded-lg ${isScanning ? 'animate-spin opacity-50' : ''} border border-zinc-800 text-zinc-400`}
            >
              🔄
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div style={{ background: '#18181b' }} className="p-2.5 rounded-xl text-center border border-zinc-800">
                <div className="text-[8px] text-zinc-500 font-bold uppercase mb-1">Club</div>
                <div className="font-black text-white text-sm">{stats.total}</div>
              </div>
              <div style={{ background: '#172554' }} className="p-2.5 rounded-xl text-center border border-blue-900">
                <div className="text-[8px] text-blue-400 font-bold uppercase mb-1">Storage</div>
                <div className="font-black text-blue-300 text-sm">{stats.sbcStorage}</div>
              </div>
              <div style={{ background: '#431407' }} className="p-2.5 rounded-xl text-center border border-orange-900">
                <div className="text-[8px] text-orange-400 font-bold uppercase mb-1">Unasgn</div>
                <div className="font-black text-orange-300 text-sm">{stats.unassigned}</div>
              </div>
            </div>

            {/* League Ignoring Grid */}
            <div style={{ background: '#18181b' }} className="p-3.5 rounded-xl border border-zinc-800">
                <h3 className="text-[9px] font-black text-zinc-500 uppercase mb-2 tracking-widest text-center">Ignore Leagues</h3>
                <div className="grid grid-cols-4 gap-1.5">
                    {leagues.map(l => (
                        <button
                            onClick={() => toggleLeague(l.id)}
                            style={{ background: excludedLeagues.includes(l.id) ? '#dc2626' : '#27272a' }}
                            className={`text-[8px] font-black py-2 rounded-lg transition-all ${excludedLeagues.includes(l.id) ? 'text-white border-red-800 shadow-inner' : 'text-zinc-500 border-zinc-800'} border`}
                        >
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Untradeable Checkbox */}
            <div style={{ background: '#18181b' }} className="p-3.5 rounded-xl border border-zinc-800">
                <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Untradeable Only</span>
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={untradOnly} onChange={(e) => setUntradOnly(e.currentTarget.checked)} />
                        <div className={`w-10 h-5 rounded-full transition-colors ${untradOnly ? 'bg-indigo-600' : 'bg-zinc-700'}`}></div>
                        <div className={`absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${untradOnly ? 'translate-x-5' : ''}`}></div>
                    </div>
                </label>
            </div>

            {/* Big Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                disabled={isSolving}
                onClick={() => runSolver('league')}
                style={{ background: '#4f46e5', borderBottom: '3px solid #3730a3', minHeight: '44px' }}
                className="w-full text-white rounded-xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-tight"
              >
                ⚽ League Solver
              </button>
              
              <button
                disabled={isSolving}
                onClick={() => runSolver('declog')}
                style={{ background: '#d97706', borderBottom: '3px solid #92400e', minHeight: '44px' }}
                className="w-full text-white rounded-xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-tight"
              >
                📦 De-Clogger (83+)
              </button>

              <button
                disabled={isSolving}
                onClick={() => runSolver('efficient')}
                style={{ background: '#059669', borderBottom: '3px solid #065f46', minHeight: '44px' }}
                className="w-full text-white rounded-xl text-[10px] font-black shadow-lg transition-all active:translate-y-[2px] active:border-b-0 flex items-center justify-center gap-2 uppercase tracking-tight"
              >
                💎 Rare/Common
              </button>
            </div>
            
            {/* Opaque Status Bar */}
            <div style={{ background: '#000' }} className="rounded-xl p-3 min-h-[50px] flex items-center justify-center border border-zinc-800 shadow-inner">
                <p className="text-[9px] text-zinc-400 font-bold text-center leading-tight uppercase tracking-widest">
                    {status}
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
