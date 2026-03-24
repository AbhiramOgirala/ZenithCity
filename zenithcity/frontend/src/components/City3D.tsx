/**
 * City3D — Hybrid GLB + High-Detail Procedural Buildings
 *
 * SETUP (one-time, optional):
 *   node scripts/download-models.js
 *   Grabs free CC0 GLB files from kenney.nl → public/models/
 *
 * WITHOUT SETUP: Procedural buildings render immediately.
 * The procedural version uses instanced geometry, real PBR materials,
 * window-grid textures drawn on canvas, and proper architectural massing.
 */

import React, { useRef, useMemo, Suspense, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Float, Edges } from '@react-three/drei';
import * as THREE from 'three';

// ─── Types ────────────────────────────────────────────────────────────────────
import DraggableBuilding from './DraggableBuilding';
import BuildingPlacer from './BuildingPlacer';

interface BuildingData {
  id: string; type: string; level: number;
  status: string; health: number;
  position_x: number; position_y: number; position_z: number;
}

// ─── Window texture generator (canvas-based, PBR-quality) ────────────────────
function makeWindowTexture(cols: number, rows: number, litColor: string, frameColor: string, timeOfDay: number = 12) {
  const W = 256, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Dark concrete base
  ctx.fillStyle = frameColor;
  ctx.fillRect(0, 0, W, H);

  const cw = W / cols, rh = H / rows;
  const pad = 4;
  
  // Calculate lighting probability based on time of day
  const hour = timeOfDay % 24;
  let lightProbability = 0.25; // Default
  
  if (hour >= 6 && hour < 9) {
    // Morning - some lights on
    lightProbability = 0.4;
  } else if (hour >= 9 && hour < 17) {
    // Day - fewer lights (office hours)
    lightProbability = 0.6;
  } else if (hour >= 17 && hour < 22) {
    // Evening - most lights on
    lightProbability = 0.8;
  } else if (hour >= 22 || hour < 6) {
    // Night - some lights on
    lightProbability = 0.3;
  }

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const lit = Math.random() < lightProbability;
      // Window pane
      ctx.fillStyle = lit ? litColor : '#0a0e1a';
      ctx.fillRect(c * cw + pad, r * rh + pad, cw - pad * 2, rh - pad * 2);
      // Reflection sheen
      if (lit) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(c * cw + pad, r * rh + pad, cw - pad * 2, (rh - pad * 2) * 0.35);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Shared textures (created once) ──────────────────────────────────────────
let _texCache: Record<string, THREE.CanvasTexture> = {};
function getWindowTex(key: string, cols: number, rows: number, lit: string, frame: string, timeOfDay: number = 12) {
  // Include timeOfDay in cache key to regenerate textures when time changes significantly
  const timeKey = `${key}_${Math.floor(timeOfDay / 3)}`; // Update every 3 hours
  if (!_texCache[timeKey]) _texCache[timeKey] = makeWindowTexture(cols, rows, lit, frame, timeOfDay);
  return _texCache[timeKey];
}

// ─── HOUSE ───────────────────────────────────────────────────────────────────
function House({ level, damaged, timeOfDay = 12 }: { level: number; damaged: boolean; timeOfDay?: number }) {
  const s = 0.85 + level * 0.18;
  const w = 2.2 * s, d = 2.2 * s, wallH = 2.0 * s, roofH = 1.2 * s;

  const brickTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#C07050'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#A0604030';
    for (let y = 0; y < 128; y += 12) {
      for (let x = (y / 12 % 2 === 0 ? 0 : 20); x < 128; x += 40) {
        ctx.fillRect(x, y, 36, 10);
      }
    }
    ctx.strokeStyle = '#8B5030'; ctx.lineWidth = 1;
    for (let y = 0; y < 128; y += 12) ctx.strokeRect(0, y, 128, 12);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1.5);
    return t;
  }, []);

  const winTex = getWindowTex('house', 2, 1, '#FFE08060', '#A07050', timeOfDay);

  return (
    <group>
      {/* Foundation */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[w + 0.15, 0.2, d + 0.15]} />
        <meshStandardMaterial color="#888" roughness={0.9} />
      </mesh>

      {/* Walls — front */}
      <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, wallH, d]} />
        <meshStandardMaterial color={damaged ? '#666' : '#D4956A'} map={damaged ? undefined : brickTex} roughness={0.85} metalness={0.0} />
      </mesh>

      {/* Pitched roof */}
      <group position={[0, wallH, 0]} rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, roofH / 2, 0]} castShadow>
          <coneGeometry args={[w * 0.77, roofH, 4, 1]} />
          <meshStandardMaterial color={damaged ? '#444' : '#6B3A2A'} roughness={0.8} />
        </mesh>
      </group>

      {/* Chimney */}
      <mesh position={[w * 0.27, wallH + roofH * 0.55, d * 0.15]} castShadow>
        <boxGeometry args={[0.22, 0.75, 0.22]} />
        <meshStandardMaterial color="#5A3020" roughness={0.9} />
      </mesh>
      <mesh position={[w * 0.27, wallH + roofH * 0.55 + 0.38, d * 0.15]}>
        <boxGeometry args={[0.28, 0.08, 0.28]} />
        <meshStandardMaterial color="#3A2010" roughness={0.9} />
      </mesh>

      {/* Front door */}
      <mesh position={[0, 0.55, d / 2 + 0.01]}>
        <boxGeometry args={[0.5, 1.1, 0.03]} />
        <meshStandardMaterial color="#4A2810" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0.12, 0.75, d / 2 + 0.02]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#FFD700" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Front windows */}
      <mesh position={[-0.6, wallH * 0.65, d / 2 + 0.01]}>
        <boxGeometry args={[0.55, 0.6, 0.04]} />
        <meshStandardMaterial color="#8BBFDF" transparent opacity={0.7} roughness={0.05} metalness={0.5} map={winTex} />
      </mesh>
      <mesh position={[0.6, wallH * 0.65, d / 2 + 0.01]}>
        <boxGeometry args={[0.55, 0.6, 0.04]} />
        <meshStandardMaterial color="#8BBFDF" transparent opacity={0.7} roughness={0.05} metalness={0.5} map={winTex} />
      </mesh>

      {/* Side windows */}
      <mesh position={[w / 2 + 0.01, wallH * 0.65, 0]}>
        <boxGeometry args={[0.04, 0.6, 0.55]} />
        <meshStandardMaterial color="#8BBFDF" transparent opacity={0.7} roughness={0.05} metalness={0.5} />
      </mesh>

      {/* Porch awning */}
      <mesh position={[0, wallH * 0.55, d / 2 + 0.25]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.9, 0.04, 0.5]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>

      {!damaged && <pointLight position={[0, wallH * 0.6, 0]} color="#FFD080" intensity={0.4} distance={5} />}
    </group>
  );
}

