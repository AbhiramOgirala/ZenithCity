import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateIcon() {
  try {
    // Load the 192px icon
    const img = await loadImage(join(__dirname, 'public/icons/icon-192.png'));
    
    // Create 512x512 canvas
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext('2d');
    
    // Enable high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw scaled image
    ctx.drawImage(img, 0, 0, 512, 512);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(join(__dirname, 'public/icons/icon-512.png'), buffer);
    
    console.log('✅ icon-512.png created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Alternative: Use the HTML generator:');
    console.log('   Open: frontend/create-512-icon.html');
  }
}

generateIcon();
