import { useEffect, useState, Suspense, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Building2, Plus, ArrowUp, Wrench, Zap, Shield, Map,
  Layers, AlertTriangle, Lock, Clock, Sun, Moon, Trash2, X, MousePointer
} from 'lucide-react';
import {
  fetchCity, constructBuilding, upgradeBuilding,
  repairBuilding, deleteBuilding, setBuildingPanelOpen
} from '../store/slices/citySlice';
import { fetchProfile } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { RootState, AppDispatch } from '../store';
import City3D from '../components/City3D';
import CitySky from '../components/CitySky';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const BUILDING_TYPES = [
  { id: 'house',     label: 'House',     cost: 100,  emoji: '🏠', desc: 'Starter dwelling' },
  { id: 'park',      label: 'Park',      cost: 300,  emoji: '🌳', desc: 'Green space' },
  { id: 'apartment', label: 'Apartment', cost: 500,  emoji: '🏢', desc: 'Multi-family' },
  { id: 'office',    label: 'Office',    cost: 1000, emoji: '🏬', desc: 'Commercial hub' },
  { id: 'stadium',   label: 'Stadium',   cost: 5000, emoji: '🏟️', desc: 'Epic venue' },
];

interface SelectedBuilding {
  id: string; type: string; level: number; status: string; health: number;
  screenX: number; screenY: number;
}

