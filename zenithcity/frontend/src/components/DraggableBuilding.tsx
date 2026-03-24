import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DraggableBuildingProps {
  children: React.ReactNode;
  buildingId: string;
  initialPosition: [number, number, number];
  onMove: (buildingId: string, position: { x: number, z: number }) => void;
  territorySize: number;
  isDragMode: boolean;
  existingBuildings: Array<{ id: string; position_x: number; position_z: number; type: string }>;
  buildingType: string;
}

export default function DraggableBuilding({
  children,
  buildingId,
  initialPosition,
  onMove,
  territorySize,
  isDragMode,
  existingBuildings,
  buildingType
}: DraggableBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, worldX: number, worldZ: number } | null>(null);
  const [position, setPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(initialPosition[0], initialPosition[1], initialPosition[2])
  );
  const { camera, raycaster, pointer } = useThree();

  // Territory boundary
  const territoryRadius = Math.min(Math.sqrt(territorySize) * 0.82, 38);

  // Get building size based on type (made slightly smaller for easier placement)
  const getBuildingSize = (type: string) => {
    switch (type) {
      case 'house': return { width: 1.8, depth: 1.8 };
      case 'apartment': return { width: 2.3, depth: 2.3 };
      case 'office': return { width: 2.8, depth: 2.8 };
      case 'park': return { width: 4.5, depth: 4.5 };
      case 'stadium': return { width: 7.5, depth: 7.5 };
      default: return { width: 1.8, depth: 1.8 };
    }
  };

  // Check if position collides with other buildings (excluding self)
  const checkCollision = (x: number, z: number) => {
    const currentSize = getBuildingSize(buildingType);
    const currentHalfWidth = currentSize.width / 2;
    const currentHalfDepth = currentSize.depth / 2;

    return existingBuildings.some(building => {
      // Skip self
      if (building.id === buildingId) return false;

      const existingSize = getBuildingSize(building.type);
      const existingHalfWidth = existingSize.width / 2;
      const existingHalfDepth = existingSize.depth / 2;

      // Calculate distance between centers
      const deltaX = Math.abs(x - building.position_x);
      const deltaZ = Math.abs(z - building.position_z);

      // Check if bounding boxes overlap (with small margin for safety)
      const margin = 0.5;
      return deltaX < (currentHalfWidth + existingHalfWidth + margin) && 
             deltaZ < (currentHalfDepth + existingHalfDepth + margin);
    });
  };

  const handlePointerDown = useCallback((event: any) => {
    if (!isDragMode) return;
    
    event.stopPropagation();
    setIsDragging(true);
    setDragStart({ 
      x: event.clientX || event.point.x, 
      y: event.clientY || event.point.y,
      worldX: position.x,
      worldZ: position.z
    });
    document.body.style.cursor = 'grabbing';
  }, [isDragMode, position]);

  // Handle mouse movement during drag
  useEffect(() => {
    if (!isDragging || !dragStart || !groupRef.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = (event.clientX - dragStart.x) * 0.02;
      const deltaZ = (event.clientY - dragStart.y) * 0.02;

      // Calculate new position
      const newX = dragStart.worldX + deltaX;
      const newZ = dragStart.worldZ + deltaZ;

      // Snap to grid
      const gridSize = 2;
      const snappedX = Math.round(newX / gridSize) * gridSize;
      const snappedZ = Math.round(newZ / gridSize) * gridSize;

      // Check bounds
      const distance = Math.sqrt(snappedX * snappedX + snappedZ * snappedZ);
      const withinBounds = distance <= territoryRadius - 2;

      // Check for collisions with other buildings
      const hasCollision = checkCollision(snappedX, snappedZ);

      if (withinBounds && !hasCollision) {
        const newPos = new THREE.Vector3(snappedX, initialPosition[1], snappedZ);
        setPosition(newPos);
        if (groupRef.current) {
          groupRef.current.position.copy(newPos);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragStart(null);
      document.body.style.cursor = isDragMode ? 'grab' : 'default';

      // Finalize position
      if (groupRef.current) {
        const finalPos = groupRef.current.position;
        onMove(buildingId, { x: finalPos.x, z: finalPos.z });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, territoryRadius, initialPosition, isDragMode, buildingId, onMove]);

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

  // Update position when initialPosition changes (from Redux)
  useEffect(() => {
    const newPos = new THREE.Vector3(initialPosition[0], initialPosition[1], initialPosition[2]);
    setPosition(newPos);
    if (groupRef.current && !isDragging) {
      groupRef.current.position.copy(newPos);
    }
  }, [initialPosition, isDragging]);

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