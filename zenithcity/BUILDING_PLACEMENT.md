# Building Placement System

## Overview
The building placement system allows users to manually place and move buildings in their city instead of having them randomly positioned.

## Features

### 1. Interactive Building Placement
- **Placement Mode**: When building a new structure, users enter placement mode
- **Visual Preview**: See a transparent preview of the building before placing
- **Grid Snapping**: Buildings automatically snap to a 2x2 grid for organized placement
- **Territory Validation**: Buildings must be placed within the city's territory boundaries
- **Collision Detection**: Buildings cannot overlap with existing structures
- **Visual Feedback**: Green preview for valid positions, red for invalid positions
- **Grid Overlay**: Subtle grid lines appear to help with positioning
- **Occupied Zones**: Red areas show where existing buildings prevent placement

### 2. Drag and Drop Building Movement
- **Drag Mode Toggle**: Enable/disable drag mode in the Buildings tab
- **Visual Indicators**: Green rings appear around buildings when drag mode is active
- **Grid Snapping**: Buildings snap to grid positions when moved
- **Territory Constraints**: Buildings cannot be moved outside territory boundaries
- **Collision Prevention**: Buildings cannot be moved on top of other structures
- **Real-time Updates**: Position changes are saved to the database immediately

## How to Use

### Placing New Buildings
1. Go to the **Build** tab in the building panel
2. Select a building type and click **Build**
3. Enter placement mode - you'll see a preview of the building and grid overlay
4. Move your mouse to position the building (it will snap to grid)
5. **GREEN preview** = valid position, **RED preview** = invalid (overlapping or outside territory)
6. **LEFT-CLICK** to place the building at a valid position
7. **RIGHT-CLICK** or press **ESC** to cancel placement and return to normal mode

### Moving Existing Buildings
1. Go to the **Buildings** tab in the building panel
2. Click **Enable Drag Mode** to activate building movement
3. **LEFT-CLICK and DRAG** any building to move it
4. Buildings will snap to grid positions automatically and cannot overlap others
5. Release mouse button to finalize the new position (only if valid)
6. Click **Drag Mode OFF** to disable movement

## Controls Summary
- **LEFT-CLICK**: Place building (in placement mode) or start dragging (in drag mode)
- **RIGHT-CLICK**: Cancel placement mode
- **ESC KEY**: Cancel placement mode
- **MOUSE DRAG**: Move buildings when drag mode is enabled
- **Camera Controls**: Automatically disabled during placement and drag modes

## Visual Feedback
- **Placement Mode**: 
  - Crosshair cursor
  - Transparent building preview with grid indicator
  - Green grid overlay showing snap positions
  - Green preview for valid positions, red for invalid
  - Red zones around existing buildings showing occupied areas
- **Drag Mode**: 
  - Grab cursor when hovering over buildings
  - Green rings around moveable buildings
  - Grabbing cursor when dragging
  - Buildings cannot be moved to invalid positions
- **Territory Boundaries**: Pulsing cyan boundary line shows city limits

## Collision Detection System
- **Building Sizes**: Each building type has specific dimensions
  - House: 2x2 units
  - Apartment: 2.5x2.5 units  
  - Office: 3x3 units
  - Park: 5x5 units
  - Stadium: 8x8 units
- **Safety Margins**: 0.5 unit buffer around each building prevents tight overlaps
- **Real-time Validation**: Position validity checked continuously during placement/movement
- **Visual Indicators**: Red zones and invalid previews clearly show blocked areas

## Technical Implementation

### Frontend Components
- **BuildingPlacer**: Handles new building placement with mouse tracking and keyboard support
- **DraggableBuilding**: Wraps existing buildings to make them draggable with improved event handling
- **City3D**: Updated to support placement and drag modes with visual grid overlay

### Backend API
- **PUT /api/cities/buildings/:id/move**: New endpoint to update building positions
- Position validation ensures buildings stay within territory bounds

### State Management
- **placementMode**: Tracks which building type is being placed
- **isDragMode**: Controls whether existing buildings can be moved
- **moveBuilding**: Redux action to update building positions

## Grid System
- Buildings snap to a 2x2 unit grid for organized city layouts
- Grid spacing ensures proper building separation and visual appeal
- Territory boundaries are respected with margin for building sizes
- Visual grid overlay helps users understand positioning

## Performance Optimizations
- Efficient raycasting for mouse-to-world position conversion
- Camera controls disabled during interaction modes to prevent conflicts
- Visual feedback without heavy computations
- Event handling optimized to prevent interference between systems