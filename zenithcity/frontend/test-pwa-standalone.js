#!/usr/bin/env node

/**
 * PWA Standalone Installation Test
 * Verifies that the app is properly configured for standalone installation
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔍 Testing PWA Standalone Configuration...\n');

let errors = 0;
let warnings = 0;

// Test 1: Check vite.config.ts has VitePWA plugin
console.log('1️⃣  Checking vite.config.ts...');
try {
  const viteConfig = readFileSync(join(__dirname, 'vite.config.ts'), 'utf-8');
  
  if (viteConfig.includes('VitePWA')) {
    console.log('   ✅ VitePWA plugin configured');
  } else {
    console.log('   ❌ VitePWA plugin not found');
    errors++;
  }
  
  if (viteConfig.includes('display: \'standalone\'')) {
    console.log('   ✅ Standalone display mode set');
  } else {
    console.log('   ❌ Standalone display mode not set');
    errors++;
  }
  
  if (viteConfig.includes('registerType: \'autoUpdate\'')) {
    console.log('   ✅ Auto-update enabled');
  } else {
    console.log('   ⚠️  Auto-update not configured');
    warnings++;
  }
} catch (err) {
  console.log('   ❌ Could not read vite.config.ts');
  errors++;
}

// Test 2: Check icons exist
console.log('\n2️⃣  Checking PWA icons...');
const icon192 = join(__dirname, 'public/icons/icon-192.png');
const icon512 = join(__dirname, 'public/icons/icon-512.png');

if (existsSync(icon192)) {
  console.log('   ✅ icon-192.png exists');
} else {
  console.log('   ❌ icon-192.png missing');
  errors++;
}

if (existsSync(icon512)) {
  console.log('   ✅ icon-512.png exists');
} else {
  console.log('   ⚠️  icon-512.png missing (required for Android)');
  warnings++;
}

// Test 3: Check main.tsx has SW registration
console.log('\n3️⃣  Checking service worker registration...');
try {
  const mainTsx = readFileSync(join(__dirname, 'src/main.tsx'), 'utf-8');
  
  if (mainTsx.includes('virtual:pwa-register')) {
    console.log('   ✅ PWA registration imported');
  } else {
    console.log('   ❌ PWA registration not imported');
    errors++;
  }
  
  if (mainTsx.includes('registerSW')) {
    console.log('   ✅ Service worker registered');
  } else {
    console.log('   ❌ Service worker not registered');
    errors++;
  }
} catch (err) {
  console.log('   ❌ Could not read main.tsx');
  errors++;
}

// Test 4: Check package.json has dependencies
console.log('\n4️⃣  Checking dependencies...');
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
  
  if (pkg.devDependencies?.['vite-plugin-pwa']) {
    console.log('   ✅ vite-plugin-pwa installed');
  } else {
    console.log('   ❌ vite-plugin-pwa not installed');
    errors++;
  }
  
  if (pkg.devDependencies?.['workbox-window']) {
    console.log('   ✅ workbox-window installed');
  } else {
    console.log('   ⚠️  workbox-window not installed');
    warnings++;
  }
} catch (err) {
  console.log('   ❌ Could not read package.json');
  errors++;
}

// Test 5: Check old files removed
console.log('\n5️⃣  Checking cleanup...');
const oldSw = join(__dirname, 'public/sw.js');
const oldManifest = join(__dirname, 'public/manifest.json');

if (!existsSync(oldSw)) {
  console.log('   ✅ Old sw.js removed');
} else {
  console.log('   ⚠️  Old sw.js still exists (will be overwritten)');
  warnings++;
}

if (!existsSync(oldManifest)) {
  console.log('   ✅ Old manifest.json removed');
} else {
  console.log('   ⚠️  Old manifest.json still exists (will be overwritten)');
  warnings++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary:');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
  console.log('✅ All tests passed! Your PWA is ready for standalone installation.');
  console.log('\n📝 Next steps:');
  console.log('   1. Generate 512x512 icon if missing');
  console.log('   2. Run: npm run build');
  console.log('   3. Run: npm run preview');
  console.log('   4. Test installation at http://localhost:4173');
} else {
  if (errors > 0) {
    console.log(`❌ ${errors} error(s) found - must be fixed`);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} warning(s) found - should be addressed`);
  }
  console.log('\n📝 Please fix the issues above before deploying.');
}

console.log('='.repeat(50) + '\n');

process.exit(errors > 0 ? 1 : 0);