// ─── APARTMENT ───────────────────────────────────────────────────────────────
function Apartment({ level, damaged, timeOfDay = 12 }: { level: number; damaged: boolean; timeOfDay?: number }) {
  const floors = 5 + level * 3;
  const fH = 0.5, totalH = floors * fH;
  const w = 2.3, d = 2.1;

  const winTex = getWindowTex('apt', 4, floors, '#90D8FF80', '#4A6080', timeOfDay);

  return (
    <group>
      {/* Base plinth */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.5, 0.4, d + 0.5]} />
        <meshStandardMaterial color="#455A64" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Main tower */}
      <mesh position={[0, 0.4 + totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, totalH, d]} />
        <meshStandardMaterial color={damaged ? '#555' : '#607D8B'} roughness={0.5} metalness={0.15} />
      </mesh>

      {/* Window grids — all 4 faces */}
      {[
        { pos: [0, 0.4 + totalH / 2, d / 2 + 0.01] as [number,number,number], rot: [0, 0, 0] as [number,number,number] },
        { pos: [0, 0.4 + totalH / 2, -d / 2 - 0.01] as [number,number,number], rot: [0, Math.PI, 0] as [number,number,number] },
        { pos: [w / 2 + 0.01, 0.4 + totalH / 2, 0] as [number,number,number], rot: [0, -Math.PI/2, 0] as [number,number,number] },
        { pos: [-w / 2 - 0.01, 0.4 + totalH / 2, 0] as [number,number,number], rot: [0, Math.PI/2, 0] as [number,number,number] },
      ].map(({ pos, rot }, i) => (
        <mesh key={i} position={pos} rotation={rot}>
          <planeGeometry args={[w * 0.9, totalH * 0.9]} />
          <meshStandardMaterial map={winTex} transparent roughness={0.1} metalness={0.6} />
        </mesh>
      ))}

      {/* Floor bands */}
      {Array.from({ length: floors + 1 }).map((_, i) => (
        <mesh key={i} position={[0, 0.4 + i * fH, 0]}>
          <boxGeometry args={[w + 0.02, 0.05, d + 0.02]} />
          <meshStandardMaterial color="#37474F" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}

      {/* Upper setback */}
      {level >= 2 && (
        <mesh position={[0, 0.4 + totalH + level * 0.3, 0]} castShadow>
          <boxGeometry args={[w * 0.6, level * 0.6, d * 0.6]} />
          <meshStandardMaterial color="#546E7A" roughness={0.5} />
        </mesh>
      )}

      {/* Rooftop tanks & HVAC */}
      <mesh position={[w * 0.3, 0.4 + totalH + 0.5, d * 0.3]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.8, 8]} />
        <meshStandardMaterial color="#455A64" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[-w * 0.25, 0.4 + totalH + 0.3, -d * 0.25]}>
        <boxGeometry args={[0.5, 0.35, 0.35]} />
        <meshStandardMaterial color="#37474F" metalness={0.5} roughness={0.5} />
      </mesh>

      {!damaged && <pointLight position={[0, totalH * 0.5, 0]} color="#90D8FF" intensity={0.6} distance={10} />}
    </group>
  );
}

