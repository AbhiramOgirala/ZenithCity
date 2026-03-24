import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SkySystemProps {
  onLightingChange?: (timeOfDay: number, sunIntensity: number, moonIntensity: number) => void;
}

// Calculate sun position based on time of day (0-24 hours)
function calculateSunPosition(timeOfDay: number) {
  // Sun rises at 6 AM, sets at 6 PM (simplified)
  const sunAngle = ((timeOfDay - 6) / 12) * Math.PI; // 0 to PI over 12 hours
  const sunElevation = Math.sin(sunAngle) * 0.8; // Max elevation of 0.8
  const sunAzimuth = sunAngle - Math.PI / 2; // Offset for proper positioning
  
  const x = Math.cos(sunAzimuth) * Math.cos(sunElevation) * 50;
  const y = Math.sin(sunElevation) * 50;
  const z = Math.sin(sunAzimuth) * Math.cos(sunElevation) * 50;
  
  return new THREE.Vector3(x, Math.max(y, -10), z);
}

// Calculate moon position (opposite to sun, with some offset)
function calculateMoonPosition(timeOfDay: number) {
  const moonAngle = ((timeOfDay - 18) / 12) * Math.PI; // Moon rises at 6 PM
  const moonElevation = Math.sin(moonAngle) * 0.6; // Lower than sun
  const moonAzimuth = moonAngle - Math.PI / 2;
  
  const x = Math.cos(moonAzimuth) * Math.cos(moonElevation) * 45;
  const y = Math.sin(moonElevation) * 45;
  const z = Math.sin(moonAzimuth) * Math.cos(moonElevation) * 45;
  
  return new THREE.Vector3(x, Math.max(y, -8), z);
}

// Get sky colors based on time of day
function getSkyColors(timeOfDay: number) {
  const hour = timeOfDay % 24;
  
  // Define color stops for different times
  if (hour >= 5 && hour < 7) {
    // Dawn
    const t = (hour - 5) / 2;
    return {
      topColor: new THREE.Color().lerpColors(
        new THREE.Color(0x0a0a2e), // Dark blue
        new THREE.Color(0x87ceeb), // Sky blue
        t
      ),
      bottomColor: new THREE.Color().lerpColors(
        new THREE.Color(0x2d5016), // Dark grass green
        new THREE.Color(0x6ba832), // Bright grass green
        t
      ),
      fogColor: new THREE.Color().lerpColors(
        new THREE.Color(0x1a3008), // Dark green
        new THREE.Color(0xffa500), // Orange
        t
      )
    };
  } else if (hour >= 7 && hour < 17) {
    // Day
    return {
      topColor: new THREE.Color(0x87ceeb), // Sky blue
      bottomColor: new THREE.Color(0x6ba832), // Bright grass green
      fogColor: new THREE.Color(0xb0e0e6) // Light blue
    };
  } else if (hour >= 17 && hour < 19) {
    // Sunset
    const t = (hour - 17) / 2;
    return {
      topColor: new THREE.Color().lerpColors(
        new THREE.Color(0x87ceeb),
        new THREE.Color(0x2e0a2e), // Dark purple
        t
      ),
      bottomColor: new THREE.Color().lerpColors(
        new THREE.Color(0x6ba832), // Bright grass
        new THREE.Color(0x2d5016), // Dark grass
        t
      ),
      fogColor: new THREE.Color().lerpColors(
        new THREE.Color(0xff6347), // Tomato
        new THREE.Color(0x2e0a2e),
        t
      )
    };
  } else {
    // Night
    return {
      topColor: new THREE.Color(0x0a0a2e), // Dark blue
      bottomColor: new THREE.Color(0x1a3008), // Very dark grass
      fogColor: new THREE.Color(0x0a0a2e)
    };
  }
}

