// Temporary build script to build only essential components
const fs = require('fs');
const path = require('path');

console.log('🔧 Creating temporary build for essential components...');

// Create a temporary tsconfig that excludes problematic files
const tsconfig = {
  "extends": "./tsconfig.json",
  "exclude": [
    "src/components/City3D.tsx",
    "src/pages/CityPage.tsx", 
    "src/pages/WorkoutPage.tsx"
  ]
};

fs.writeFileSync('tsconfig.temp.json', JSON.stringify(tsconfig, null, 2));

console.log('✅ Created temporary tsconfig excluding problematic files');
console.log('📝 You can now run: npx tsc -p tsconfig.temp.json');
console.log('🚀 Or build with: npx vite build --config vite.config.ts');