// Simple test to verify the built files work
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking build output...');

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.js');

if (fs.existsSync(distPath)) {
  console.log('✅ dist/ directory exists');
  
  if (fs.existsSync(indexPath)) {
    console.log('✅ dist/index.js exists');
    
    // Check file size
    const stats = fs.statSync(indexPath);
    console.log(`📦 index.js size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // List all files in dist
    const files = fs.readdirSync(distPath, { recursive: true });
    console.log('📁 Built files:');
    files.forEach(file => console.log(`   - ${file}`));
    
    console.log('🎉 Build verification successful!');
  } else {
    console.log('❌ dist/index.js not found');
    process.exit(1);
  }
} else {
  console.log('❌ dist/ directory not found');
  process.exit(1);
}