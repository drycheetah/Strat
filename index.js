const Blockchain = require('./src/blockchain');
const Wallet = require('./src/wallet');
const P2PServer = require('./src/p2p');
const HTTPServer = require('./src/server');

const args = process.argv.slice(2);
const httpPort = args[0] ? parseInt(args[0]) : 3000;
const p2pPort = args[1] ? parseInt(args[1]) : 6000;

console.log('='.repeat(60));
console.log('         STRAT - Custom Blockchain Network');
console.log('='.repeat(60));

const blockchain = new Blockchain();
let wallet;

try {
  console.log('\nLoading default wallet...');
  wallet = Wallet.load('default.json');
  console.log('Wallet loaded successfully!');
} catch (error) {
  console.log('Creating new wallet...');
  wallet = new Wallet();
  wallet.save('default.json');
  console.log('New wallet created and saved!');
}

console.log('\nWallet Information:');
console.log('Address:', wallet.address);
console.log('Balance:', wallet.getBalance(blockchain), 'STRAT');

const p2pServer = new P2PServer(blockchain, p2pPort);
p2pServer.listen();

const httpServer = new HTTPServer(blockchain, wallet, p2pServer, httpPort);
httpServer.listen();

if (args[2]) {
  console.log('\nConnecting to peer:', args[2]);
  p2pServer.connectToPeer(args[2]);
}

console.log('\n='.repeat(60));
console.log('Blockchain initialized with', blockchain.chain.length, 'block(s)');
console.log('Mining difficulty:', blockchain.difficulty);
console.log('Mining reward:', blockchain.miningReward, 'STRAT');
console.log('Transaction fee:', blockchain.transactionFee, 'STRAT');
console.log('='.repeat(60));
console.log('\nNode is running!');
console.log('Web Dashboard: http://localhost:' + httpPort);
console.log('P2P Port:', p2pPort);
console.log('\nPress Ctrl+C to stop the node');
console.log('='.repeat(60));

process.on('SIGINT', () => {
  console.log('\n\nShutting down STRAT node...');
  process.exit(0);
});
