/**
 * Quick test script to verify miner connectivity
 */

const https = require('https');

const API_URL = 'https://strat.lunarac.org';
const WALLET_ADDRESS = 'STRAT54c3ca56ddf3ea43d6b0ffb5b4f8ee524ceb';

console.log('🧪 Testing STRAT Miner Connectivity\n');
console.log(`API: ${API_URL}`);
console.log(`Wallet: ${WALLET_ADDRESS}\n`);

// Test blockchain stats
console.log('1️⃣ Testing blockchain stats endpoint...');
https.get(`${API_URL}/api/blockchain/stats`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('✅ Blockchain Stats:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('❌ Failed to parse response:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.log('❌ Error:', err.message);
});

// Test mining work endpoint
setTimeout(() => {
  console.log('\n2️⃣ Testing mining work endpoint...');
  https.get(`${API_URL}/api/mining/work?address=${WALLET_ADDRESS}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ Mining Work:', JSON.stringify(result, null, 2));
        console.log('\n🎉 All tests passed! Miner is ready to use.');
        console.log('\nStart mining with:');
        console.log(`node strat-miner.js --address ${WALLET_ADDRESS}\n`);
      } catch (e) {
        console.log('❌ Failed to parse response:', data.substring(0, 200));
      }
    });
  }).on('error', (err) => {
    console.log('❌ Error:', err.message);
  });
}, 2000);
