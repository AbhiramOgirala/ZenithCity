import { useEffect, useState, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import {
  Building2, Plus, ArrowUp, Wrench, Zap, Shield, Map,
  Layers, AlertTriangle, Lock, CheckCircle, Clock
} from 'lucide-react';
import {
  fetchCity, constructBuilding, upgradeBuilding,
  repairBuilding, setBuildingPanelOpen, moveBuilding
} from '../store/slices/citySlice';
import { fetchProfile } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { RootState, AppDispatch } from '../store';
import City3D from '../components/City3D';
import SkySystem from '../components/SkySystem';
import DynamicLighting from '../components/DynamicLighting';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import * as THREE from 'three';

const BUILDING_TYPES = [
  { id: 'house',     label: 'House',     cost: 100,  emoji: '🏠', desc: 'Starter dwelling' },
  { id: 'park',      label: 'Park',      cost: 300,  emoji: '🌳', desc: 'Green space' },
  { id: 'apartment', label: 'Apartment', cost: 500,  emoji: '🏢', desc: 'Multi-family' },
  { id: 'office',    label: 'Office',    cost: 1000, emoji: '🏬', desc: 'Commercial hub' },
  { id: 'stadium',   label: 'Stadium',   cost: 5000, emoji: '🏟️', desc: 'Epic venue' },
];

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
  const [placementMode, setPlacementMode] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);
  
  // Sky system state
  const [lightingData, setLightingData] = useState({
    timeOfDay: new Date().getHours() + new Date().getMinutes() / 60,
    sunIntensity: 1,
    moonIntensity: 0,
    sunPosition: new THREE.Vector3(15, 30, 15),
    moonPosition: new THREE.Vector3(-15, -10, -15)
  });

  const handleLightingChange = (timeOfDay: number, sunIntensity: number, moonIntensity: number) => {
    // Throttle updates to reduce jittering - only update if values changed significantly
    const timeDiff = Math.abs(timeOfDay - lightingData.timeOfDay);
    const sunDiff = Math.abs(sunIntensity - lightingData.sunIntensity);
    const moonDiff = Math.abs(moonIntensity - lightingData.moonIntensity);
    
    // Only update if there's a significant change (reduces unnecessary re-renders)
    if (timeDiff < 0.01 && sunDiff < 0.01 && moonDiff < 0.01) {
      return;
    }
    
    // Calculate sun position based on time
    const sunAngle = ((timeOfDay - 6) / 12) * Math.PI;
    const sunElevation = Math.sin(sunAngle) * 0.8;
    const sunAzimuth = sunAngle - Math.PI / 2;
    
    const sunX = Math.cos(sunAzimuth) * Math.cos(sunElevation) * 50;
    const sunY = Math.sin(sunElevation) * 50;
    const sunZ = Math.sin(sunAzimuth) * Math.cos(sunElevation) * 50;
    
    // Calculate moon position (opposite to sun)
    const moonAngle = ((timeOfDay - 18) / 12) * Math.PI;
    const moonElevation = Math.sin(moonAngle) * 0.6;
    const moonAzimuth = moonAngle - Math.PI / 2;
    
    const moonX = Math.cos(moonAzimuth) * Math.cos(moonElevation) * 45;
    const moonY = Math.sin(moonElevation) * 45;
    const moonZ = Math.sin(moonAzimuth) * Math.cos(moonElevation) * 45;
    
    setLightingData({
      timeOfDay,
      sunIntensity,
      moonIntensity,
      sunPosition: new THREE.Vector3(sunX, Math.max(sunY, -10), sunZ),
      moonPosition: new THREE.Vector3(moonX, Math.max(moonY, -8), moonZ)
    });
  };

  useAutoCompleteBuildings();

  useEffect(() => { dispatch(fetchCity()); }, [dispatch]);

  const balance = user?.points_balance ?? 0;
  const selectedCost = BUILDING_TYPES.find(b => b.id === selectedType)?.cost ?? 0;
  const canAffordSelected = balance >= selectedCost;

  const handleConstruct = async () => {
    if (!canAffordSelected) {
      const deficit = selectedCost - balance;
      dispatch(addToast({ type: 'error', message: `Need ${deficit} more points to build this!` }));
      return;
    }

    // Enter placement mode instead of auto-placing
    setPlacementMode(selectedType);
  };

  const handleBuildingPlace = async (position: { x: number, z: number }) => {
    if (!placementMode) return;

    setConstructing(true);
    setPlacementMode(null);

    const result = await dispatch(constructBuilding({
      type: placementMode,
      position_x: position.x,
      position_y: 0,
      position_z: position.z,
    }));

    setConstructing(false);

    if (result.meta.requestStatus === 'fulfilled') {
      const bt = BUILDING_TYPES.find(b => b.id === placementMode)!;
      dispatch(addToast({ type: 'success', message: `${bt.emoji} ${bt.label} construction started!` }));
      // Sync the updated balance from server
      dispatch(fetchProfile());
    } else {
      const msg = (result.payload as string) || 'Construction failed';
      dispatch(addToast({ type: 'error', message: msg }));
    }
  };

  const handlePlacementCancel = () => {
    setPlacementMode(null);
  };

  const handleBuildingMove = async (buildingId: string, position: { x: number, z: number }) => {
    try {
      const result = await dispatch(moveBuilding({
        buildingId,
        position_x: position.x,
        position_z: position.z
      }));

      if (result.meta.requestStatus === 'fulfilled') {
        dispatch(addToast({ type: 'success', message: 'Building moved successfully!' }));
      } else {
        dispatch(addToast({ type: 'error', message: 'Failed to move building' }));
      }
    } catch (error) {
      dispatch(addToast({ type: 'error', message: 'Failed to move building' }));
    }
  };

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

  const completedBuildings    = city?.buildings?.filter(b => b.status === 'completed') || [];
  const constructingBuildings = city?.buildings?.filter(b => b.status === 'under_construction') || [];
  const damagedBuildings      = city?.buildings?.filter(b => b.status === 'damaged') || [];

  if (loading && !city) {
    return <div className="flex items-center justify-center h-full"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* 3D View */}
      <div className="flex-1 relative min-h-0" style={{ minHeight: '420px' }}>
        <Canvas
          camera={{ position: [22, 18, 22], fov: 48 }}
          style={{ 
            background: 'transparent',
            cursor: placementMode ? 'crosshair' : isDragMode ? 'grab' : 'default'
          }}
          shadows
          dpr={[1, 2]} // Limit device pixel ratio for performance
          performance={{ min: 0.5 }} // Allow frame rate to drop to maintain performance
        >
          <Suspense fallback={null}>
            {/* Sky system with sun, moon, and dynamic colors */}
            <SkySystem onLightingChange={handleLightingChange} />
            
            {/* Dynamic lighting that responds to time of day */}
            <DynamicLighting 
              timeOfDay={lightingData.timeOfDay}
              sunIntensity={lightingData.sunIntensity}
              moonIntensity={lightingData.moonIntensity}
              sunPosition={lightingData.sunPosition}
              moonPosition={lightingData.moonPosition}
            />
            
            {/* City */}
            <City3D 
              buildings={city?.buildings || []} 
              territorySize={city?.territory_size || 100}
              timeOfDay={lightingData.timeOfDay}
              sunIntensity={lightingData.sunIntensity}
              placementMode={placementMode}
              isDragMode={isDragMode}
              onBuildingPlace={handleBuildingPlace}
              onBuildingMove={handleBuildingMove}
              onPlacementCancel={handlePlacementCancel}
            />
            
            {/* Camera controls */}
            <OrbitControls 
              enablePan={!placementMode && !isDragMode} 
              enabled={!placementMode && !isDragMode}
              maxPolarAngle={Math.PI / 2.1} 
              minDistance={5} 
              maxDistance={60} 
            />
          </Suspense>
        </Canvas>

        {/* Stats overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
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
          {/* Time and lighting info */}
          <div className="glass-sm px-3 py-2 flex items-center gap-2 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-neon-yellow" />
            <span className="text-white font-bold">
              {Math.floor(lightingData.timeOfDay)}:{String(Math.floor((lightingData.timeOfDay % 1) * 60)).padStart(2, '0')}
            </span>
            <span className="text-space-400">
              {lightingData.sunIntensity > 0.1 ? '☀️' : lightingData.moonIntensity > 0.1 ? '🌙' : '🌃'}
            </span>
          </div>
        </div>

        {/* Balance overlay */}
        <div className="absolute top-4 right-4 pointer-events-none">
          <div className="glass-sm px-3 py-2 flex items-center gap-2 text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-neon-yellow" />
            <span className="text-neon-yellow font-bold">{balance.toLocaleString()} pts</span>
          </div>
        </div>

        {/* Open panel button */}
        <button
          onClick={() => dispatch(setBuildingPanelOpen(!buildingPanelOpen))}
          className="absolute bottom-4 right-4 btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {buildingPanelOpen ? 'Close' : 'Manage City'}
        </button>
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
            <div className="p-4 glass" style={{ borderRadius: 0 }}>
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
                      onClick={handleConstruct}
                      disabled={constructing || !canAffordSelected || placementMode !== null}
                      className={`px-6 py-3 rounded-xl font-display font-semibold text-sm uppercase tracking-widest flex items-center gap-2 transition-all ${
                        canAffordSelected && !placementMode
                          ? 'btn-primary'
                          : 'bg-space-800/50 border border-space-700/30 text-space-600 cursor-not-allowed'
                      }`}
                    >
                      {constructing
                        ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        : <Plus className="w-4 h-4" />
                      }
                      {placementMode ? 'Click to place' : canAffordSelected ? 'Build' : `Need ${(selectedCost - balance).toLocaleString()} more pts`}
                    </button>
                  </div>

                  {/* Placement mode instructions */}
                  {placementMode && (
                    <div className="glass-sm rounded-xl p-3 border border-neon-cyan/20">
                      <p className="text-xs text-neon-cyan font-semibold mb-1">🎯 Placement Mode Active</p>
                      <p className="text-xs text-space-300">
                        Move your mouse to position the building, then <strong>LEFT-CLICK</strong> to place it anywhere.
                        <br />
                        <strong>RIGHT-CLICK</strong> or <strong>ESC</strong> to cancel.
                      </p>
                    </div>
                  )}

                  {!canAffordSelected && !placementMode && (
                    <p className="text-xs text-space-500 text-center">
                      Complete workouts with AI camera to earn points and unlock this building
                    </p>
                  )}
                </div>
              )}

              {/* MANAGE TAB */}
              {activeTab === 'buildings' && (
                <div className="space-y-4">
                  {/* Drag mode toggle */}
                  <div className="flex items-center justify-between p-3 glass-sm rounded-xl border border-space-600/40">
                    <div>
                      <p className="text-sm font-semibold text-white">Move Buildings</p>
                      <p className="text-xs text-space-400">Drag and drop buildings to rearrange your city</p>
                    </div>
                    <button
                      onClick={() => setIsDragMode(!isDragMode)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isDragMode
                          ? 'bg-neon-green/20 border border-neon-green/40 text-neon-green'
                          : 'bg-space-700/50 border border-space-600/40 text-space-300 hover:bg-space-600/50'
                      }`}
                    >
                      {isDragMode ? '✓ Drag Mode ON' : 'Enable Drag Mode'}
                    </button>
                  </div>

                  {isDragMode && (
                    <div className="glass-sm rounded-xl p-3 border border-neon-green/20">
                      <p className="text-xs text-neon-green font-semibold mb-1">🎯 Drag Mode Active</p>
                      <p className="text-xs text-space-300">
                        Click and drag any building to move it. Buildings will snap to a grid and must stay within your territory.
                      </p>
                    </div>
                  )}

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
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
