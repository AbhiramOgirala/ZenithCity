import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface DynamicLightingProps {
  timeOfDay: number;
  sunIntensity: number;
  moonIntensity: number;
  sunPosition: THREE.Vector3;
  moonPosition: THREE.Vector3;
}

export default function DynamicLighting({ 
  timeOfDay, 
  sunIntensity, 
  moonIntensity, 
  sunPosition, 
  moonPosition 
}: DynamicLightingProps) {
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);
  
  useEffect(() => {
    // Update sun light
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunPosition);
      sunLightRef.current.intensity = sunIntensity * 1.5;
      
      // Sun color changes throughout the day
      const hour = timeOfDay % 24;
      if (hour >= 5 && hour < 7) {
        // Dawn - orange/red
        sunLightRef.current.color.setHex(0xffa500);
      } else if (hour >= 7 && hour < 17) {
        // Day - white/yellow
        sunLightRef.current.color.setHex(0xffffff);
      } else if (hour >= 17 && hour < 19) {
        // Sunset - orange/red
        sunLightRef.current.color.setHex(0xff6347);
      } else {
        // Night - no sun
        sunLightRef.current.intensity = 0;
      }
      
      // Update shadow camera to follow sun
      if (sunLightRef.current.shadow.camera) {
        sunLightRef.current.shadow.camera.updateProjectionMatrix();
      }
    }
    
    // Update moon light
    if (moonLightRef.current) {
      moonLightRef.current.position.copy(moonPosition);
      moonLightRef.current.intensity = moonIntensity * 0.3;
      moonLightRef.current.color.setHex(0xe6e6fa); // Lavender
    }
    
    // Update ambient light based on time of day
    if (ambientLightRef.current) {
      const hour = timeOfDay % 24;
      if (hour >= 6 && hour < 18) {
        // Day
        ambientLightRef.current.intensity = 0.4;
        ambientLightRef.current.color.setHex(0xffffff);
      } else if (hour >= 18 && hour < 22) {
        // Evening
        ambientLightRef.current.intensity = 0.2;
        ambientLightRef.current.color.setHex(0x4169e1);
      } else {
        // Night
        ambientLightRef.current.intensity = 0.1;
        ambientLightRef.current.color.setHex(0x191970);
      }
    }
    
    // Update hemisphere light
    if (hemisphereRef.current) {
      const hour = timeOfDay % 24;
      if (hour >= 6 && hour < 18) {
        // Day
        hemisphereRef.current.intensity = 0.8;
        hemisphereRef.current.color.setHex(0x87ceeb); // Sky blue
        hemisphereRef.current.groundColor.setHex(0x4a7c23); // Grass green
      } else if (hour >= 18 && hour < 22) {
        // Evening
        hemisphereRef.current.intensity = 0.5;
        hemisphereRef.current.color.setHex(0x4169e1); // Royal blue
        hemisphereRef.current.groundColor.setHex(0x2d5016); // Darker grass
      } else {
        // Night
        hemisphereRef.current.intensity = 0.3;
        hemisphereRef.current.color.setHex(0x0a0a2e); // Dark blue
        hemisphereRef.current.groundColor.setHex(0x1a3008); // Very dark grass
      }
    }
  }, [timeOfDay, sunIntensity, moonIntensity, sunPosition, moonPosition]);
  
  return (
    <>
      {/* Sun light */}
      <directionalLight
        ref={sunLightRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0001}
      />
      
      {/* Moon light */}
      <directionalLight
        ref={moonLightRef}
        castShadow={false}
      />
      
      {/* Ambient light */}
      <ambientLight ref={ambientLightRef} />
      
      {/* Hemisphere light */}
      <hemisphereLight ref={hemisphereRef} />
      
      {/* City accent lights (always on but dimmer during day) */}
      <pointLight 
        position={[-18, 12, -12]} 
        color="#00F5FF" 
        intensity={0.8 + (1 - sunIntensity) * 0.4} 
        distance={45} 
      />
      <pointLight 
        position={[18, 8, 12]} 
        color="#B24BF3" 
        intensity={0.6 + (1 - sunIntensity) * 0.3} 
        distance={40} 
      />
      
      {/* Ground-level ambient lights for grass visibility */}
      <pointLight 
        position={[0, 5, 0]} 
        color="#ffffff" 
        intensity={sunIntensity * 0.3 + moonIntensity * 0.2} 
        distance={80} 
      />
      <pointLight 
        position={[-30, 3, -30]} 
        color="#4a7c23" 
        intensity={0.2} 
        distance={60} 
      />
      <pointLight 
        position={[30, 3, 30]} 
        color="#4a7c23" 
        intensity={0.2} 
        distance={60} 
      />
    </>
  );
}