/**
 * PancakeSwap V3 Integration for STRAT
 * BSC DEX integration for token swaps and liquidity
 */

const { ethers } = require('ethers');

// PancakeSwap V3 Router ABI (similar to Uniswap V3)
const PANCAKESWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory)',
];

// PancakeSwap V3 Quoter ABI
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];

// ERC20 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

class PancakeSwapIntegration {
  constructor(provider, signer, chainId = 56) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    // PancakeSwap V3 contract addresses
    this.addresses = {
      56: { // BSC Mainnet
        router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
        quoter: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
        factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      },
      97: { // BSC Testnet
        router: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
        quoter: '0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2',
        factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      },
    };

    const chainAddresses = this.addresses[chainId];
    this.router = new ethers.Contract(
      chainAddresses.router,
      PANCAKESWAP_V3_ROUTER_ABI,
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
  async getQuoteExactInput(tokenIn, tokenOut, amountIn, fee = 2500) {
    try {
      const params = {
        tokenIn,
        tokenOut,
        amountIn,
        fee,
        sqrtPriceLimitX96: 0,
      };

      const result = await this.quoter.callStatic.quoteExactInputSingle(params);

      return {
        success: true,
        amountIn,
        amountOut: result.amountOut.toString(),
        gasEstimate: result.gasEstimate.toString(),
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
  async getQuoteExactOutput(tokenIn, tokenOut, amountOut, fee = 2500) {
    try {
      const params = {
        tokenIn,
        tokenOut,
        amount: amountOut,
        fee,
        sqrtPriceLimitX96: 0,
      };

      const result = await this.quoter.callStatic.quoteExactOutputSingle(params);

      return {
        success: true,
        amountIn: result.amountIn.toString(),
        amountOut,
        gasEstimate: result.gasEstimate.toString(),
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
    fee = 2500
  ) {
    try {
      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
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
    fee = 2500
  ) {
    try {
      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
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
   * Get token info
   */
  async getTokenInfo(tokenAddress) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider
      );

      const [decimals, symbol] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
      ]);

      return {
        success: true,
        decimals,
        symbol,
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
  async calculatePriceImpact(tokenIn, tokenOut, amountIn, fee = 2500) {
    try {
      const tokenInfo = await this.getTokenInfo(tokenIn);
      if (!tokenInfo.success) {
        return tokenInfo;
      }

      const oneToken = ethers.utils.parseUnits('1', tokenInfo.decimals);
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
   * Get best swap route
   */
  async getBestRoute(tokenIn, tokenOut, amountIn) {
    try {
      const fees = [100, 500, 2500, 10000]; // Different fee tiers
      const quotes = await Promise.all(
        fees.map(fee => this.getQuoteExactInput(tokenIn, tokenOut, amountIn, fee))
      );

      let bestRoute = null;
      let bestAmountOut = 0;

      quotes.forEach((quote, index) => {
        if (quote.success) {
          const amountOut = parseFloat(quote.amountOut);
          if (amountOut > bestAmountOut) {
            bestAmountOut = amountOut;
            bestRoute = {
              fee: fees[index],
              amountOut: quote.amountOut,
              gasEstimate: quote.gasEstimate,
            };
          }
        }
      });

      if (!bestRoute) {
        return {
          success: false,
          error: 'No valid routes found',
        };
      }

      return {
        success: true,
        route: bestRoute,
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
    fee = 2500
  ) {
    try {
      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
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

  /**
   * Estimate gas for swap
   */
  async estimateSwapGas(
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMinimum,
    recipient,
    fee = 2500
  ) {
    try {
      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0,
      };

      const gasEstimate = await this.router.estimateGas.exactInputSingle(params);

      return {
        success: true,
        gasEstimate: gasEstimate.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = PancakeSwapIntegration;
