const Blockchain = require('./src/blockchain');
const Wallet = require('./src/wallet');
const { Transaction, TransactionInput, TransactionOutput } = require('./src/transaction');

const command = process.argv[2];
const args = process.argv.slice(3);

const blockchain = new Blockchain();

function displayHelp() {
  console.log(`
STRAT Blockchain CLI
====================

Commands:
  wallet create <name>              Create a new wallet
  wallet list                       List all wallets
  wallet balance <name>             Check wallet balance
  wallet info <name>                Show wallet information

  transaction create <from> <to> <amount>  Create and sign a transaction

  mine <minerWallet>                Mine pending transactions

  blockchain show                   Display the entire blockchain
  blockchain validate               Validate blockchain integrity
  blockchain stats                  Show blockchain statistics

  help                              Show this help message

Examples:
  node cli.js wallet create miner
  node cli.js wallet balance miner
  node cli.js mine miner
  node cli.js transaction create alice bob 10
  node cli.js blockchain show
  `);
}

function createWallet(name) {
  try {
    const wallet = new Wallet();
    wallet.save(`${name}.json`);
    console.log('\nWallet created successfully!');
    console.log('Name:', name);
    console.log('Address:', wallet.address);
    console.log('File:', `wallets/${name}.json`);
    console.log('\nIMPORTANT: Keep your wallet file safe! It contains your private key.');
  } catch (error) {
    console.error('Error creating wallet:', error.message);
  }
}

function listWallets() {
  const wallets = Wallet.listWallets();
  console.log('\nAvailable Wallets:');
  console.log('==================');
  if (wallets.length === 0) {
    console.log('No wallets found. Create one with: node cli.js wallet create <name>');
  } else {
    wallets.forEach((file, index) => {
      console.log(`${index + 1}. ${file.replace('.json', '')}`);
    });
  }
}

