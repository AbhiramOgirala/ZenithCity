import { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DraggableBuildingProps {
  children: React.ReactNode;
  buildingId: string;
  initialPosition: [number, number, number];
  onMove: (buildingId: string, position: { x: number, z: number }) => void;
  territorySize: number;
  isDragMode: boolean;
}

export default function DraggableBuilding({
  children,
  buildingId,
  initialPosition,
  onMove,
  territorySize,
  isDragMode
}: DraggableBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [position, setPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(initialPosition[0], initialPosition[1], initialPosition[2])
  );
  const { camera, raycaster, pointer } = useThree();

  // Territory boundary
  const territoryRadius = Math.min(Math.sqrt(territorySize) * 0.82, 38);

  const handlePointerDown = useCallback((event: any) => {
    if (!isDragMode) return;
    
    event.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    document.body.style.cursor = 'grabbing';
  }, [isDragMode]);

  const handlePointerMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !dragStart || !groupRef.current) return;

    const deltaX = (event.clientX - dragStart.x) * 0.02;
    const deltaZ = (event.clientY - dragStart.y) * 0.02;

    // Calculate new position
    const newX = initialPosition[0] + deltaX;
    const newZ = initialPosition[2] + deltaZ;

    // Snap to grid
    const gridSize = 2;
    const snappedX = Math.round(newX / gridSize) * gridSize;
    const snappedZ = Math.round(newZ / gridSize) * gridSize;

    // Check bounds
    const distance = Math.sqrt(snappedX * snappedX + snappedZ * snappedZ);
    const withinBounds = distance <= territoryRadius - 2;

    if (withinBounds) {
      const newPos = new THREE.Vector3(snappedX, initialPosition[1], snappedZ);
      setPosition(newPos);
      groupRef.current.position.copy(newPos);
    }
  }, [isDragging, dragStart, initialPosition, territoryRadius]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging || !groupRef.current) return;

    setIsDragging(false);
    setDragStart(null);
    document.body.style.cursor = isDragMode ? 'grab' : 'default';

    // Finalize position
    const finalPos = groupRef.current.position;
    onMove(buildingId, { x: finalPos.x, z: finalPos.z });
  }, [isDragging, isDragMode, buildingId, onMove]);

  // Add global event listeners for mouse move and up
  useFrame(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handlePointerMove(e);
      const handleMouseUp = () => handlePointerUp();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  });

  const handlePointerOver = useCallback(() => {
    if (isDragMode && !isDragging) {
      document.body.style.cursor = 'grab';
    }
  }, [isDragMode, isDragging]);

  const handlePointerOut = useCallback(() => {
    if (!isDragging) {
      document.body.style.cursor = 'default';
    }
  }, [isDragging]);

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {children}
      
      {/* Drag indicator */}
      {isDragMode && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[2, 2.2, 16]} />
          <meshBasicMaterial 
            color="#00ff00" 
            transparent 
            opacity={isDragging ? 0.8 : 0.4}
          />
        </mesh>
      )}
      
      {/* Dragging highlight */}
      {isDragging && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[4, 4]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.1}
          />
        </mesh>
      )}
    </group>
  );
}