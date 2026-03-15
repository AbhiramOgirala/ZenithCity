# 3D Building Assets Setup

## The Best Approach: Kenney.nl City Kit (CC0 Free)

Instead of procedural Three.js geometry (which always looks like toy blocks),
ZenithCity now uses real artist-made GLB models from Kenney.nl — the gold standard
for free game assets (CC0 licensed, no attribution required).

### Step 1 — Download the packs (free, no account needed)

Go to each URL and click "Download":

| Pack | URL | Used for |
|------|-----|----------|
| City Kit (Commercial) | https://kenney.nl/assets/city-kit-commercial | office, stadium |
| City Kit (Suburban)   | https://kenney.nl/assets/city-kit-suburban   | house |
| City Kit (Industrial) | https://kenney.nl/assets/city-kit-industrial | apartment |
| City Kit (Roads)      | https://kenney.nl/assets/city-kit-roads      | road tiles |

### Step 2 — Copy the GLB files

From each downloaded ZIP, go into the `Models/GLTF format/` folder and copy:

```
From City Kit (Commercial):
  buildingA.glb  → frontend/public/models/office.glb
  buildingB.glb  → frontend/public/models/stadium.glb

From City Kit (Suburban):
  house-large.glb  → frontend/public/models/house.glb
  house-small.glb  → frontend/public/models/house_small.glb

From City Kit (Industrial):
  warehouse-large.glb  → frontend/public/models/apartment.glb

From City Kit (Roads):
  road-straight.glb  → frontend/public/models/road.glb
  road-intersection.glb  → frontend/public/models/road_intersection.glb
```

### Step 3 — Run the app

The City3D component will automatically load these models using useGLTF.
If a model file is missing, it gracefully falls back to a stylized placeholder.

### Why Kenney?
- CC0 licensed — use in any project, commercial or not, no attribution
- Consistent style across all packs (same proportions, palette)  
- Pre-textured with atlases — loads fast, no separate texture files
- Used in thousands of commercial games and apps
- GLB format → single file, works directly with React Three Fiber

### Alternative: Quaternius City Pack
Also CC0: https://quaternius.com/packs/ultimatecity.html
Slightly higher poly, great for close-up views.
