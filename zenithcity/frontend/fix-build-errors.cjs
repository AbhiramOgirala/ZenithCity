// Quick fix script for common TypeScript build errors
const fs = require('fs');
const path = require('path');

console.log('🔧 Applying quick fixes for TypeScript build errors...');

// Fix 1: Add missing variables to CityPage.tsx
const cityPagePath = 'src/pages/CityPage.tsx';
if (fs.existsSync(cityPagePath)) {
  let content = fs.readFileSync(cityPagePath, 'utf8');
  
  // Add missing state variables at the top of the component
  const stateVarsToAdd = `
  const [placementMode, setPlacementMode] = useState(null);
  const [isDragMode, setIsDragMode] = useState(false);
  const [position] = useState({ x: 0, y: 0, z: 0 });
  `;
  
  // Find the component function and add state variables
  content = content.replace(
    /export default function CityPage\(\) \{/,
    `export default function CityPage() {${stateVarsToAdd}`
  );
  
  fs.writeFileSync(cityPagePath, content);
  console.log('✅ Fixed CityPage.tsx missing variables');
}

// Fix 2: Add missing variables to WorkoutPage.tsx  
const workoutPagePath = 'src/pages/WorkoutPage.tsx';
if (fs.existsSync(workoutPagePath)) {
  let content = fs.readFileSync(workoutPagePath, 'utf8');
  
  // Add missing state variable
  const stateVarToAdd = `
  const [todayExercises, setTodayExercises] = useState([]);
  `;
  
  content = content.replace(
    /export default function WorkoutPage\(\) \{/,
    `export default function WorkoutPage() {${stateVarToAdd}`
  );
  
  fs.writeFileSync(workoutPagePath, content);
  console.log('✅ Fixed WorkoutPage.tsx missing variables');
}

console.log('🎉 Quick fixes applied! Try building again.');