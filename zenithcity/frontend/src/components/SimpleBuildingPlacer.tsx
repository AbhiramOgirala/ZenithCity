import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SimpleBuildingPlacerProps {
  buildingType: string;
  onPlace: (position: { x: number, z: number }) => void;
  onCancel: () => void;
}

export default function SimpleBuildingPlacer({ 
  buildingType, 
  onPlace, 
  onCancel
}: SimpleBuildingPlacerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [position, setPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const { camera, raycaster, pointer } = useThree();

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
      
      setPosition(new THREE.Vector3(snappedX, 0.1, snappedZ));
      groupRef.current.position.set(snappedX, 0.1, snappedZ);
    }
  });

  const handleClick = useCallback((event: any) => {
    event.stopPropagation();
    console.log('Placing building at:', { x: position.x, z: position.z });
    onPlace({ x: position.x, z: position.z });
  }, [position, onPlace]);

  const handleRightClick = useCallback((event: any) => {
    event.stopPropagation();
    event.preventDefault();
    onCancel();
  }, [onCancel]);

  // Simple building preview
  const getBuildingPreview = () => {
    const color = '#00ff00';
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
      
      {/* Simple grid indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Position indicator */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              -1, 0.01, 0, 1, 0.01, 0,
              0, 0.01, -1, 0, 0.01, 1
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff00" />
      </lineSegments>
    </group>
  );
}