// ─── OFFICE ──────────────────────────────────────────────────────────────────
function Office({ level, damaged, timeOfDay = 12 }: { level: number; damaged: boolean; timeOfDay?: number }) {
  const floors = 10 + level * 5;
  const fH = 0.42, totalH = floors * fH;
  const w = 2.5, d = 2.0;

  const winTex = getWindowTex('office', 5, floors, '#C0E8FF70', '#2A3A4A', timeOfDay);
  const winTexB = getWindowTex('office_b', 5, floors, '#FFE09050', '#2A3A4A', timeOfDay);

  return (
    <group>
      {/* Lobby */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.8, 0.8, d + 0.8]} />
        <meshStandardMaterial color="#263238" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Glass tower */}
      <mesh position={[0, 0.8 + totalH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, totalH, d]} />
        <meshStandardMaterial
          color={damaged ? '#333' : '#B0C8D8'}
          transparent={!damaged}
          opacity={damaged ? 1 : 0.75}
          roughness={0.04}
          metalness={0.85}
        />
      </mesh>

      {/* Curtain wall window grids */}
      {[
        { pos: [0, 0.8 + totalH / 2, d / 2 + 0.01] as [number,number,number], tex: winTex },
        { pos: [0, 0.8 + totalH / 2, -d / 2 - 0.01] as [number,number,number], tex: winTexB },
        { pos: [w / 2 + 0.01, 0.8 + totalH / 2, 0] as [number,number,number], tex: winTex },
        { pos: [-w / 2 - 0.01, 0.8 + totalH / 2, 0] as [number,number,number], tex: winTexB },
      ].map(({ pos, tex }, i) => (
        <mesh key={i} position={pos} rotation={[0, i >= 2 ? Math.PI/2 : 0, 0]}>
          <planeGeometry args={[i >= 2 ? d * 0.95 : w * 0.95, totalH * 0.97]} />
          <meshStandardMaterial map={tex} transparent roughness={0.05} metalness={0.8} />
        </mesh>
      ))}

      {/* Horizontal mullions */}
      {Array.from({ length: Math.floor(floors / 3) }).map((_, i) => (
        <mesh key={i} position={[0, 0.8 + i * fH * 3, 0]}>
          <boxGeometry args={[w + 0.06, 0.06, d + 0.06]} />
          <meshStandardMaterial color="#1A2530" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Spire */}
      <mesh position={[0, 0.8 + totalH + 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.07, 2.4, 6]} />
        <meshStandardMaterial color="#90A4AE" metalness={1} roughness={0.05}
          emissive={damaged ? '#000' : '#00AAFF'} emissiveIntensity={0.5} />
      </mesh>

      {/* Roof mechanical penthouse */}
      <mesh position={[0, 0.8 + totalH + 0.3, 0]} castShadow>
        <boxGeometry args={[w * 0.5, 0.6, d * 0.5]} />
        <meshStandardMaterial color="#263238" metalness={0.5} roughness={0.4} />
      </mesh>

      {!damaged && (
        <>
          <pointLight position={[0, 0.8 + totalH + 2.5, 0]} color="#00AAFF" intensity={1.5} distance={4} />
          <pointLight position={[0, totalH * 0.4, 0]} color="#C0E8FF" intensity={0.8} distance={14} />
        </>
      )}
    </group>
  );
}

