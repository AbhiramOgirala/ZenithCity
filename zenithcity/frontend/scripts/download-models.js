#!/usr/bin/env node
/**
 * ZenithCity — Auto-download Kenney.nl City Kit GLB models
 *
 * Usage:  node scripts/download-models.js
 * Run from the frontend/ directory.
 *
 * Downloads CC0 licensed building packs from kenney.nl,
 * extracts the GLB files, and places them in public/models/.
 *
 * kenney.nl/assets/city-kit-commercial  (CC0)
 * kenney.nl/assets/city-kit-suburban    (CC0)
 * kenney.nl/assets/city-kit-industrial  (CC0)
 */

import { createWriteStream, mkdirSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { mkdir, copyFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = join(__dirname, '..', 'public', 'models');

// ── Kenney direct download URLs ──────────────────────────────────────────────
// These are the direct zip download links from kenney.nl
const PACKS = [
  {
    name: 'City Kit (Commercial)',
    url: 'https://kenney.nl/content/assets/city-kit-commercial.zip',
    files: [
      { from: 'Models/GLTF format/large_buildingA.glb',   to: 'office.glb' },
      { from: 'Models/GLTF format/large_buildingB.glb',   to: 'stadium.glb' },
      { from: 'Models/GLTF format/small_buildingA.glb',   to: 'office_small.glb' },
      { from: 'Models/GLTF format/small_buildingB.glb',   to: 'office_b.glb' },
      { from: 'Models/GLTF format/skyscraper.glb',        to: 'skyscraper.glb' },
    ],
  },
  {
    name: 'City Kit (Suburban)',
    url: 'https://kenney.nl/content/assets/city-kit-suburban.zip',
    files: [
      { from: 'Models/GLTF format/house-large-A.glb', to: 'house.glb' },
      { from: 'Models/GLTF format/house-small-A.glb', to: 'house_small.glb' },
      { from: 'Models/GLTF format/house-large-B.glb', to: 'house_b.glb' },
      { from: 'Models/GLTF format/tree-large.glb',    to: 'park_tree.glb' },
      { from: 'Models/GLTF format/tree-small.glb',    to: 'park_tree_small.glb' },
    ],
  },
  {
    name: 'City Kit (Industrial)',
    url: 'https://kenney.nl/content/assets/city-kit-industrial.zip',
    files: [
      { from: 'Models/GLTF format/large_warehouse.glb',   to: 'apartment.glb' },
      { from: 'Models/GLTF format/small_buildingA.glb',   to: 'apartment_small.glb' },
    ],
  },
];

// ── Downloader ───────────────────────────────────────────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });

    req.on('error', (err) => { file.close(); reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timed out')); });
  });
}

// ── ZIP extractor (using Node built-ins only) ─────────────────────────────────
// For ZIP we need a library. Check if 'unzipper' or 'adm-zip' is available,
// fall back to a shell command (unzip / 7z / powershell Expand-Archive)
async function extractZip(zipPath, targetDir, wantedFiles) {
  // Try unzipper npm package first
  try {
    const { default: unzipper } = await import('unzipper');
    const results = {};
    await new Promise((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const match = wantedFiles.find(f => entry.path.endsWith(f.from.replace(/\//g, '/').split('/').pop()));
          if (match) {
            const dest = join(targetDir, match.to);
            entry.pipe(createWriteStream(dest));
            results[match.to] = true;
          } else {
            entry.autodrain();
          }
        })
        .on('close', resolve)
        .on('error', reject);
    });
    return results;
  } catch {}

  // Try adm-zip
  try {
    const { default: AdmZip } = await import('adm-zip');
    const zip = new AdmZip(zipPath);
    const results = {};
    for (const wanted of wantedFiles) {
      const entry = zip.getEntry(wanted.from) ||
        zip.getEntries().find(e => e.entryName.endsWith(wanted.from.split('/').pop()));
      if (entry) {
        zip.extractEntryTo(entry, targetDir, false, true, false, wanted.to);
        results[wanted.to] = true;
      }
    }
    return results;
  } catch {}

  // Fall back to system unzip command
  const { execSync } = await import('child_process');
  const results = {};
  for (const wanted of wantedFiles) {
    try {
      const filename = wanted.from.split('/').pop();
      const cmd = process.platform === 'win32'
        ? `powershell Expand-Archive -Force "${zipPath}" "${targetDir}_tmp"`
        : `unzip -o -j "${zipPath}" "*/${filename}" -d "${targetDir}"`;
      execSync(cmd, { stdio: 'pipe' });

      // Rename to desired name
      const extracted = join(targetDir, filename);
      const final = join(targetDir, wanted.to);
      if (existsSync(extracted) && extracted !== final) {
        const { renameSync } = await import('fs');
        renameSync(extracted, final);
      }
      results[wanted.to] = true;
    } catch (e) {
      // silently continue
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(MODELS_DIR, { recursive: true });

  console.log('\n🏙️  ZenithCity — Downloading Kenney.nl City Kit models');
  console.log('   All models are CC0 (public domain)\n');

  const tmpDir = join(MODELS_DIR, '.tmp');
  mkdirSync(tmpDir, { recursive: true });

  let totalDownloaded = 0;

  for (const pack of PACKS) {
    console.log(`📦 ${pack.name}`);
    const zipPath = join(tmpDir, `${pack.name.replace(/[^a-z0-9]/gi, '_')}.zip`);

    // Check if any files from this pack are already present
    const allPresent = pack.files.every(f => existsSync(join(MODELS_DIR, f.to)));
    if (allPresent) {
      console.log(`   ✓ All files already present — skipping\n`);
      continue;
    }

    // Download
    process.stdout.write(`   ↓ Downloading... `);
    try {
      await downloadFile(pack.url, zipPath);
      console.log('done');
    } catch (err) {
      console.log(`\n   ✗ Download failed: ${err.message}`);
      console.log(`   → Manually download from: ${pack.url.replace('/content/assets/', '/assets/')}`);
      console.log(`     and copy GLB files to: ${MODELS_DIR}\n`);
      continue;
    }

    // Extract
    process.stdout.write(`   📂 Extracting GLBs... `);
    try {
      const { createReadStream } = await import('fs');
      const extracted = await extractZip(zipPath, MODELS_DIR, pack.files);
      const count = Object.keys(extracted).length;
      console.log(`${count}/${pack.files.length} files`);
      totalDownloaded += count;

      // List what was extracted
      pack.files.forEach(f => {
        const exists = existsSync(join(MODELS_DIR, f.to));
        console.log(`   ${exists ? '✓' : '✗'} ${f.to}`);
      });
    } catch (err) {
      console.log(`\n   ✗ Extraction failed: ${err.message}`);
      console.log(`   → Try: unzip "${zipPath}" -d "${MODELS_DIR}"`);
    }

    // Clean up zip
    try { unlinkSync(zipPath); } catch {}
    console.log();
  }

  // Clean up tmp
  try {
    const { rmdirSync } = await import('fs');
    rmdirSync(tmpDir);
  } catch {}

  console.log('─'.repeat(50));
  if (totalDownloaded > 0) {
    console.log(`✅ Done! ${totalDownloaded} model files saved to:`);
    console.log(`   ${MODELS_DIR}`);
  } else {
    console.log('⚠️  No files downloaded automatically.');
    console.log('\nManual setup — download these free CC0 packs and copy GLBs:');
    console.log('  https://kenney.nl/assets/city-kit-commercial  → office.glb, stadium.glb');
    console.log('  https://kenney.nl/assets/city-kit-suburban    → house.glb');
    console.log('  https://kenney.nl/assets/city-kit-industrial  → apartment.glb');
    console.log(`  Place files in: ${MODELS_DIR}`);
  }
  console.log('\nNote: The app runs without model files — stylised fallbacks show instead.\n');
}

main().catch(console.error);
