/**
 * Uniswap V3 Integration for STRAT
 * Decentralized exchange integration for token swaps and liquidity
 */

const { ethers } = require('ethers');

// Uniswap V3 Router ABI (simplified)
const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)',
];

// Uniswap V3 Quoter ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
  'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)',
];

// ERC20 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
];

class UniswapIntegration {
  constructor(provider, signer, chainId = 1) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    // Uniswap V3 contract addresses
    this.addresses = {
      1: { // Mainnet
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      },
      5: { // Goerli
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      },
    };

    const chainAddresses = this.addresses[chainId];
    this.router = new ethers.Contract(
      chainAddresses.router,
      UNISWAP_V3_ROUTER_ABI,
      signer
    );
    this.quoter = new ethers.Contract(
      chainAddresses.quoter,
      QUOTER_ABI,
      provider
    );
  }

  /**
   * Get quote for exact input swap
   */
  async getQuoteExactInput(tokenIn, tokenOut, amountIn, fee = 3000) {
    try {
      const amountOut = await this.quoter.callStatic.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        0
      );
      return {
        success: true,
        amountIn,
        amountOut: amountOut.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get quote for exact output swap
   */
  async getQuoteExactOutput(tokenIn, tokenOut, amountOut, fee = 3000) {
    try {
      const amountIn = await this.quoter.callStatic.quoteExactOutputSingle(
        tokenIn,
        tokenOut,
        fee,
        amountOut,
        0
      );
      return {
        success: true,
        amountIn: amountIn.toString(),
        amountOut,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Approve token spending
   */
  async approveToken(tokenAddress, amount = ethers.constants.MaxUint256) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.signer
      );

      const chainAddresses = this.addresses[this.chainId];
      const tx = await tokenContract.approve(chainAddresses.router, amount);
      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check token allowance
   */
  async checkAllowance(tokenAddress, ownerAddress) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      const chainAddresses = this.addresses[this.chainId];
      const allowance = await tokenContract.allowance(
        ownerAddress,
        chainAddresses.router
      );

      return {
        success: true,
        allowance: allowance.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Swap exact tokens for tokens
   */
  async swapExactTokensForTokens(
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMinimum,
    recipient,
    fee = 3000,
    deadline = null
  ) {
    try {
      if (!deadline) {
        deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      }

      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        deadline,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0,
      };

      const tx = await this.router.exactInputSingle(params);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
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
   * Swap tokens for exact tokens
   */
  async swapTokensForExactTokens(
    tokenIn,
    tokenOut,
    amountOut,
    amountInMaximum,
    recipient,
    fee = 3000,
    deadline = null
  ) {
    try {
      if (!deadline) {
        deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      }

      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        deadline,
        amountOut,
        amountInMaximum,
        sqrtPriceLimitX96: 0,
      };

      const tx = await this.router.exactOutputSingle(params);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
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
   * Get token balance
   */
  async getTokenBalance(tokenAddress, accountAddress) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      const balance = await tokenContract.balanceOf(accountAddress);

      return {
        success: true,
        balance: balance.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(tokenAddress) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      const decimals = await tokenContract.decimals();

      return {
        success: true,
        decimals,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate price impact
   */
  async calculatePriceImpact(tokenIn, tokenOut, amountIn, fee = 3000) {
    try {
      // Get quote for small amount to get base price
      const decimalsResult = await this.getTokenDecimals(tokenIn);
      if (!decimalsResult.success) {
        return decimalsResult;
      }

      const oneToken = ethers.utils.parseUnits('1', decimalsResult.decimals);
      const baseQuote = await this.getQuoteExactInput(
        tokenIn,
        tokenOut,
        oneToken,
        fee
      );

      if (!baseQuote.success) {
        return baseQuote;
      }

      const actualQuote = await this.getQuoteExactInput(
        tokenIn,
        tokenOut,
        amountIn,
        fee
      );

      if (!actualQuote.success) {
        return actualQuote;
      }

      const basePrice =
        parseFloat(baseQuote.amountOut) / parseFloat(oneToken.toString());
      const actualPrice =
        parseFloat(actualQuote.amountOut) / parseFloat(amountIn.toString());

      const priceImpact = ((basePrice - actualPrice) / basePrice) * 100;

      return {
        success: true,
        priceImpact: priceImpact.toFixed(2),
        basePrice,
        actualPrice,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build swap transaction (for use with wallet integrations)
   */
  async buildSwapTransaction(
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMinimum,
    recipient,
    fee = 3000
  ) {
    try {
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        deadline,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0,
      };

      const chainAddresses = this.addresses[this.chainId];
      const tx = await this.router.populateTransaction.exactInputSingle(params);

      return {
        success: true,
        to: chainAddresses.router,
        data: tx.data,
        value: '0',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = UniswapIntegration;