// ─── PARK ────────────────────────────────────────────────────────────────────
function Park({ level, damaged, timeOfDay = 12 }: { level: number; damaged: boolean; timeOfDay?: number }) {
  const radius = 2.8 + level * 0.5;
  const treeCount = 7 + level * 3;
  const treePos = useMemo(() =>
    Array.from({ length: treeCount }, (_, i) => {
      const a = (i / treeCount) * Math.PI * 2 + (i % 2) * 0.4;
      const r = radius * (0.45 + Math.random() * 0.42);
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 1.0 + Math.random() * 0.7, s: 0.8 + Math.random() * 0.5 };
    }), [treeCount, radius]);

  const grassColor = damaged ? '#4A5240' : '#5DAF42';
  const treeColor  = damaged ? '#3A5030' : '#27882A';

  return (
    <group>
      {/* Grass disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[radius, 40]} />
        <meshStandardMaterial color={grassColor} roughness={0.95} />
      </mesh>

      {/* Paths */}
      {[0, Math.PI / 2].map((ry, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, ry]} position={[0, 0.04, 0]}>
          <planeGeometry args={[radius * 2, 0.35]} />
          <meshStandardMaterial color="#C8B89A" roughness={0.9} />
        </mesh>
      ))}

      {/* Fountain base */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.65, 0.75, 0.4, 16]} />
        <meshStandardMaterial color="#9E9E9E" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.06, 16]} />
        <meshStandardMaterial color="#B0BEC5" roughness={0.2} metalness={0.4} />
      </mesh>
      {!damaged && (
        <>
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color="#4FC3F7" emissive="#00BFFF" emissiveIntensity={0.8}
              transparent opacity={0.85} roughness={0.0} metalness={0.3} />
          </mesh>
          <pointLight position={[0, 0.7, 0]} color="#00BFFF" intensity={0.5} distance={5} />
        </>
      )}

      {/* Benches */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => (
        <group key={i} position={[Math.cos(a) * radius * 0.6, 0, Math.sin(a) * radius * 0.6]} rotation={[0, a, 0]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.6, 0.07, 0.25]} />
            <meshStandardMaterial color="#8D6E63" roughness={0.8} />
          </mesh>
          <mesh position={[-0.22, 0.15, 0]}>
            <boxGeometry args={[0.06, 0.28, 0.22]} />
            <meshStandardMaterial color="#5D4037" roughness={0.9} />
          </mesh>
          <mesh position={[0.22, 0.15, 0]}>
            <boxGeometry args={[0.06, 0.28, 0.22]} />
            <meshStandardMaterial color="#5D4037" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Trees */}
      {treePos.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.12, t.h, 5]} />
            <meshStandardMaterial color="#6D4C41" roughness={0.95} />
          </mesh>
          <mesh position={[0, t.h + t.s * 0.45, 0]} castShadow>
            <coneGeometry args={[t.s * 0.55, t.s * 1.1, 6]} />
            <meshStandardMaterial color={treeColor} roughness={0.9} />
          </mesh>
          {level >= 2 && (
            <mesh position={[0, t.h + t.s * 0.9, 0]} castShadow>
              <coneGeometry args={[t.s * 0.38, t.s * 0.85, 5]} />
              <meshStandardMaterial color={treeColor} roughness={0.9} />
            </mesh>
          )}
          {level >= 3 && (
            <mesh position={[0, t.h + t.s * 1.35, 0]} castShadow>
              <coneGeometry args={[t.s * 0.22, t.s * 0.6, 5]} />
              <meshStandardMaterial color={treeColor} roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}

      {!damaged && <pointLight position={[0, 2, 0]} color="#7EFF7E" intensity={0.3} distance={8} />}
    </group>
  );
}

