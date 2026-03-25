// Verify the backend build is working correctly
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying backend build...');

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.log('❌ dist/ directory not found');
  process.exit(1);
}

// Check if main files exist
const requiredFiles = ['index.js', 'index.d.ts'];
const missingFiles = requiredFiles.filter(file => 
  !fs.existsSync(path.join(distPath, file))
);

if (missingFiles.length > 0) {
  console.log('❌ Missing files:', missingFiles);
  process.exit(1);
}

// Check file sizes
const indexJs = path.join(distPath, 'index.js');
const stats = fs.statSync(indexJs);
const sizeKB = (stats.size / 1024).toFixed(2);

console.log('✅ Build verification passed!');
console.log(`📦 index.js size: ${sizeKB} KB`);

// List all built files
const files = fs.readdirSync(distPath, { recursive: true });
console.log('📁 Built files:');
files.slice(0, 10).forEach(file => console.log(`   - ${file}`));
if (files.length > 10) {
  console.log(`   ... and ${files.length - 10} more files`);
}

console.log('🚀 Backend is ready for Docker build!');