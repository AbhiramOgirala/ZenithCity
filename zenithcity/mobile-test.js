#!/usr/bin/env node

const os = require('os');
const { execSync } = require('child_process');

console.log('🔍 ZenithCity Mobile Testing Setup\n');

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push(interface.address);
      }
    }
  }
  return ips;
}

const localIPs = getLocalIPs();

console.log('📱 Your local IP addresses:');
localIPs.forEach((ip, index) => {
  console.log(`   ${index + 1}. ${ip}`);
});

if (localIPs.length === 0) {
  console.log('❌ No local IP addresses found. Make sure you\'re connected to a network.');
  process.exit(1);
}

const primaryIP = localIPs[0];

console.log(`\n🚀 To test on mobile device:`);
console.log(`   1. Update frontend/.env with:`);
console.log(`      VITE_API_BASE_URL=http://${primaryIP}:3001`);
console.log(`      VITE_SOCKET_URL=http://${primaryIP}:3001`);
console.log(`\n   2. Start the development servers:`);
console.log(`      npm run dev`);
console.log(`\n   3. Access from mobile browser:`);
console.log(`      http://${primaryIP}:5173`);
console.log(`\n   4. Test backend health:`);
console.log(`      http://${primaryIP}:3001/health`);

console.log(`\n🔧 Quick setup commands:`);
console.log(`echo "VITE_API_BASE_URL=http://${primaryIP}:3001" > frontend/.env.mobile`);
console.log(`echo "VITE_SOCKET_URL=http://${primaryIP}:3001" >> frontend/.env.mobile`);
console.log(`echo "VITE_NODE_ENV=development" >> frontend/.env.mobile`);
console.log(`\nThen copy frontend/.env.mobile to frontend/.env`);

console.log(`\n📋 Troubleshooting:`);
console.log(`   - Make sure firewall allows connections on ports 3001 and 5173`);
console.log(`   - Both devices should be on the same WiFi network`);
console.log(`   - Try different IP addresses if the first one doesn't work`);