// ─── STADIUM ─────────────────────────────────────────────────────────────────
function Stadium({ level, damaged, timeOfDay = 12 }: { level: number; damaged: boolean; timeOfDay?: number }) {
  const s = 0.9 + level * 0.22;
  const outerR = 4.5 * s, innerR = 3.0 * s, ringH = 2.2 * s;
  const lightCount = 8 + level * 2;

  const standsTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d')!;
    const colors = ['#F44336','#2196F3','#4CAF50','#FF9800','#9C27B0','#00BCD4'];
    for (let i = 0; i < 256; i += 4) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(i, 0, 4, 64);
    }
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <group>
      {/* Outer wall ring */}
      <mesh position={[0, ringH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[outerR, outerR * 1.04, ringH, 48]} />
        <meshStandardMaterial color={damaged ? '#666' : '#ECEFF1'} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Stands interior (visible from above) */}
      <mesh position={[0, ringH * 0.6, 0]}>
        <cylinderGeometry args={[innerR * 0.98, outerR * 0.92, ringH * 0.5, 48, 1, true]} />
        <meshStandardMaterial side={THREE.BackSide} map={standsTex} roughness={0.9} />
      </mesh>

      {/* Field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
        <circleGeometry args={[innerR * 0.97, 48]} />
        <meshStandardMaterial color={damaged ? '#3A4A30' : '#4CAF50'} roughness={0.9} />
      </mesh>

      {/* Field markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[innerR * 0.3, innerR * 0.32, 32]} />
        <meshStandardMaterial color="white" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={[innerR * 1.8, 0.1]} />
        <meshStandardMaterial color="white" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, Math.PI / 2, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={[innerR * 1.8, 0.1]} />
        <meshStandardMaterial color="white" roughness={0.9} />
      </mesh>

      {/* Concourse rim */}
      <mesh position={[0, ringH + 0.15, 0]} castShadow>
        <torusGeometry args={[(outerR + innerR * 0.6) / 1.8, 0.28, 8, 48]} />
        <meshStandardMaterial color="#FF6B35" roughness={0.3} metalness={0.4}
          emissive={damaged ? '#000' : '#FF6B35'} emissiveIntensity={0.1} />
      </mesh>

      {/* Tiered seating rings */}
      {[0.3, 0.6, 0.85].map((frac, i) => (
        <mesh key={i} position={[0, ringH * (i * 0.25 + 0.1), 0]}>
          <torusGeometry args={[innerR + (outerR - innerR) * frac, 0.12, 4, 48]} />
          <meshStandardMaterial color="#CFD8DC" roughness={0.7} />
        </mesh>
      ))}

      {/* Floodlight towers */}
      {Array.from({ length: lightCount }).map((_, i) => {
        const a = (i / lightCount) * Math.PI * 2;
        const lx = Math.cos(a) * (outerR + 0.4);
        const lz = Math.sin(a) * (outerR + 0.4);
        return (
          <group key={i} position={[lx, 0, lz]}>
            <mesh position={[0, ringH + 1.8, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.09, ringH + 3.5, 4]} />
              <meshStandardMaterial color="#90A4AE" metalness={0.7} roughness={0.2} />
            </mesh>
            <mesh position={[0, ringH + 3.6, 0]}>
              <boxGeometry args={[0.6, 0.1, 0.35]} />
              <meshStandardMaterial color="#FAFAFA"
                emissive={damaged ? '#000' : '#FFFDE7'} emissiveIntensity={0.8} />
            </mesh>
            {!damaged && (
              <pointLight position={[0, ringH + 3.7, 0]}
                color="#FFF9C4" intensity={0.8} distance={10} />
            )}
          </group>
        );
      })}

      {!damaged && (
        <pointLight position={[0, ringH, 0]} color="#FF8C00" intensity={1.2} distance={16} />
      )}
    </group>
  );
}

// ─── GLB Model loader (with error boundary) ───────────────────────────────────
const MODEL_PATHS: Record<string, string> = {
  house:     '/models/house.glb',
  apartment: '/models/apartment.glb',
  office:    '/models/office.glb',
  park:      '/models/park.glb',
  stadium:   '/models/stadium.glb',
};

const LEVEL_SCALES: Record<string, number> = {
  house: 0.25, apartment: 0.3, office: 0.4, park: 0.2, stadium: 0.25,
};