function getWalletBalance(name) {
  try {
    const wallet = Wallet.load(`${name}.json`);
    const balance = wallet.getBalance(blockchain);
    console.log('\nWallet Balance:');
    console.log('===============');
    console.log('Name:', name);
    console.log('Address:', wallet.address);
    console.log('Balance:', balance, 'STRAT');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

function getWalletInfo(name) {
  try {
    const wallet = Wallet.load(`${name}.json`);
    const balance = wallet.getBalance(blockchain);
    const utxos = blockchain.getUTXOsForAddress(wallet.address);

    console.log('\nWallet Information:');
    console.log('===================');
    console.log('Name:', name);
    console.log('Address:', wallet.address);
    console.log('Public Key:', wallet.publicKey);
    console.log('Balance:', balance, 'STRAT');
    console.log('UTXOs:', utxos.length);
    console.log('\nUTXO Details:');
    utxos.forEach((utxo, index) => {
      console.log(`  ${index + 1}. ${utxo.amount} STRAT (TX: ${utxo.txHash.substring(0, 16)}...)`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

function createTransaction(fromName, toName, amount) {
  try {
    const fromWallet = Wallet.load(`${fromName}.json`);
    const toWallet = Wallet.load(`${toName}.json`);

    const transaction = fromWallet.createTransaction(toWallet.address, parseFloat(amount), blockchain);
    blockchain.addTransaction(transaction);

    console.log('\nTransaction Created Successfully!');
    console.log('==================================');
    console.log('From:', fromWallet.address);
    console.log('To:', toWallet.address);
    console.log('Amount:', amount, 'STRAT');
    console.log('Fee:', blockchain.transactionFee, 'STRAT');
    console.log('Transaction Hash:', transaction.hash);
    console.log('\nTransaction is pending. Mine a block to confirm it.');
  } catch (error) {
    console.error('Error creating transaction:', error.message);
  }
}

function mineBlock(minerName) {
  try {
    const minerWallet = Wallet.load(`${minerName}.json`);

    console.log('\nMining block...');
    console.log('Miner:', minerWallet.address);
    console.log('Pending transactions:', blockchain.pendingTransactions.length);

    const block = blockchain.minePendingTransactions(minerWallet.address);

    console.log('\n Block Mined Successfully!');
    console.log('===========================');
    console.log('Block Index:', block.index);
    console.log('Block Hash:', block.hash);
    console.log('Nonce:', block.nonce);
    console.log('Transactions:', block.transactions.length);
    console.log('Mining Reward:', blockchain.miningReward, 'STRAT');
    console.log('\nNew Balance:', minerWallet.getBalance(blockchain), 'STRAT');
  } catch (error) {
    console.error('Error mining block:', error.message);
  }
}

function showBlockchain() {
  console.log('\nBlockchain:');
  console.log('===========\n');

  blockchain.chain.forEach((block, index) => {
    console.log(`Block #${block.index}`);
    console.log('Timestamp:', new Date(block.timestamp).toLocaleString());
    console.log('Hash:', block.hash);
    console.log('Previous Hash:', block.previousHash);
    console.log('Nonce:', block.nonce);
    console.log('Difficulty:', block.difficulty);
    console.log('Transactions:', block.transactions.length);

    block.transactions.forEach((tx, txIndex) => {
      if (tx.isCoinbase) {
        console.log(`  TX ${txIndex}: Coinbase -> ${tx.outputs[0].address} (${tx.outputs[0].amount} STRAT)`);
      } else if (tx.isContractDeploy) {
        console.log(`  TX ${txIndex}: Contract Deploy by ${tx.from}`);
      } else if (tx.isContractCall) {
        console.log(`  TX ${txIndex}: Contract Call to ${tx.contractAddress}`);
      } else {
        console.log(`  TX ${txIndex}: ${tx.hash.substring(0, 16)}...`);
        tx.outputs.forEach((output, outIndex) => {
          console.log(`    Output ${outIndex}: ${output.address.substring(0, 20)}... (${output.amount} STRAT)`);
        });
      }
    });

    console.log('');
  });
}

function validateBlockchain() {
  console.log('\nValidating Blockchain...');
  console.log('========================\n');

  const isValid = blockchain.isChainValid();

  if (isValid) {
    console.log('Blockchain is VALID!');
    console.log('All blocks are properly linked and hashed.');
  } else {
    console.log('Blockchain is INVALID!');
    console.log('The blockchain has been tampered with.');
  }
}

function showStats() {
  let totalSupply = 0;
  for (let [key, utxo] of blockchain.utxos) {
    totalSupply += utxo.amount;
  }

  console.log('\nBlockchain Statistics:');
  console.log('======================');
  console.log('Block Height:', blockchain.chain.length);
  console.log('Difficulty:', blockchain.difficulty);
  console.log('Mining Reward:', blockchain.miningReward, 'STRAT');
  console.log('Transaction Fee:', blockchain.transactionFee, 'STRAT');
  console.log('Pending Transactions:', blockchain.pendingTransactions.length);
  console.log('Total Supply:', totalSupply, 'STRAT');
  console.log('Total UTXOs:', blockchain.utxos.size);
  console.log('Total Contracts:', blockchain.contracts.size);
}

switch (command) {
  case 'wallet':
    const walletCmd = args[0];
    switch (walletCmd) {
      case 'create':
        createWallet(args[1]);
        break;
      case 'list':
        listWallets();
        break;
      case 'balance':
        getWalletBalance(args[1]);
        break;
      case 'info':
        getWalletInfo(args[1]);
        break;
      default:
        console.log('Unknown wallet command. Use: node cli.js help');
    }
    break;

  case 'transaction':
    const txCmd = args[0];
    if (txCmd === 'create') {
      createTransaction(args[1], args[2], args[3]);
    } else {
      console.log('Unknown transaction command. Use: node cli.js help');
    }
    break;

  case 'mine':
    mineBlock(args[0]);
    break;

  case 'blockchain':
    const blockchainCmd = args[0];
    switch (blockchainCmd) {
      case 'show':
        showBlockchain();
        break;
      case 'validate':
        validateBlockchain();
        break;
      case 'stats':
        showStats();
        break;
      default:
        console.log('Unknown blockchain command. Use: node cli.js help');
    }
    break;

  case 'help':
  default:
    displayHelp();
}
