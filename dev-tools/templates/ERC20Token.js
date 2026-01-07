/**
 * ERC20 Token Standard Implementation
 * Fully compatible token contract with mint and burn capabilities
 */

class ERC20Token {
  constructor(name, symbol, decimals, initialSupply) {
    // Token metadata
    this.name = name;
    this.symbol = symbol;
    this.decimals = decimals || 18;
    this.totalSupply = initialSupply || 0;

    // Storage
    this.balances = new Map();
    this.allowances = new Map();
    this.owner = this.caller;

    // Mint initial supply to deployer
    if (initialSupply > 0) {
      this.balances.set(this.owner, initialSupply);
      this.emit('Transfer', { from: '0x0', to: this.owner, amount: initialSupply });
    }
  }

  // Standard ERC20 Methods

  balanceOf(address) {
    return this.balances.get(address) || 0;
  }

  transfer(to, amount) {
    const from = this.caller;

    if (!to || to === '0x0') {
      throw new Error('Invalid recipient address');
    }

    const balance = this.balanceOf(from);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Update balances
    this.balances.set(from, balance - amount);
    this.balances.set(to, this.balanceOf(to) + amount);

    this.emit('Transfer', { from, to, amount });
    return true;
  }

  approve(spender, amount) {
    const owner = this.caller;

    if (!spender || spender === '0x0') {
      throw new Error('Invalid spender address');
    }

    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    const key = `${owner}:${spender}`;
    this.allowances.set(key, amount);

    this.emit('Approval', { owner, spender, amount });
    return true;
  }

  transferFrom(from, to, amount) {
    const spender = this.caller;

    if (!from || from === '0x0' || !to || to === '0x0') {
      throw new Error('Invalid address');
    }

    // Check allowance
    const key = `${from}:${spender}`;
    const allowance = this.allowances.get(key) || 0;

    if (allowance < amount) {
      throw new Error('Allowance exceeded');
    }

    // Check balance
    const balance = this.balanceOf(from);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Update allowance
    this.allowances.set(key, allowance - amount);

    // Update balances
    this.balances.set(from, balance - amount);
    this.balances.set(to, this.balanceOf(to) + amount);

    this.emit('Transfer', { from, to, amount });
    return true;
  }

  allowance(owner, spender) {
    const key = `${owner}:${spender}`;
    return this.allowances.get(key) || 0;
  }

  // Extended Methods

  increaseAllowance(spender, addedValue) {
    const owner = this.caller;
    const key = `${owner}:${spender}`;
    const currentAllowance = this.allowances.get(key) || 0;
    const newAllowance = currentAllowance + addedValue;

    this.allowances.set(key, newAllowance);
    this.emit('Approval', { owner, spender, amount: newAllowance });
    return true;
  }

  decreaseAllowance(spender, subtractedValue) {
    const owner = this.caller;
    const key = `${owner}:${spender}`;
    const currentAllowance = this.allowances.get(key) || 0;

    if (currentAllowance < subtractedValue) {
      throw new Error('Decreased allowance below zero');
    }

    const newAllowance = currentAllowance - subtractedValue;
    this.allowances.set(key, newAllowance);
    this.emit('Approval', { owner, spender, amount: newAllowance });
    return true;
  }

  // Minting (only owner)

  mint(to, amount) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can mint');
    }

    if (!to || to === '0x0') {
      throw new Error('Invalid recipient address');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    this.totalSupply += amount;
    this.balances.set(to, this.balanceOf(to) + amount);

    this.emit('Transfer', { from: '0x0', to, amount });
    this.emit('Mint', { to, amount });
    return true;
  }

  // Burning

  burn(amount) {
    const from = this.caller;
    const balance = this.balanceOf(from);

    if (balance < amount) {
      throw new Error('Insufficient balance to burn');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    this.balances.set(from, balance - amount);
    this.totalSupply -= amount;

    this.emit('Transfer', { from, to: '0x0', amount });
    this.emit('Burn', { from, amount });
    return true;
  }

  burnFrom(from, amount) {
    const spender = this.caller;
    const key = `${from}:${spender}`;
    const allowance = this.allowances.get(key) || 0;

    if (allowance < amount) {
      throw new Error('Burn amount exceeds allowance');
    }

    const balance = this.balanceOf(from);
    if (balance < amount) {
      throw new Error('Insufficient balance to burn');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // Update allowance
    this.allowances.set(key, allowance - amount);

    // Burn tokens
    this.balances.set(from, balance - amount);
    this.totalSupply -= amount;

    this.emit('Transfer', { from, to: '0x0', amount });
    this.emit('Burn', { from, amount });
    return true;
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

  renounceOwnership() {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can renounce ownership');
    }

    const oldOwner = this.owner;
    this.owner = '0x0';

    this.emit('OwnershipTransferred', { oldOwner, newOwner: '0x0' });
    return true;
  }

  // View functions

  getOwner() {
    return this.owner;
  }

  getTotalSupply() {
    return this.totalSupply;
  }

  getName() {
    return this.name;
  }

  getSymbol() {
    return this.symbol;
  }

  getDecimals() {
    return this.decimals;
  }
}

module.exports = ERC20Token;
