import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CitySkyProps {
  isDay: boolean;
}

// Sky dome with gradient shader
function SkyDome({ isDay }: { isDay: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor:    { value: new THREE.Color(isDay ? 0x1a8fff : 0x020818) },
        bottomColor: { value: new THREE.Color(isDay ? 0x87ceeb : 0x0a1a3a) },
        horizonColor:{ value: new THREE.Color(isDay ? 0xffd580 : 0x1a2a6c) },
        offset:      { value: 0.3 },
        exponent:    { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = max(0.0, h);
          float b = max(0.0, -h + offset);
          vec3 sky = mix(horizonColor, topColor, pow(t, exponent));
          sky = mix(sky, bottomColor, pow(b, exponent));
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }, [isDay]);

  // Update colors when mode changes
  useMemo(() => {
    if (isDay) {
      material.uniforms.topColor.value.set(0x1a8fff);
      material.uniforms.bottomColor.value.set(0x87ceeb);
      material.uniforms.horizonColor.value.set(0xffd580);
    } else {
      material.uniforms.topColor.value.set(0x020818);
      material.uniforms.bottomColor.value.set(0x0a1a3a);
      material.uniforms.horizonColor.value.set(0x1a2a6c);
    }
  }, [isDay, material]);

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[180, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Sun with glow rings
function Sun({ visible }: { visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef  = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
      glowRef.current.scale.setScalar(s);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[60, 55, -80]}>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[9, 16, 16]} />
        <meshBasicMaterial color="#ffe066" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      {/* Mid glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[6.5, 16, 16]} />
        <meshBasicMaterial color="#ffcc00" transparent opacity={0.25} />
      </mesh>
      {/* Core */}
      <mesh>
        <sphereGeometry args={[4.5, 24, 24]} />
        <meshStandardMaterial color="#fff5a0" emissive="#ffdd00" emissiveIntensity={2.5} />
      </mesh>
    </group>
  );
}

// Moon with subtle craters
function Moon({ visible }: { visible: boolean }) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 0.5) * 0.03;
      glowRef.current.scale.setScalar(s);
    }
  });

  if (!visible) return null;

  return (
    <group position={[-55, 60, -75]}>
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#c8d8ff" transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
      {/* Surface */}
      <mesh>
        <sphereGeometry args={[3.8, 24, 24]} />
        <meshStandardMaterial color="#d8e0f0" emissive="#8899cc" emissiveIntensity={0.4} roughness={0.9} />
      </mesh>
      {/* Craters */}
      <mesh position={[1.2, 0.8, 3.6]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#b0b8cc" />
      </mesh>
      <mesh position={[-1.0, -0.6, 3.6]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial color="#b0b8cc" />
      </mesh>
      <mesh position={[0.2, 1.5, 3.5]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#b0b8cc" />
      </mesh>
    </group>
  );
}

// Twinkling stars
function Stars({ visible }: { visible: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef    = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 160;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(Math.random() * 2 - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // upper hemisphere only
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (matRef.current && visible) {
      matRef.current.opacity = 0.7 + Math.sin(clock.elapsedTime * 1.5) * 0.2;
    }
  });

  if (!visible) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial ref={matRef} color="#ffffff" size={0.55} transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

// Clouds (day only)
function Clouds({ visible }: { visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const clouds = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: (Math.random() - 0.5) * 160,
    y: 28 + Math.random() * 18,
    z: (Math.random() - 0.5) * 160,
    sx: 1.2 + Math.random() * 1.4,
    sy: 0.5 + Math.random() * 0.4,
    sz: 0.8 + Math.random() * 0.8,
    speed: 0.008 + Math.random() * 0.006,
  })), []);

  useFrame(() => {
    if (!groupRef.current || !visible) return;
    groupRef.current.children.forEach((c, i) => {
      c.position.x += clouds[i].speed;
      if (c.position.x > 90) c.position.x = -90;
    });
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          {/* Each cloud = 3 overlapping spheres */}
          <mesh scale={[c.sx * 1.0, c.sy, c.sz]}>
            <sphereGeometry args={[5, 10, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.82} roughness={1} />
          </mesh>
          <mesh position={[4, 1.5, 0]} scale={[c.sx * 0.7, c.sy * 0.8, c.sz * 0.7]}>
            <sphereGeometry args={[4, 10, 8]} />
            <meshStandardMaterial color="#f0f4ff" transparent opacity={0.75} roughness={1} />
          </mesh>
          <mesh position={[-3.5, 1, 0]} scale={[c.sx * 0.6, c.sy * 0.7, c.sz * 0.6]}>
            <sphereGeometry args={[3.5, 10, 8]} />
            <meshStandardMaterial color="#f8faff" transparent opacity={0.7} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Horizon glow strip
function HorizonGlow({ isDay }: { isDay: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <ringGeometry args={[60, 130, 64]} />
      <meshBasicMaterial
        color={isDay ? '#ffd580' : '#1a2a6c'}
        transparent
        opacity={isDay ? 0.18 : 0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function CitySky({ isDay }: CitySkyProps) {
  return (
    <group>
      <SkyDome isDay={isDay} />
      <HorizonGlow isDay={isDay} />
      <Sun visible={isDay} />
      <Moon visible={!isDay} />
      <Stars visible={!isDay} />
      <Clouds visible={isDay} />
    </group>
  );
}
