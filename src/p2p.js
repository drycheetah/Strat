const WebSocket = require('ws');

const MESSAGE_TYPES = {
  QUERY_LATEST: 'QUERY_LATEST',
  QUERY_ALL: 'QUERY_ALL',
  RESPONSE_BLOCKCHAIN: 'RESPONSE_BLOCKCHAIN',
  QUERY_TRANSACTION_POOL: 'QUERY_TRANSACTION_POOL',
  RESPONSE_TRANSACTION_POOL: 'RESPONSE_TRANSACTION_POOL',
  NEW_TRANSACTION: 'NEW_TRANSACTION',
  NEW_BLOCK: 'NEW_BLOCK'
};

class P2PServer {
  constructor(blockchain, port) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
  }

  listen() {
    const server = new WebSocket.Server({ port: this.port });

    server.on('connection', (socket) => {
      this.initConnection(socket);
    });

    console.log(`P2P server listening on port ${this.port}`);
  }

  initConnection(socket) {
    this.sockets.push(socket);
    this.initMessageHandler(socket);
    this.initErrorHandler(socket);
    this.write(socket, this.queryChainLengthMsg());
  }

  initMessageHandler(socket) {
    socket.on('message', (data) => {
      const message = JSON.parse(data);

      switch (message.type) {
        case MESSAGE_TYPES.QUERY_LATEST:
          this.write(socket, this.responseLatestMsg());
          break;
        case MESSAGE_TYPES.QUERY_ALL:
          this.write(socket, this.responseChainMsg());
          break;
        case MESSAGE_TYPES.RESPONSE_BLOCKCHAIN:
          this.handleBlockchainResponse(message.data);
          break;
        case MESSAGE_TYPES.QUERY_TRANSACTION_POOL:
          this.write(socket, this.responseTransactionPoolMsg());
          break;
        case MESSAGE_TYPES.RESPONSE_TRANSACTION_POOL:
          this.handleTransactionPoolResponse(message.data);
          break;
        case MESSAGE_TYPES.NEW_TRANSACTION:
          this.handleNewTransaction(message.data);
          break;
        case MESSAGE_TYPES.NEW_BLOCK:
          this.handleNewBlock(message.data);
          break;
      }
    });
  }

  initErrorHandler(socket) {
    socket.on('close', () => this.closeConnection(socket));
    socket.on('error', () => this.closeConnection(socket));
  }

  closeConnection(socket) {
    console.log('Connection closed');
    this.sockets = this.sockets.filter(s => s !== socket);
  }

  connectToPeer(newPeerUrl) {
    const socket = new WebSocket(newPeerUrl);

    socket.on('open', () => {
      this.initConnection(socket);
    });

    socket.on('error', (error) => {
      console.log('Connection failed:', error.message);
    });
  }

  handleBlockchainResponse(receivedBlocks) {
    if (receivedBlocks.length === 0) {
      console.log('Received blockchain is empty');
      return;
    }

    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    const latestBlockHeld = this.blockchain.getLatestBlock();

    if (latestBlockReceived.index > latestBlockHeld.index) {
      console.log(`Blockchain possibly behind. We have: ${latestBlockHeld.index}, Peer has: ${latestBlockReceived.index}`);

      if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
        console.log('Appending received block to our chain');
        this.blockchain.chain.push(latestBlockReceived);
        this.broadcast(this.responseLatestMsg());
      } else if (receivedBlocks.length === 1) {
        console.log('Querying chain from peers');
        this.broadcast(this.queryAllMsg());
      } else {
        console.log('Received blockchain is longer than current blockchain');
        this.replaceChain(receivedBlocks);
      }
    } else {
      console.log('Received blockchain is not longer than current blockchain');
    }
  }

  replaceChain(newBlocks) {
    const tempBlockchain = Object.assign(Object.create(Object.getPrototypeOf(this.blockchain)), this.blockchain);
    tempBlockchain.chain = newBlocks;

    if (tempBlockchain.isChainValid() && newBlocks.length > this.blockchain.chain.length) {
      console.log('Received blockchain is valid. Replacing current blockchain');
      this.blockchain.chain = newBlocks;
      this.broadcast(this.responseLatestMsg());
    } else {
      console.log('Received blockchain invalid');
    }
  }

  handleTransactionPoolResponse(transactions) {
    transactions.forEach(tx => {
      try {
        this.blockchain.addTransaction(tx);
      } catch (error) {
        console.log('Invalid transaction received:', error.message);
      }
    });
  }

  handleNewTransaction(transaction) {
    try {
      this.blockchain.addTransaction(transaction);
      console.log('New transaction added from peer');
    } catch (error) {
      console.log('Invalid transaction received:', error.message);
    }
  }

  handleNewBlock(block) {
    const latestBlock = this.blockchain.getLatestBlock();

    if (block.previousHash === latestBlock.hash && block.index === latestBlock.index + 1) {
      console.log('New block received from peer');
      this.blockchain.chain.push(block);
    } else {
      console.log('Invalid block received');
      this.broadcast(this.queryAllMsg());
    }
  }

  queryChainLengthMsg() {
    return { type: MESSAGE_TYPES.QUERY_LATEST };
  }

  queryAllMsg() {
    return { type: MESSAGE_TYPES.QUERY_ALL };
  }

  responseChainMsg() {
    return {
      type: MESSAGE_TYPES.RESPONSE_BLOCKCHAIN,
      data: this.blockchain.chain
    };
  }

  responseLatestMsg() {
    return {
      type: MESSAGE_TYPES.RESPONSE_BLOCKCHAIN,
      data: [this.blockchain.getLatestBlock()]
    };
  }

  responseTransactionPoolMsg() {
    return {
      type: MESSAGE_TYPES.RESPONSE_TRANSACTION_POOL,
      data: this.blockchain.pendingTransactions
    };
  }

  broadcastNewTransaction(transaction) {
    this.broadcast({
      type: MESSAGE_TYPES.NEW_TRANSACTION,
      data: transaction
    });
  }

  broadcastNewBlock(block) {
    this.broadcast({
      type: MESSAGE_TYPES.NEW_BLOCK,
      data: block
    });
  }

  write(socket, message) {
    socket.send(JSON.stringify(message));
  }

  broadcast(message) {
    this.sockets.forEach(socket => this.write(socket, message));
  }

  getPeers() {
    return this.sockets.map((socket, index) => ({
      index,
      readyState: socket.readyState,
      url: socket.url || 'incoming'
    }));
  }
}

module.exports = P2PServer;