function GLBBuilding({ type, level, damaged }: { type: string; level: number; damaged: boolean }) {
  const { scene } = useGLTF(MODEL_PATHS[type] || '/models/house.glb');
  const ls = LEVEL_SCALES[type] || 0.25;
  const scale = 1.0 + (level - 1) * ls;

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(child => {
      if (child instanceof THREE.Mesh) {
        const m = (child.material as THREE.MeshStandardMaterial).clone();
        if (damaged) { m.color.multiplyScalar(0.45); m.emissive.set('#220000'); m.emissiveIntensity = 0.2; }
        child.material = m;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return c;
  }, [scene, damaged]);

  return <primitive object={cloned} scale={[scale, scale, scale]} />;
}

class GLBErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { error: boolean }
> {
  constructor(props: any) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}

function BuildingContent({ type, level, damaged, timeOfDay = 12 }: { type: string; level: number; damaged: boolean; timeOfDay?: number }) {
  const ProceduralMap: Record<string, React.ComponentType<{ level: number; damaged: boolean; timeOfDay?: number }>> = {
    house: House, apartment: Apartment, office: Office, park: Park, stadium: Stadium,
  };
  const Procedural = ProceduralMap[type] || House;
  
  // Always use procedural buildings since GLB models don't exist
  return <Procedural level={level} damaged={damaged} timeOfDay={timeOfDay} />;
}

// ─── Under-construction ───────────────────────────────────────────────────────
function UnderConstruction({ type }: { type: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.05;
    }
  });
  const h = { house: 2.5, apartment: 5, office: 8, park: 2, stadium: 4 }[type] || 3;
  return (
    <Float speed={1.5} floatIntensity={0.25}>
      <group ref={ref}>
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z], i) => (
          <mesh key={i} position={[x * 0.7, h / 2, z * 0.7]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, h, 4]} />
            <meshStandardMaterial color="#FF8C00" emissive="#FF8C00" emissiveIntensity={0.35}
              transparent opacity={0.9} />
          </mesh>
        ))}
        {Array.from({ length: Math.ceil(h) + 1 }).map((_, i) => (
          <mesh key={`p${i}`} position={[0, i * 1.0 + 0.1, 0]}>
            <boxGeometry args={[1.55, 0.055, 1.55]} />
            <meshStandardMaterial color="#FFB300" transparent opacity={0.55} wireframe />
          </mesh>
        ))}
        <mesh position={[0, h + 0.6, 0]}>
          <boxGeometry args={[1.7, 0.07, 0.07]} />
          <meshStandardMaterial color="#FF8C00" emissive="#FF8C00" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.85 - 0.07, h + 0.4, 0]}>
          <boxGeometry args={[0.07, 0.4, 0.07]} />
          <meshStandardMaterial color="#FF8C00" emissive="#FF8C00" emissiveIntensity={0.4} />
        </mesh>
        <pointLight position={[0, h, 0]} color="#FF8C00" intensity={0.7} distance={4} />
      </group>
    </Float>
  );
}

