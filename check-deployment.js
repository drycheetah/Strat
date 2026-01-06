/**
 * Check if mining endpoints are deployed
 */

const https = require('https');

const API_URL = 'https://strat-production.up.railway.app';

console.log('🔄 Checking Railway deployment status...\n');

let attempts = 0;
const maxAttempts = 30; // Check for 5 minutes

function checkEndpoint() {
  attempts++;

  console.log(`Attempt ${attempts}/${maxAttempts}: Checking mining endpoint...`);

  https.get(`${API_URL}/api/mining/stats`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.success) {
          console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
          console.log('\nMining Stats:', JSON.stringify(result.stats, null, 2));
          console.log('\n🎉 Mining endpoints are live!');
          console.log('\nYou can now start mining with:');
          console.log('node strat-miner.js --address STRAT54c3ca56ddf3ea43d6b0ffb5b4f8ee524ceb\n');
          process.exit(0);
        } else {
          throw new Error('Unexpected response');
        }
      } catch (e) {
        if (data.includes('not found') || data.includes('Not found')) {
          console.log('⏳ Endpoints not deployed yet, waiting...');
        } else {
          console.log('❓ Unexpected response:', data.substring(0, 100));
        }

        if (attempts < maxAttempts) {
          setTimeout(checkEndpoint, 10000); // Check every 10 seconds
        } else {
          console.log('\n⚠️  Deployment taking longer than expected.');
          console.log('Check Railway logs at: https://railway.app/');
          console.log('Or manually test: curl ' + API_URL + '/api/mining/stats\n');
          process.exit(1);
        }
      }
    });
  }).on('error', (err) => {
    console.log('❌ Connection error:', err.message);
    if (attempts < maxAttempts) {
      setTimeout(checkEndpoint, 10000);
    } else {
      process.exit(1);
    }
  });
}

// Start checking
checkEndpoint();
