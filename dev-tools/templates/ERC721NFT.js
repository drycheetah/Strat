/**
 * ERC721 NFT Standard Implementation
 * Non-Fungible Token contract with metadata and enumeration
 */

class ERC721NFT {
  constructor(name, symbol, baseURI) {
    // Token metadata
    this.name = name;
    this.symbol = symbol;
    this.baseURI = baseURI || '';

    // Storage
    this.tokens = new Map(); // tokenId => { owner, tokenURI, metadata }
    this.owners = new Map(); // tokenId => owner
    this.balances = new Map(); // owner => count
    this.approvals = new Map(); // tokenId => approved
    this.operatorApprovals = new Map(); // owner:operator => bool
    this.tokenCounter = 0;
    this.owner = this.caller;
  }

  // ERC721 Standard Methods

  balanceOf(owner) {
    if (!owner || owner === '0x0') {
      throw new Error('Invalid address');
    }
    return this.balances.get(owner) || 0;
  }

  ownerOf(tokenId) {
    const owner = this.owners.get(tokenId);
    if (!owner) {
      throw new Error('Token does not exist');
    }
    return owner;
  }

  transferFrom(from, to, tokenId) {
    const owner = this.ownerOf(tokenId);
    const caller = this.caller;

    if (!to || to === '0x0') {
      throw new Error('Invalid recipient address');
    }

    if (owner !== from) {
      throw new Error('From address is not token owner');
    }

    // Check authorization
    const approved = this.approvals.get(tokenId);
    const operatorKey = `${owner}:${caller}`;
    const isOperator = this.operatorApprovals.get(operatorKey);

    if (caller !== owner && approved !== caller && !isOperator) {
      throw new Error('Not authorized to transfer');
    }

    // Clear approval
    this.approvals.delete(tokenId);

    // Transfer ownership
    this.owners.set(tokenId, to);
    this.balances.set(from, this.balanceOf(from) - 1);
    this.balances.set(to, this.balanceOf(to) + 1);

    // Update token data
    const tokenData = this.tokens.get(tokenId);
    tokenData.owner = to;

    this.emit('Transfer', { from, to, tokenId });
    return true;
  }

  safeTransferFrom(from, to, tokenId, data) {
    // In production, would check if recipient is contract and call onERC721Received
    return this.transferFrom(from, to, tokenId);
  }

  approve(to, tokenId) {
    const owner = this.ownerOf(tokenId);

    if (this.caller !== owner) {
      const operatorKey = `${owner}:${this.caller}`;
      if (!this.operatorApprovals.get(operatorKey)) {
        throw new Error('Not token owner or operator');
      }
    }

    this.approvals.set(tokenId, to);
    this.emit('Approval', { owner, approved: to, tokenId });
    return true;
  }

  setApprovalForAll(operator, approved) {
    const owner = this.caller;

    if (owner === operator) {
      throw new Error('Cannot approve yourself as operator');
    }

    const key = `${owner}:${operator}`;

    if (approved) {
      this.operatorApprovals.set(key, true);
    } else {
      this.operatorApprovals.delete(key);
    }

    this.emit('ApprovalForAll', { owner, operator, approved });
    return true;
  }

  getApproved(tokenId) {
    this.ownerOf(tokenId); // Check token exists
    return this.approvals.get(tokenId) || '0x0';
  }

  isApprovedForAll(owner, operator) {
    const key = `${owner}:${operator}`;
    return this.operatorApprovals.get(key) || false;
  }

  // Metadata Methods

  tokenURI(tokenId) {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new Error('Token does not exist');
    }

    if (token.tokenURI) {
      return token.tokenURI;
    }

