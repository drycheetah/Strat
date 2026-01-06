const { Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');

(async () => {
  const conn = new Connection('https://api.mainnet-beta.solana.com');
  const sig = '4EDTDM7EQFPGKZjraMzT1L2iNGnQpeGqyXBzDJ23q3X7wH2JuCBBY9uwTSC9ak594ct2VsaPA1rXmjFazYCrY71k';

  console.log('Checking transaction:', sig);

  const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0 });

  if (!tx) {
    console.log('❌ Transaction not found on mainnet');
    console.log('💡 This might be a devnet/testnet transaction');
    return;
  }

  console.log('✅ Transaction found!');
  console.log('Slot:', tx.slot);
  console.log('Block Time:', new Date(tx.blockTime * 1000).toLocaleString());
  console.log('Status:', tx.meta.err ? '❌ Failed' : '✅ Success');

  // Get account keys
  const accountKeys = tx.transaction.message.getAccountKeys();
  console.log('\nAccounts involved:');
  accountKeys.staticAccountKeys.forEach((key, i) => {
    const pre = tx.meta.preBalances[i] / LAMPORTS_PER_SOL;
    const post = tx.meta.postBalances[i] / LAMPORTS_PER_SOL;
    const diff = post - pre;
    console.log(`  ${i}: ${key.toBase58()}`);
    console.log(`     Balance: ${pre.toFixed(4)} → ${post.toFixed(4)} SOL (${diff > 0 ? '+' : ''}${diff.toFixed(4)})`);
  });
})();
