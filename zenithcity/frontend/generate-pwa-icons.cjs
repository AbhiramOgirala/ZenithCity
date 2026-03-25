// Simple script to generate PWA icons from SVG
// This creates a basic HTML page that can be used to generate PNG icons

const fs = require('fs');
const path = require('path');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>PWA Icon Generator</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .icon-container { display: inline-block; margin: 10px; text-align: center; }
        canvas { border: 1px solid #ccc; }
    </style>
</head>
<body>
    <h1>ZenithCity PWA Icon Generator</h1>
    <p>Right-click each canvas and "Save image as..." to download PNG icons.</p>
    
    ${iconSizes.map(size => `
    <div class="icon-container">
        <canvas id="icon-${size}" width="${size}" height="${size}"></canvas>
        <br>
        <label>${size}x${size}</label>
    </div>
    `).join('')}

    <script>
        // Simple icon generator using canvas
        const iconSizes = [${iconSizes.join(', ')}];
        
        iconSizes.forEach(size => {
            const canvas = document.getElementById('icon-' + size);
            const ctx = canvas.getContext('2d');
            
            // Background
            ctx.fillStyle = '#020614';
            ctx.fillRect(0, 0, size, size);
            
            // Icon shape (simple geometric design)
            const center = size / 2;
            const radius = size * 0.3;
            
            // Outer glow
            const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius * 1.5);
            gradient.addColorStop(0, '#00F5FF');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
            
            // Main icon
            ctx.fillStyle = '#00F5FF';
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner design
            ctx.fillStyle = '#020614';
            ctx.font = size * 0.3 + 'px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Z', center, center);
        });
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'public', 'generate-icons.html'), htmlContent);
console.log('✅ Icon generator created at public/generate-icons.html');
console.log('📝 Open this file in a browser to generate PWA icons');
console.log('💡 Right-click each canvas and save as PNG with the correct filename:');
iconSizes.forEach(size => {
    console.log(`   - icon-${size}x${size}.png`);
});