// ─── Ground + City Infrastructure ─────────────────────────────────────────────
function CityGround({ timeOfDay = 12 }: { timeOfDay?: number }) {
  // Create grass texture
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Base grass color that changes with time of day
    const hour = timeOfDay % 24;
    let baseGreen = '#2d5016';
    let accentGreen = '#4a7c23';
    
    if (hour >= 6 && hour < 18) {
      // Daytime - brighter greens
      baseGreen = '#4a7c23';
      accentGreen = '#6ba832';
    } else if (hour >= 18 && hour < 20) {
      // Evening - warmer greens
      baseGreen = '#3d6018';
      accentGreen = '#5a8c25';
    } else {
      // Night - darker greens
      baseGreen = '#1a3008';
      accentGreen = '#2d5016';
    }
    
    // Fill base color
    ctx.fillStyle = baseGreen;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grass texture with random patches
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 3 + 1;
      
      ctx.fillStyle = Math.random() > 0.5 ? accentGreen : baseGreen;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add some dirt patches
    ctx.fillStyle = '#8B4513';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 8 + 3;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
  }, [Math.floor(timeOfDay / 3)]); // Update every 3 hours
  
  // Create road texture
  const roadTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Dark asphalt base
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add some texture variation
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 2;
      
      ctx.fillStyle = `rgba(${40 + Math.random() * 20}, ${40 + Math.random() * 20}, ${40 + Math.random() * 20}, 0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }, []);

  return (
    <>
      {/* Large grass ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          map={grassTexture}
          roughness={0.9}
          metalness={0.0}
        />
      </mesh>

      {/* Elevated grass areas around the city */}
      {Array.from({ length: 4 }, (_, i) => { // Reduced from 8 to 4
        const angle = (i / 4) * Math.PI * 2;
        const radius = 60 + Math.random() * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const size = 15 + Math.random() * 10;
        
        return (
          <mesh 
            key={`grass-${i}`}
            rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]} 
            position={[x, 0.1, z]} 
            receiveShadow
          >
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial 
              map={grassTexture}
              roughness={0.8}
              metalness={0.0}
            />
          </mesh>
        );
      })}

      {/* Road network with better texture */}
      {[-3, -1, 1, 3].flatMap(i =>
        [false, true].map((vert, j) => (
          <mesh key={`road${i}${j}`}
            rotation={[-Math.PI / 2, 0, vert ? Math.PI / 2 : 0]}
            position={[vert ? i * 10 : 0, 0.001, vert ? 0 : i * 10]}>
            <planeGeometry args={[100, 2.5]} />
            <meshStandardMaterial 
              map={roadTexture}
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
        ))
      )}

      {/* Sidewalks */}
      {[-3, -1, 1, 3].flatMap(i =>
        [false, true].flatMap((vert) => [
          // Left sidewalk
          <mesh key={`sw-l${i}${vert}`}
            rotation={[-Math.PI / 2, 0, vert ? Math.PI / 2 : 0]}
            position={[
              vert ? i * 10 : -1.8, 
              0.002, 
              vert ? -1.8 : i * 10
            ]}>
            <planeGeometry args={[100, 0.8]} />
            <meshStandardMaterial color="#d3d3d3" roughness={0.7} />
          </mesh>,
          // Right sidewalk
          <mesh key={`sw-r${i}${vert}`}
            rotation={[-Math.PI / 2, 0, vert ? Math.PI / 2 : 0]}
            position={[
              vert ? i * 10 : 1.8, 
              0.002, 
              vert ? 1.8 : i * 10
            ]}>
            <planeGeometry args={[100, 0.8]} />
            <meshStandardMaterial color="#d3d3d3" roughness={0.7} />
          </mesh>
        ])
      )}

      {/* Road center lines */}
      {[-3, -1, 1, 3].flatMap(i =>
        [false, true].map((vert, j) => (
          <mesh key={`cl${i}${j}`}
            rotation={[-Math.PI / 2, 0, vert ? Math.PI / 2 : 0]}
            position={[vert ? i * 10 : 0, 0.003, vert ? 0 : i * 10]}>
            <planeGeometry args={[100, 0.08]} />
            <meshStandardMaterial 
              color="#FFFF00" 
              emissive="#FFFF00" 
              emissiveIntensity={0.1} 
              transparent 
              opacity={0.8} 
            />
          </mesh>
        ))
      )}

      {/* Add some decorative elements */}
      {/* Trees around the city */}
      {Array.from({ length: 8 }, (_, i) => { // Reduced from 15 to 8
        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 35 + Math.random() * 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 3 + Math.random() * 4;
        
        return (
          <group key={`tree-${i}`} position={[x, 0, z]}>
            {/* Tree trunk */}
            <mesh position={[0, height * 0.3, 0]}>
              <cylinderGeometry args={[0.2, 0.3, height * 0.6, 8]} />
              <meshStandardMaterial color="#8B4513" roughness={0.9} />
            </mesh>
            {/* Tree foliage */}
            <mesh position={[0, height * 0.8, 0]}>
              <sphereGeometry args={[height * 0.4, 8, 6]} />
              <meshStandardMaterial 
                color={timeOfDay >= 6 && timeOfDay < 18 ? "#228B22" : "#1a5a1a"} 
                roughness={0.8} 
              />
            </mesh>
          </group>
        );
      })}

      {/* Small flower patches */}
      {Array.from({ length: 10 }, (_, i) => { // Reduced from 20 to 10
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        // Avoid roads
        if (Math.abs(x % 10) < 2 || Math.abs(z % 10) < 2) return null;
        
        return (
          <group key={`flowers-${i}`} position={[x, 0.05, z]}>
            {Array.from({ length: 2 + Math.random() * 3 }, (_, j) => ( // Reduced flowers per patch
              <mesh 
                key={j}
                position={[
                  (Math.random() - 0.5) * 2,
                  0,
                  (Math.random() - 0.5) * 2
                ]}
              >
                <sphereGeometry args={[0.05, 6, 6]} />
                <meshStandardMaterial 
                  color={['#ff69b4', '#ffb6c1', '#ffd700', '#ff6347'][Math.floor(Math.random() * 4)]}
                  emissive={['#ff69b4', '#ffb6c1', '#ffd700', '#ff6347'][Math.floor(Math.random() * 4)]}
                  emissiveIntensity={0.2}
                />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Distant hills/terrain */}
      {Array.from({ length: 8 }, (_, i) => { // Reduced from 12 to 8
        const angle = (i / 8) * Math.PI * 2;
        const radius = 120 + Math.random() * 30;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 5 + Math.random() * 10;
        const width = 20 + Math.random() * 15;
        
        return (
          <mesh 
            key={`hill-${i}`}
            position={[x, height / 2, z]}
            rotation={[0, Math.random() * Math.PI, 0]}
          >
            <boxGeometry args={[width, height, width * 0.8]} />
            <meshStandardMaterial 
              color="#3d6018"
              roughness={0.9}
              metalness={0.0}
            />
          </mesh>
        );
      })}

      {/* Scattered rocks */}
      {Array.from({ length: 15 }, (_, i) => { // Reduced from 25 to 15
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        // Avoid roads and building areas
        if (Math.abs(x % 10) < 3 || Math.abs(z % 10) < 3) return null;
        if (Math.abs(x) < 15 && Math.abs(z) < 15) return null; // Avoid city center
        
        const size = 0.3 + Math.random() * 0.8;
        
        return (
          <mesh 
            key={`rock-${i}`}
            position={[x, size * 0.3, z]}
            rotation={[
              Math.random() * 0.3,
              Math.random() * Math.PI * 2,
              Math.random() * 0.3
            ]}
          >
            <boxGeometry args={[size, size * 0.6, size * 0.8]} />
            <meshStandardMaterial 
              color="#696969"
              roughness={0.95}
              metalness={0.0}
            />
          </mesh>
        );
      })}
    </>
  );
}

function StreetLamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 4.4, 5]} />
        <meshStandardMaterial color="#455A64" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.25, 4.3, 0]} rotation={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.025, 0.03, 0.55, 4]} />
        <meshStandardMaterial color="#546E7A" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.42, 4.35, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#FFFDE7" emissive="#FFF9C4" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0.42, 4.3, 0]} color="#FFF8E1" intensity={0.7} distance={14} decay={2} />
    </group>
  );
}

function TerritoryBoundary({ size }: { size: number }) {
  const ref = useRef<THREE.LineLoop>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const half = Math.min(Math.sqrt(size) * 0.82, 38);

  useFrame(({ clock }, delta) => {
    if (materialRef.current) {
      // Use delta time for smoother animation and reduce frequency
      const time = clock.elapsedTime * 0.8; // Slower animation
      materialRef.current.opacity = 0.4 + Math.sin(time) * 0.15; // Reduced amplitude
    }
  });

  const pts = useMemo(() => {
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const x = Math.sign(Math.cos(t)) * Math.min(Math.abs(half / Math.cos(t)), half);
      const z = Math.sign(Math.sin(t)) * Math.min(Math.abs(half / Math.sin(t)), half);
      p.push(new THREE.Vector3(x, 0.12, z));
    }
    return p;
  }, [half]);

  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), [pts]);

  return (
    <>
      <lineLoop ref={ref} geometry={geo}>
        <lineBasicMaterial ref={materialRef} color="#00F5FF" transparent opacity={0.55} />
      </lineLoop>
      {/* Inner glow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <planeGeometry args={[half * 2, half * 2]} />
        <meshStandardMaterial color="#00F5FF" transparent opacity={0.02} roughness={1} />
      </mesh>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function City3D({
  buildings,
  territorySize = 100,
  timeOfDay = 12,
  sunIntensity = 1,
  placementMode = null,
  isDragMode = false,
  onBuildingPlace,
  onBuildingMove,
  onPlacementCancel,
}: {
  buildings: BuildingData[];
  territorySize?: number;
  timeOfDay?: number;
  sunIntensity?: number;
  placementMode?: string | null;
  isDragMode?: boolean;
  onBuildingPlace?: (position: { x: number, z: number }) => void;
  onBuildingMove?: (buildingId: string, position: { x: number, z: number }) => void;
  onPlacementCancel?: () => void;
}) {
  return (
    <group>
      <CityGround timeOfDay={timeOfDay} />
      <TerritoryBoundary size={territorySize} />

      {/* Street lamps at intersections */}
      {[-10, 0, 10].flatMap(x => [-10, 0, 10].map(z => (
        <StreetLamp key={`l${x}${z}`} x={x + 1.2} z={z + 1.2} />
      )))}

      {/* Buildings */}
      {buildings.map(b => (
        <DraggableBuilding
          key={b.id}
          buildingId={b.id}
          initialPosition={[b.position_x, b.position_y, b.position_z]}
          onMove={onBuildingMove || (() => {})}
          territorySize={territorySize}
          isDragMode={isDragMode}
        >
          {b.status === 'under_construction'
            ? <UnderConstruction type={b.type} />
            : <BuildingContent type={b.type} level={b.level} damaged={b.status === 'damaged'} timeOfDay={timeOfDay} />
          }
          {/* Damage pulse ring on ground */}
          {b.status === 'damaged' && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <ringGeometry args={[1.5, 2.0, 32]} />
              <meshStandardMaterial color="#FF0040" emissive="#FF0040" emissiveIntensity={0.6}
                transparent opacity={0.25} />
            </mesh>
          )}
        </DraggableBuilding>
      ))}

      {/* Building placement mode */}
      {placementMode && onBuildingPlace && onPlacementCancel && (
        <BuildingPlacer
          buildingType={placementMode}
          onPlace={onBuildingPlace}
          onCancel={onPlacementCancel}
          territorySize={territorySize}
        />
      )}
    </group>
  );
}

// GLB models are disabled - using procedural buildings only