function Sun({ position, intensity }: { position: THREE.Vector3; intensity: number }) {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (sunRef.current && glowRef.current) {
      // Gentle pulsing effect with delta time
      const time = state.clock.elapsedTime * 0.3; // Slower pulsing
      const pulse = Math.sin(time) * 0.05 + 1; // Reduced amplitude
      sunRef.current.scale.setScalar(pulse);
      glowRef.current.scale.setScalar(pulse * 1.2); // Reduced glow multiplier
    }
  });
  
  if (intensity <= 0) return null;
  
  return (
    <group position={position}>
      {/* Sun glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial 
          color="#ffff00" 
          transparent 
          opacity={intensity * 0.3}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Sun core */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial 
          color="#ffff00" 
          emissive="#ffaa00"
          emissiveIntensity={intensity}
        />
      </mesh>
      
      {/* Sun rays */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh 
          key={i} 
          rotation={[0, 0, (i * Math.PI) / 4]}
          position={[0, 0, 0]}
        >
          <planeGeometry args={[0.2, 8]} />
          <meshBasicMaterial 
            color="#ffff00" 
            transparent 
            opacity={intensity * 0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

function Moon({ position, intensity }: { position: THREE.Vector3; intensity: number }) {
  const moonRef = useRef<THREE.Mesh>(null);
  
  if (intensity <= 0) return null;
  
  return (
    <group position={position}>
      {/* Moon glow */}
      <mesh>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial 
          color="#e6e6fa" 
          transparent 
          opacity={intensity * 0.2}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Moon surface */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial 
          color="#f5f5dc" 
          emissive="#e6e6fa"
          emissiveIntensity={intensity * 0.5}
        />
      </mesh>
      
      {/* Moon craters (simple dark spots) */}
      <mesh position={[0.3, 0.2, 1.15]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#d3d3d3" />
      </mesh>
      <mesh position={[-0.2, -0.3, 1.15]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#d3d3d3" />
      </mesh>
    </group>
  );
}

function Stars({ intensity }: { intensity: number }) {
  const starsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  const starGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(500 * 3); // Reduced from 1000 to 500
    
    for (let i = 0; i < 500; i++) {
      // Random positions on a sphere
      const radius = 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
  
  useFrame((state, delta) => {
    if (materialRef.current) {
      // Gentle twinkling with slower frequency
      const time = state.clock.elapsedTime * 1.2; // Slower twinkling
      materialRef.current.opacity = intensity * (0.8 + Math.sin(time) * 0.15); // Reduced amplitude
    }
  });
  
  return (
    <points ref={starsRef} geometry={starGeometry}>
      <pointsMaterial 
        ref={materialRef}
        color="#ffffff" 
        size={0.5} 
        transparent 
        opacity={intensity}
      />
    </points>
  );
}

function SkyDome({ colors }: { colors: { topColor: THREE.Color; bottomColor: THREE.Color } }) {
  const skyRef = useRef<THREE.Mesh>(null);
  
  const skyGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(200, 32, 32); // Larger sphere
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const normalizedY = Math.max(0, (y + 200) / 400); // Normalize to 0-1, clamp bottom
      
      // Create gradient from bottom to top
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0x1a3008), // Dark green at bottom (ground level)
        new THREE.Color(0x0a0a2e), // Dark blue at top
        normalizedY
      );
      
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, []);
  
  useEffect(() => {
    if (skyRef.current) {
      const geometry = skyRef.current.geometry as THREE.SphereGeometry;
      const colorAttribute = geometry.attributes.color as THREE.BufferAttribute;
      const positions = geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const y = positions[i + 1];
        const normalizedY = Math.max(0, (y + 200) / 400);
        
        // Blend between ground color and sky color
        const groundColor = new THREE.Color(0x2d5016); // Grass green
        const color = new THREE.Color().lerpColors(
          groundColor, 
          colors.topColor, 
          Math.pow(normalizedY, 0.7) // Curve the gradient
        );
        
        // If below horizon, use ground color
        if (y < -10) {
          color.copy(groundColor);
        }
        
        colorAttribute.setXYZ(i / 3, color.r, color.g, color.b);
      }
      
      colorAttribute.needsUpdate = true;
    }
  }, [colors]);
  
  return (
    <mesh ref={skyRef} geometry={skyGeometry}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} />
    </mesh>
  );
}

function AtmosphericParticles({ timeOfDay }: { timeOfDay: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array>();

  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(50 * 3); // Reduced from 200 to 50
    const velocities = new Float32Array(50 * 3);

    for (let i = 0; i < 50; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    velocitiesRef.current = velocities;
    return geometry;
  }, []);

  useFrame((state, delta) => {
    if (particlesRef.current && velocitiesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const velocities = velocitiesRef.current;

      // Use delta time for frame-rate independent animation
      const deltaMultiplier = Math.min(delta * 60, 2); // Cap at 2x for stability

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * deltaMultiplier;
        positions[i + 1] += velocities[i + 1] * deltaMultiplier;
        positions[i + 2] += velocities[i + 2] * deltaMultiplier;

        // Reset particles that go too far
        if (positions[i] > 50) positions[i] = -50;
        if (positions[i] < -50) positions[i] = 50;
        if (positions[i + 1] > 50) positions[i + 1] = 0;
        if (positions[i + 2] > 50) positions[i + 2] = -50;
        if (positions[i + 2] < -50) positions[i + 2] = 50;
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const hour = timeOfDay % 24;
  const particleOpacity = hour >= 6 && hour < 18 ? 0.1 : 0.05;

  return (
    <points ref={particlesRef} geometry={particleGeometry}>
      <pointsMaterial
        color="#ffffff"
        size={0.2}
        transparent
        opacity={particleOpacity}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}


function Clouds({ timeOfDay }: { timeOfDay: number }) {
  const cloudsRef = useRef<THREE.Group>(null);
  
  const cloudPositions = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({ // Reduced from 12 to 6
      x: (Math.random() - 0.5) * 200,
      y: 20 + Math.random() * 15,
      z: (Math.random() - 0.5) * 200,
      scale: 0.8 + Math.random() * 0.4,
      speed: 0.1 + Math.random() * 0.05
    }));
  }, []);
  
  useFrame((state, delta) => {
    if (cloudsRef.current) {
      // Use delta time for frame-rate independent animation
      const deltaMultiplier = Math.min(delta * 60, 2);
      
      cloudsRef.current.children.forEach((cloud, i) => {
        cloud.position.x += cloudPositions[i].speed * 0.1 * deltaMultiplier;
        if (cloud.position.x > 100) cloud.position.x = -100;
      });
    }
  });
  
  const hour = timeOfDay % 24;
  const cloudOpacity = hour >= 6 && hour < 18 ? 0.6 : 0.3;
  
  return (
    <group ref={cloudsRef}>
      {cloudPositions.map((pos, i) => (
        <mesh key={i} position={[pos.x, pos.y, pos.z]} scale={pos.scale}>
          <sphereGeometry args={[3, 8, 6]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={cloudOpacity}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function SkySystem({ onLightingChange }: SkySystemProps) {
  const [currentTime, setCurrentTime] = useState(new Date().getHours() + new Date().getMinutes() / 60);
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours() + now.getMinutes() / 60);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const { sunPosition, moonPosition, sunIntensity, moonIntensity, skyColors } = useMemo(() => {
    const sunPos = calculateSunPosition(currentTime);
    const moonPos = calculateMoonPosition(currentTime);
    
    // Calculate intensities based on elevation
    const sunInt = Math.max(0, Math.min(1, sunPos.y / 40)); // Sun intensity based on height
    const moonInt = Math.max(0, Math.min(1, moonPos.y / 35)); // Moon intensity
    
    const colors = getSkyColors(currentTime);
    
    return {
      sunPosition: sunPos,
      moonPosition: moonPos,
      sunIntensity: sunInt,
      moonIntensity: moonInt,
      skyColors: colors
    };
  }, [currentTime]);
  
  // Notify parent of lighting changes
  useEffect(() => {
    onLightingChange?.(currentTime, sunIntensity, moonIntensity);
  }, [currentTime, sunIntensity, moonIntensity, onLightingChange]);
  
  const starIntensity = Math.max(0, 1 - sunIntensity); // Stars visible when sun is down
  
  return (
    <group>
      {/* Sky dome */}
      <SkyDome colors={skyColors} />
      
      {/* Atmospheric particles */}
      <AtmosphericParticles timeOfDay={currentTime} />
      
      {/* Clouds */}
      <Clouds timeOfDay={currentTime} />
      
      {/* Sun */}
      <Sun position={sunPosition} intensity={sunIntensity} />
      
      {/* Moon */}
      <Moon position={moonPosition} intensity={moonIntensity} />
      
      {/* Stars */}
      <Stars intensity={starIntensity} />
      
      {/* Fog */}
      <fog attach="fog" color={skyColors.fogColor} near={50} far={180} />
    </group>
  );
}