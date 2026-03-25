#!/usr/bin/env node

const https = require('https');

console.log('🔍 Testing ZenithCity Production Deployment\n');

// Test backend health
function testBackend() {
  return new Promise((resolve) => {
    console.log('🔧 Testing backend health...');
    
    const req = https.get('https://zenithcity.onrender.com/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('✅ Backend health check passed:', json);
          resolve(true);
        } catch (e) {
          console.log('❌ Backend health check failed - invalid JSON:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Backend health check failed:', err.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Backend health check timed out');
      req.destroy();
      resolve(false);
    });
  });
}

// Test frontend
function testFrontend() {
  return new Promise((resolve) => {
    console.log('🎨 Testing frontend...');
    
    const req = https.get('https://zenith-city.vercel.app', (res) => {
      console.log(`✅ Frontend responded with status: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    });
    
    req.on('error', (err) => {
      console.log('❌ Frontend test failed:', err.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Frontend test timed out');
      req.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  const backendOk = await testBackend();
  const frontendOk = await testFrontend();
  
  console.log('\n📊 Test Results:');
  console.log(`   Backend:  ${backendOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Frontend: ${frontendOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (backendOk && frontendOk) {
    console.log('\n🎉 All tests passed! Production deployment is working.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the deployment configuration.');
    
    if (!backendOk) {
      console.log('\n🔧 Backend troubleshooting:');
      console.log('   - Check Render deployment logs');
      console.log('   - Verify environment variables are set');
      console.log('   - Ensure the service is not sleeping (free tier)');
    }
    
    if (!frontendOk) {
      console.log('\n🎨 Frontend troubleshooting:');
      console.log('   - Check Vercel deployment logs');
      console.log('   - Verify build completed successfully');
      console.log('   - Check for any build errors');
    }
  }
  
  console.log('\n🔗 Quick Links:');
  console.log('   Frontend: https://zenith-city.vercel.app');
  console.log('   Backend:  https://zenithcity.onrender.com/health');
  console.log('   Vercel Dashboard: https://vercel.com/dashboard');
  console.log('   Render Dashboard: https://dashboard.render.com');
}

runTests().catch(console.error);