// Auto-complete buildings whose timer has expired
function useAutoCompleteBuildings() {
  const dispatch = useDispatch<AppDispatch>();
  const city = useSelector((s: RootState) => s.city.city);

  useEffect(() => {
    if (!city) return;
    const constructing = city.buildings.filter(b => b.status === 'under_construction');
    if (!constructing.length) return;

    // Check every 5 seconds if any building timer has passed
    const interval = setInterval(() => {
      const now = Date.now();
      const ready = constructing.filter(
        b => b.construction_completed_at && new Date(b.construction_completed_at).getTime() <= now
      );
      if (ready.length > 0) {
        // Refetch city to get updated statuses from backend
        dispatch(fetchCity());
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [city?.buildings?.length, dispatch]);
}

// Countdown timer for a building
function BuildingCountdown({ completedAt }: { completedAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(completedAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ready!'); return; }
      const s = Math.floor(diff / 1000);
      setRemaining(s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [completedAt]);

  return (
    <span className={`font-mono text-xs ${remaining === 'Ready!' ? 'text-neon-green font-bold' : 'text-neon-yellow'}`}>
      {remaining}
    </span>
  );
}

export default function CityPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { city, loading, buildingPanelOpen } = useSelector((s: RootState) => s.city);
  const { user } = useSelector((s: RootState) => s.auth);
  const [selectedType, setSelectedType] = useState('house');
  const [activeTab, setActiveTab] = useState<'build' | 'buildings'>('build');
  const [constructing, setConstructing] = useState(false);
  const [placementType, setPlacementType] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuilding | null>(null);
  const [demolishingId, setDemolishingId] = useState<string | null>(null);
  const [lightMode, setLightMode] = useState<'auto' | 'day' | 'night'>('auto');

  const systemHour = new Date().getHours();
  const isDay = lightMode === 'day' || (lightMode === 'auto' && systemHour >= 6 && systemHour < 20);

  const ambientIntensity = isDay ? 0.55 : 0.08;
  const dirLightIntensity = isDay ? 2.2 : 0.25;
  const dirLightColor = isDay ? '#fff8e8' : '#6677cc';
  const dirLightPos: [number, number, number] = isDay ? [60, 55, -80] : [-55, 60, -75];

  useAutoCompleteBuildings();

  useEffect(() => { dispatch(fetchCity()); }, [dispatch]);

  const balance = user?.points_balance ?? 0;
  const selectedCost = BUILDING_TYPES.find(b => b.id === selectedType)?.cost ?? 0;
  const canAffordSelected = balance >= selectedCost;

  // Enter placement mode — deduct points and show ghost
  const handleStartPlacement = () => {
    if (!canAffordSelected) {
      dispatch(addToast({ type: 'error', message: `Need ${selectedCost - balance} more points!` }));
      return;
    }
    setPlacementType(selectedType);
    dispatch(setBuildingPanelOpen(false));
  };

  // Called when user clicks on the ground in placement mode
  const handlePlace = useCallback(async (x: number, z: number) => {
    if (!placementType) return;
    setPlacementType(null);
    setConstructing(true);

    const result = await dispatch(constructBuilding({
      type: placementType,
      position_x: x,
      position_y: 0,
      position_z: z,
    }));

    setConstructing(false);

    if (result.meta.requestStatus === 'fulfilled') {
      const bt = BUILDING_TYPES.find(b => b.id === placementType)!;
      dispatch(addToast({ type: 'success', message: `${bt.emoji} ${bt.label} placed!` }));
      dispatch(fetchProfile());
    } else {
      dispatch(addToast({ type: 'error', message: (result.payload as string) || 'Construction failed' }));
    }
  }, [placementType, dispatch]);

  const handleUpgrade = async (buildingId: string, type: string, level: number) => {
    const result = await dispatch(upgradeBuilding(buildingId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(addToast({ type: 'success', message: `⬆️ Building upgraded to Level ${level + 1}!` }));
      dispatch(fetchProfile()); // sync balance
    } else {
      dispatch(addToast({ type: 'error', message: (result.payload as string) || 'Upgrade failed' }));
    }
  };

  const handleRepair = async (buildingId: string) => {
    const result = await dispatch(repairBuilding(buildingId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(addToast({ type: 'success', message: '🔧 Building repaired!' }));
      dispatch(fetchProfile());
    } else {
      dispatch(addToast({ type: 'error', message: (result.payload as string) || 'Repair failed' }));
    }
  };

  const handleDelete = async (buildingId: string, type: string) => {
    const result = await dispatch(deleteBuilding(buildingId));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(addToast({ type: 'success', message: `🗑️ ${type} demolished!` }));
    } else {
      dispatch(addToast({ type: 'error', message: (result.payload as string) || 'Delete failed' }));
    }
  };

  const handleBuildingClick = useCallback((b: any, screenX: number, screenY: number) => {
    if (placementType) return;
    setSelectedBuilding({ id: b.id, type: b.type, level: b.level, status: b.status, health: b.health, screenX, screenY });
  }, [placementType]);

  const handleDemolishStart = () => {
    if (!selectedBuilding) return;
    setDemolishingId(selectedBuilding.id);
    setSelectedBuilding(null);
  };

  const handleDemolishDone = useCallback(async () => {
    if (!demolishingId) return;
    const id = demolishingId;
    setDemolishingId(null);
    const b = city?.buildings.find(b => b.id === id);
    await dispatch(deleteBuilding(id));
    dispatch(addToast({ type: 'success', message: `💥 ${b?.type ?? 'Building'} demolished!` }));
  }, [demolishingId, city, dispatch]);

  const completedBuildings    = city?.buildings?.filter(b => b.status === 'completed') || [];
  const constructingBuildings = city?.buildings?.filter(b => b.status === 'under_construction') || [];
  const damagedBuildings      = city?.buildings?.filter(b => b.status === 'damaged') || [];

  if (loading && !city) {
    return <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* 3D View */}
      <div className="flex-1 relative min-h-0" style={{ minHeight: '320px' }}>
        <Canvas
          camera={{ position: [22, 18, 22], fov: 48 }}
          style={{ background: '#020818' }}
          shadows
        >
          <Suspense fallback={null}>
            <CitySky isDay={isDay} />
            <ambientLight intensity={ambientIntensity} />
            <hemisphereLight args={[isDay ? '#87ceeb' : '#0a1628', isDay ? '#4a7c23' : '#1a2a4a', isDay ? 0.9 : 0.3]} />
            <directionalLight
              position={dirLightPos} intensity={dirLightIntensity} color={dirLightColor} castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-far={120}
              shadow-camera-left={-40} shadow-camera-right={40}
              shadow-camera-top={40}  shadow-camera-bottom={-40}
            />
            <pointLight position={[-18, 12, -12]} color="#00F5FF" intensity={isDay ? 0.4 : 1.8} distance={50} />
            <pointLight position={[18, 8, 12]}    color="#B24BF3" intensity={isDay ? 0.3 : 1.2} distance={45} />
            <City3D
              buildings={city?.buildings || []}
              territorySize={city?.territory_size || 100}
              placementType={placementType}
              onPlace={handlePlace}
              onBuildingClick={handleBuildingClick}
              demolishingId={demolishingId}
              onDemolishDone={handleDemolishDone}
            />
            <OrbitControls
              enablePan={!placementType}
              enableRotate={!placementType}
              enableZoom
              maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={60}
            />
          </Suspense>
        </Canvas>

        {/* Stats overlay */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-1.5 sm:gap-2 pointer-events-none">
          <div className="glass-sm px-3 py-2 flex items-center gap-2 text-xs font-mono">
            <Building2 className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-white font-bold">{completedBuildings.length}</span>
            <span className="text-space-400">built</span>
            {constructingBuildings.length > 0 && (
              <span className="text-neon-yellow ml-1">+{constructingBuildings.length} building</span>
            )}
          </div>
          <div className="glass-sm px-3 py-2 flex items-center gap-2 text-xs font-mono">
            <Map className="w-3.5 h-3.5 text-neon-purple" />
            <span className="text-white font-bold">{city?.territory_size ?? 0}</span>
            <span className="text-space-400">/ 10,000 sqm</span>
          </div>
          <div className="glass-sm px-3 py-2 flex items-center gap-2 text-xs font-mono">
            <Shield className={`w-3.5 h-3.5 ${city?.decline_active ? 'text-neon-pink' : 'text-neon-green'}`} />
            <span className={city?.decline_active ? 'text-neon-pink font-bold' : 'text-neon-green font-bold'}>
              {city?.decline_active ? 'Declining — workout now!' : 'Healthy'}
            </span>
          </div>
          {/* Day / Night toggle */}
          <div className="glass-sm px-2 py-1.5 flex items-center gap-1 pointer-events-auto">
            {(['auto', 'day', 'night'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setLightMode(mode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  lightMode === mode
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'text-space-400 hover:text-white'
                }`}
              >
                {mode === 'day' && <Sun className="w-3 h-3" />}
                {mode === 'night' && <Moon className="w-3 h-3" />}
                {mode === 'auto' && <span>⏱</span>}
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Balance overlay */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 pointer-events-none">
          <div className="glass-sm px-3 py-2 flex items-center gap-2 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-neon-yellow" />
            <span className="text-neon-yellow font-bold">{balance.toLocaleString()} pts</span>
          </div>
        </div>

        {/* Placement mode banner */}
        <AnimatePresence>
          {placementType && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
            >
              <div className="glass px-6 py-3 rounded-2xl border border-neon-cyan/40 flex items-center gap-3">
                <MousePointer className="w-4 h-4 text-neon-cyan animate-pulse" />
                <span className="text-neon-cyan font-mono text-sm font-semibold">
                  Click to place {BUILDING_TYPES.find(b => b.id === placementType)?.emoji} {placementType}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel placement button */}
        <AnimatePresence>
          {placementType && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setPlacementType(null)}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neon-pink/15 border border-neon-pink/40 text-neon-pink font-mono text-sm hover:bg-neon-pink/25 transition-all pointer-events-auto"
            >
              <X className="w-4 h-4" /> Cancel
            </motion.button>
          )}
        </AnimatePresence>

        {/* Building info popup on click */}
        <AnimatePresence>
          {selectedBuilding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 pointer-events-auto"
              style={{
                left: Math.min(selectedBuilding.screenX - 80, window.innerWidth - 200),
                top: Math.max(selectedBuilding.screenY - 160, 8),
              }}
            >
              <div className="glass border border-white/10 rounded-2xl p-4 w-48 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{BUILDING_TYPES.find(t => t.id === selectedBuilding.type)?.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-sm capitalize">{selectedBuilding.type}</p>
                      <p className="text-space-400 text-xs font-mono">Lvl {selectedBuilding.level}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedBuilding(null)} className="text-space-500 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-space-400">Health</span>
                    <span className={selectedBuilding.health > 60 ? 'text-neon-green' : selectedBuilding.health > 30 ? 'text-neon-yellow' : 'text-neon-pink'}>
                      {selectedBuilding.health}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-space-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedBuilding.health}%`,
                        background: selectedBuilding.health > 60 ? '#39ff14' : selectedBuilding.health > 30 ? '#ffd93d' : '#ff2d55',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-space-400">Status</span>
                    <span className={
                      selectedBuilding.status === 'completed' ? 'text-neon-green' :
                      selectedBuilding.status === 'under_construction' ? 'text-neon-yellow' : 'text-neon-pink'
                    }>
                      {selectedBuilding.status === 'under_construction' ? 'Building...' :
                       selectedBuilding.status === 'damaged' ? 'Damaged' : 'Active'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDemolishStart}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-neon-pink/10 border border-neon-pink/40 text-neon-pink text-xs font-semibold hover:bg-neon-pink/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Demolish
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Open panel button */}
        {!placementType && (
          <button
            onClick={() => dispatch(setBuildingPanelOpen(!buildingPanelOpen))}
            className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 btn-primary flex items-center gap-2 text-xs sm:text-sm"
            aria-label={buildingPanelOpen ? 'Close city management panel' : 'Open city management panel'}
            aria-expanded={buildingPanelOpen}
          >
            <Plus className="w-4 h-4" />
            {buildingPanelOpen ? 'Close' : 'Manage City'}
          </button>
        )}
      </div>

      {/* Management panel */}
      <AnimatePresence>
        {buildingPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 overflow-hidden flex-shrink-0"
          >
            <div className="p-3 sm:p-4 glass" style={{ borderRadius: 0 }}>
              {/* Tabs */}
              <div className="flex gap-1 glass-sm p-1 rounded-xl w-fit mb-4">
                {[
                  { id: 'build', label: 'Construct' },
                  { id: 'buildings', label: `Manage (${city?.buildings?.length ?? 0})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 text-xs font-display font-semibold tracking-wider uppercase rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30'
                        : 'text-space-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* BUILD TAB */}
              {activeTab === 'build' && (
                <div className="space-y-4">
                  {/* Building type selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {BUILDING_TYPES.map(bt => {
                      const affordable = balance >= bt.cost;
                      const isSelected = selectedType === bt.id;
                      return (
                        <button
                          key={bt.id}
                          onClick={() => setSelectedType(bt.id)}
                          className={`relative p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-neon-cyan/60 bg-neon-cyan/8 ring-1 ring-neon-cyan/20'
                              : affordable
                                ? 'border-space-600/40 hover:border-space-400 hover:bg-white/3'
                                : 'border-space-700/30 opacity-50 cursor-not-allowed'
                          }`}
                          disabled={!affordable}
                          title={!affordable ? `Need ${bt.cost - balance} more points` : ''}
                        >
                          {!affordable && (
                            <Lock className="absolute top-2 right-2 w-3 h-3 text-space-500" />
                          )}
                          <div className="text-2xl mb-1">{bt.emoji}</div>
                          <p className="text-xs font-semibold text-white">{bt.label}</p>
                          <p className="text-xs font-mono mt-0.5 flex items-center gap-0.5"
                            style={{ color: affordable ? '#FFD93D' : '#4A5899' }}>
                            <Zap className="w-2.5 h-2.5" />{bt.cost}
                          </p>
                          <p className="text-xs text-space-500 mt-0.5">{bt.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Build button + summary */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 glass-sm rounded-xl p-3 text-xs font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-space-400">Your balance</span>
                        <span className="text-neon-yellow font-bold">{balance.toLocaleString()} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-space-400">Cost</span>
                        <span className={canAffordSelected ? 'text-white' : 'text-neon-pink'}>
                          − {selectedCost.toLocaleString()} pts
                        </span>
                      </div>
                      <div className="border-t border-white/10 pt-1 flex justify-between">
                        <span className="text-space-400">After build</span>
                        <span className={canAffordSelected ? 'text-neon-green font-bold' : 'text-neon-pink font-bold'}>
                          {(balance - selectedCost).toLocaleString()} pts
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleStartPlacement}
                      disabled={constructing || !canAffordSelected}
                      className={`px-6 py-3 rounded-xl font-display font-semibold text-sm uppercase tracking-widest flex items-center gap-2 transition-all ${
                        canAffordSelected
                          ? 'btn-primary'
                          : 'bg-space-800/50 border border-space-700/30 text-space-600 cursor-not-allowed'
                      }`}
                    >
                      {constructing
                        ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        : <MousePointer className="w-4 h-4" />
                      }
                      {canAffordSelected ? 'Place' : `Need ${(selectedCost - balance).toLocaleString()} more pts`}
                    </button>
                  </div>

                  {!canAffordSelected && (
                    <p className="text-xs text-space-500 text-center">
                      Complete workouts with AI camera to earn points and unlock this building
                    </p>
                  )}
                </div>
              )}

              {/* MANAGE TAB */}
              {activeTab === 'buildings' && (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {/* Under construction */}
                  {constructingBuildings.length > 0 && (
                    <>
                      <p className="text-xs text-neon-yellow font-mono uppercase tracking-widest px-1">
                        🏗️ Under Construction ({constructingBuildings.length})
                      </p>
                      {constructingBuildings.map(b => (
                        <div key={b.id} className="flex items-center gap-3 p-2.5 glass-sm rounded-lg border border-neon-yellow/15">
                          <div className="w-8 h-8 rounded-lg bg-neon-yellow/10 border border-neon-yellow/20 flex items-center justify-center text-sm flex-shrink-0">
                            {BUILDING_TYPES.find(t => t.id === b.type)?.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white capitalize">{b.type}</p>
                            <div className="flex items-center gap-1.5 text-xs text-space-400 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <BuildingCountdown completedAt={b.construction_completed_at} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Damaged */}
                  {damagedBuildings.length > 0 && (
                    <>
                      <p className="text-xs text-neon-pink font-mono uppercase tracking-widest px-1 mt-2">
                        ⚠️ Damaged ({damagedBuildings.length})
                      </p>
                      {damagedBuildings.map(b => (
                        <div key={b.id} className="flex items-center gap-3 p-2.5 glass-sm rounded-lg border border-neon-pink/25">
                          <AlertTriangle className="w-4 h-4 text-neon-pink flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white capitalize">{b.type} — Lvl {b.level}</p>
                            <p className="text-xs text-neon-pink font-mono">200 pts to repair</p>
                          </div>
                          <button
                            onClick={() => handleRepair(b.id)}
                            disabled={balance < 200}
                            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                              balance >= 200
                                ? 'bg-neon-pink/10 border border-neon-pink/40 text-neon-pink hover:bg-neon-pink/20'
                                : 'bg-space-800 border border-space-700 text-space-600 cursor-not-allowed'
                            }`}
                          >
                            <Wrench className="w-3 h-3" /> Repair
                          </button>
                          <button
                            onClick={() => handleDelete(b.id, b.type)}
                            className="text-xs px-2 py-1.5 rounded-lg flex items-center gap-1 bg-space-800 border border-space-700 text-space-500 hover:border-neon-pink/40 hover:text-neon-pink transition-all"
                            title="Demolish"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Completed */}
                  {completedBuildings.length > 0 && (
                    <>
                      <p className="text-xs text-neon-green font-mono uppercase tracking-widest px-1 mt-2">
                        ✅ Completed ({completedBuildings.length})
                      </p>
                      {completedBuildings.map(b => {
                        const cfg = BUILDING_TYPES.find(t => t.id === b.type)!;
                        const upgradeCost = cfg ? Math.floor(cfg.cost * Math.pow(1.5, b.level)) : 9999;
                        const canUpgrade = b.level < 3 && balance >= upgradeCost;
                        const atMaxLevel = b.level >= 3;

                        return (
                          <div key={b.id} className="flex items-center gap-3 p-2.5 glass-sm rounded-lg">
                            <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-sm flex-shrink-0">
                              {cfg?.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white capitalize">{b.type}</p>
                              <div className="flex items-center gap-2 text-xs font-mono text-space-400 mt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <Layers className="w-3 h-3" /> Lvl {b.level}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Shield className="w-3 h-3" /> {b.health}%
                                </span>
                              </div>
                            </div>

                            {atMaxLevel ? (
                              <span className="text-xs text-neon-cyan font-mono px-2 py-1 bg-neon-cyan/10 rounded-lg">MAX</span>
                            ) : (
                              <button
                                onClick={() => handleUpgrade(b.id, b.type, b.level)}
                                disabled={!canUpgrade}
                                title={!canUpgrade ? `Need ${upgradeCost} pts` : `Upgrade for ${upgradeCost} pts`}
                                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                                  canUpgrade
                                    ? 'bg-space-700/50 border border-space-500/50 text-white hover:border-neon-cyan/40 hover:text-neon-cyan'
                                    : 'bg-space-800 border border-space-700 text-space-600 cursor-not-allowed'
                                }`}
                              >
                                <ArrowUp className="w-3 h-3" />
                                {canUpgrade ? `${upgradeCost}pts` : <Lock className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {city?.buildings?.length === 0 && (
                    <div className="text-center py-6 text-space-500 text-sm">
                      No buildings yet — earn points and start building!
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
