import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface BuildingPlacerProps {
  buildingType: string;
  onPlace: (position: { x: number, z: number }) => void;
  onCancel: () => void;
  territorySize: number;
}

export default function BuildingPlacer({ 
  buildingType, 
  onPlace, 
  onCancel, 
  territorySize 
}: BuildingPlacerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [isValidPosition, setIsValidPosition] = useState(true);
  const { camera, raycaster, pointer, scene } = useThree();

  // Territory boundary
  const territoryRadius = Math.min(Math.sqrt(territorySize) * 0.82, 38);

  useFrame(() => {
    if (!groupRef.current) return;

    // Update raycaster
    raycaster.setFromCamera(pointer, camera);
    
    // Create a ground plane for intersection
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
      // Snap to grid
      const gridSize = 2;
      const snappedX = Math.round(intersectionPoint.x / gridSize) * gridSize;
      const snappedZ = Math.round(intersectionPoint.z / gridSize) * gridSize;
      
      // Check if position is within territory bounds
      const distance = Math.sqrt(snappedX * snappedX + snappedZ * snappedZ);
      const withinBounds = distance <= territoryRadius - 2; // Leave some margin
      
      setPosition(new THREE.Vector3(snappedX, 0.1, snappedZ));
      setIsValidPosition(withinBounds);
      
      groupRef.current.position.set(snappedX, 0.1, snappedZ);
    }
  });

  const handleClick = useCallback(() => {
    if (isValidPosition) {
      onPlace({ x: position.x, z: position.z });
    }
  }, [isValidPosition, position, onPlace]);

  const handleRightClick = useCallback((e: any) => {
    e.stopPropagation();
    onCancel();
  }, [onCancel]);

  // Get building preview based on type
  const getBuildingPreview = () => {
    const color = isValidPosition ? '#00ff00' : '#ff0000';
    const opacity = 0.6;

    switch (buildingType) {
      case 'house':
        return (
          <group>
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[2, 1, 2]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <coneGeometry args={[1.5, 0.8, 4]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
          </group>
        );
      case 'apartment':
        return (
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[2.5, 3, 2.5]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      case 'office':
        return (
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[3, 4, 3]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      case 'park':
        return (
          <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <circleGeometry args={[2.5, 16]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[0.3, 1, 6]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} />
            </mesh>
          </group>
        );
      case 'stadium':
        return (
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[4, 4, 2, 16]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      default:
        return (
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[2, 1, 2]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onContextMenu={handleRightClick}
    >
      {getBuildingPreview()}
      
      {/* Grid indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial 
          color={isValidPosition ? '#ffffff' : '#ff0000'} 
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Position indicator lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              -1, 0.01, 0, 1, 0.01, 0,  // X axis
              0, 0.01, -1, 0, 0.01, 1   // Z axis
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={isValidPosition ? '#00ff00' : '#ff0000'} />
      </lineSegments>
    </group>
  );
}