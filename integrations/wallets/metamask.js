/**
 * MetaMask Wallet Integration for STRAT
 * Browser-based wallet integration using Web3 provider
 */

class MetaMaskIntegration {
  constructor() {
    this.provider = null;
    this.account = null;
    this.chainId = null;
  }

  /**
   * Check if MetaMask is installed
   */
  isInstalled() {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * Connect to MetaMask
   */
  async connect() {
    try {
      if (!this.isInstalled()) {
        return {
          success: false,
          error: 'MetaMask is not installed',
        };
      }

      this.provider = window.ethereum;

      // Request account access
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts',
      });

      this.account = accounts[0];

      // Get chain ID
      const chainId = await this.provider.request({
        method: 'eth_chainId',
      });
      this.chainId = parseInt(chainId, 16);

      // Set up event listeners
      this._setupEventListeners();

      return {
        success: true,
        account: this.account,
        chainId: this.chainId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Disconnect from MetaMask
   */
  disconnect() {
    this.account = null;
    this.provider = null;
    this.chainId = null;
    return { success: true };
  }

  /**
   * Get connected account
   */
  getAccount() {
    return this.account;
  }

  /**
   * Get current chain ID
   */
  getChainId() {
    return this.chainId;
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(chainId) {
    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      this.chainId = chainId;

      return {
        success: true,
        chainId,
      };
    } catch (error) {
      // If chain doesn't exist, try to add it
      if (error.code === 4902) {
        return {
          success: false,
          error: 'Chain not added to MetaMask',
          needsAdd: true,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add custom network to MetaMask
   */
  async addNetwork(networkConfig) {
    try {
      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      });

      return {
        success: true,
        chainId: parseInt(networkConfig.chainId, 16),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add STRAT token to MetaMask
   */
  async addSTRATToken(tokenAddress, tokenSymbol = 'STRAT', tokenDecimals = 18) {
    try {
      const wasAdded = await this.provider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
          },
        },
      });

      return {
        success: wasAdded,
        added: wasAdded,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address = null) {
    try {
      const accountAddress = address || this.account;
      const balance = await this.provider.request({
        method: 'eth_getBalance',
        params: [accountAddress, 'latest'],
      });

      return {
        success: true,
        balance: parseInt(balance, 16).toString(),
        balanceInEth: (parseInt(balance, 16) / 1e18).toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(to, value, data = '0x') {
    try {
      const txParams = {
        from: this.account,
        to,
        value: `0x${parseInt(value).toString(16)}`,
        data,
      };

      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      return {
        success: true,
        transactionHash: txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sign message
   */
  async signMessage(message) {
    try {
      const signature = await this.provider.request({
        method: 'personal_sign',
        params: [message, this.account],
      });

      return {
        success: true,
        signature,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sign typed data (EIP-712)
   */
  async signTypedData(domain, types, value) {
    try {
      const msgParams = JSON.stringify({
        domain,
        types,
        primaryType: Object.keys(types)[0],
        message: value,
      });

      const signature = await this.provider.request({
        method: 'eth_signTypedData_v4',
        params: [this.account, msgParams],
      });

      return {
        success: true,
        signature,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Request permissions
   */
  async requestPermissions() {
    try {
      const permissions = await this.provider.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      return {
        success: true,
        permissions,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    try {
      const receipt = await this.provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      return {
        success: true,
        receipt,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(txParams) {
    try {
      const gas = await this.provider.request({
        method: 'eth_estimateGas',
        params: [txParams],
      });

      return {
        success: true,
        gas: parseInt(gas, 16).toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set up event listeners for account and chain changes
   */
  _setupEventListeners() {
    // Account changed
    this.provider.on('accountsChanged', accounts => {
      this.account = accounts[0] || null;
      if (this.onAccountChanged) {
        this.onAccountChanged(this.account);
      }
    });

    // Chain changed
    this.provider.on('chainChanged', chainId => {
      this.chainId = parseInt(chainId, 16);
      if (this.onChainChanged) {
        this.onChainChanged(this.chainId);
      }
    });

    // Disconnect
    this.provider.on('disconnect', error => {
      this.account = null;
      if (this.onDisconnect) {
        this.onDisconnect(error);
      }
    });
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers) {
    if (handlers.onAccountChanged) {
      this.onAccountChanged = handlers.onAccountChanged;
    }
    if (handlers.onChainChanged) {
      this.onChainChanged = handlers.onChainChanged;
    }
    if (handlers.onDisconnect) {
      this.onDisconnect = handlers.onDisconnect;
    }
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MetaMaskIntegration;
} else if (typeof window !== 'undefined') {
  window.MetaMaskIntegration = MetaMaskIntegration;
}
