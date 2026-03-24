# Building Placement System

## Overview
The building placement system allows users to manually place and move buildings in their city instead of having them randomly positioned.

## Features

### 1. Interactive Building Placement
- **Placement Mode**: When building a new structure, users enter placement mode
- **Visual Preview**: See a transparent preview of the building before placing
- **Grid Snapping**: Buildings automatically snap to a 2x2 grid for organized placement
- **Territory Validation**: Buildings must be placed within the city's territory boundaries
- **Visual Feedback**: Green preview for valid positions, red for invalid positions

### 2. Drag and Drop Building Movement
- **Drag Mode Toggle**: Enable/disable drag mode in the Buildings tab
- **Visual Indicators**: Green rings appear around buildings when drag mode is active
- **Grid Snapping**: Buildings snap to grid positions when moved
- **Territory Constraints**: Buildings cannot be moved outside territory boundaries
- **Real-time Updates**: Position changes are saved to the database immediately

## How to Use

### Placing New Buildings
1. Go to the **Build** tab in the building panel
2. Select a building type and click **Build**
3. Enter placement mode - you'll see a preview of the building
4. Move your mouse to position the building
5. **Left-click** to place the building at the current position
6. **Right-click** to cancel placement and return to normal mode

### Moving Existing Buildings
1. Go to the **Buildings** tab in the building panel
2. Click **Enable Drag Mode** to activate building movement
3. Click and drag any building to move it
4. Buildings will snap to grid positions automatically
5. Release to finalize the new position
6. Click **Drag Mode OFF** to disable movement

## Technical Implementation

### Frontend Components
- **BuildingPlacer**: Handles new building placement with mouse tracking
- **DraggableBuilding**: Wraps existing buildings to make them draggable
- **City3D**: Updated to support placement and drag modes

### Backend API
- **PUT /api/cities/buildings/:id/move**: New endpoint to update building positions
- Position validation ensures buildings stay within territory bounds

### State Management
- **placementMode**: Tracks which building type is being placed
- **isDragMode**: Controls whether existing buildings can be moved
- **moveBuilding**: Redux action to update building positions

## Visual Feedback
- **Placement Mode**: Transparent building preview with grid indicator
- **Drag Mode**: Green rings around moveable buildings
- **Valid/Invalid Positions**: Color-coded feedback (green/red)
- **Instructions**: Contextual help text in the UI panels

## Grid System
- Buildings snap to a 2x2 unit grid for organized city layouts
- Grid spacing ensures proper building separation and visual appeal
- Territory boundaries are respected with margin for building sizes

## Performance Optimizations
- Efficient raycasting for mouse-to-world position conversion
- Debounced position updates to reduce server requests
- Visual feedback without heavy computations