    return this.baseURI + tokenId;
  }

  // Minting (only owner)

  mint(to, tokenURI, metadata) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can mint');
    }

    if (!to || to === '0x0') {
      throw new Error('Invalid recipient address');
    }

    const tokenId = ++this.tokenCounter;

    this.tokens.set(tokenId, {
      owner: to,
      tokenURI: tokenURI || '',
      metadata: metadata || {},
      mintedAt: Date.now()
    });

    this.owners.set(tokenId, to);
    this.balances.set(to, this.balanceOf(to) + 1);

    this.emit('Transfer', { from: '0x0', to, tokenId });
    this.emit('Mint', { to, tokenId, tokenURI });
    return tokenId;
  }

  batchMint(to, count, baseTokenURI) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can mint');
    }

    if (!to || to === '0x0') {
      throw new Error('Invalid recipient address');
    }

    if (count <= 0 || count > 100) {
      throw new Error('Invalid count (1-100)');
    }

    const tokenIds = [];

    for (let i = 0; i < count; i++) {
      const tokenId = ++this.tokenCounter;
      const tokenURI = baseTokenURI ? `${baseTokenURI}/${tokenId}` : '';

      this.tokens.set(tokenId, {
        owner: to,
        tokenURI,
        metadata: {},
        mintedAt: Date.now()
      });

      this.owners.set(tokenId, to);
      tokenIds.push(tokenId);

      this.emit('Transfer', { from: '0x0', to, tokenId });
    }

    this.balances.set(to, this.balanceOf(to) + count);
    this.emit('BatchMint', { to, tokenIds, count });

    return tokenIds;
  }

  // Burning

  burn(tokenId) {
    const owner = this.ownerOf(tokenId);

    if (this.caller !== owner) {
      throw new Error('Not token owner');
    }

    this.tokens.delete(tokenId);
    this.owners.delete(tokenId);
    this.approvals.delete(tokenId);
    this.balances.set(owner, this.balanceOf(owner) - 1);

    this.emit('Transfer', { from: owner, to: '0x0', tokenId });
    this.emit('Burn', { from: owner, tokenId });
    return true;
  }

  // Metadata Management

  setTokenURI(tokenId, tokenURI) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can set token URI');
    }

    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new Error('Token does not exist');
    }

    token.tokenURI = tokenURI;
    this.emit('MetadataUpdate', { tokenId, tokenURI });
    return true;
  }

  setBaseURI(newBaseURI) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can set base URI');
    }

    this.baseURI = newBaseURI;
    this.emit('BaseURIUpdate', { baseURI: newBaseURI });
    return true;
  }

  updateMetadata(tokenId, metadata) {
    const owner = this.ownerOf(tokenId);

    if (this.caller !== owner && this.caller !== this.owner) {
      throw new Error('Not authorized');
    }

    const token = this.tokens.get(tokenId);
    token.metadata = { ...token.metadata, ...metadata };

    this.emit('MetadataUpdate', { tokenId, metadata });
    return true;
  }

  // Enumeration

  totalSupply() {
    return this.tokenCounter;
  }

  tokenByIndex(index) {
    if (index < 0 || index >= this.tokenCounter) {
      throw new Error('Index out of bounds');
    }
    return index + 1; // Token IDs start at 1
  }

  tokensOfOwner(owner) {
    const tokens = [];

    for (const [tokenId, tokenOwner] of this.owners.entries()) {
      if (tokenOwner === owner) {
        tokens.push(tokenId);
      }
    }

    return tokens;
  }

  // Ownership

  transferOwnership(newOwner) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can transfer ownership');
    }

    if (!newOwner || newOwner === '0x0') {
      throw new Error('Invalid new owner address');
    }

    const oldOwner = this.owner;
    this.owner = newOwner;

    this.emit('OwnershipTransferred', { oldOwner, newOwner });
    return true;
  }

  // View functions

  getName() {
    return this.name;
  }

  getSymbol() {
    return this.symbol;
  }

  getOwner() {
    return this.owner;
  }

  getTokenData(tokenId) {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new Error('Token does not exist');
    }
    return token;
  }

  exists(tokenId) {
    return this.tokens.has(tokenId);
  }
}

module.exports = ERC721NFT;
