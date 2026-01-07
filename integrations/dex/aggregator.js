/**
 * DEX Aggregator for STRAT
 * Finds best prices across multiple DEXes
 */

const UniswapIntegration = require('./uniswap');
const PancakeSwapIntegration = require('./pancakeswap');
const axios = require('axios');

class DEXAggregator {
  constructor(provider, signer, chainId) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    // Initialize DEX integrations based on chain
    this.dexes = {};

    if ([1, 5].includes(chainId)) {
      // Ethereum mainnet/Goerli
      this.dexes.uniswap = new UniswapIntegration(provider, signer, chainId);
    }

    if ([56, 97].includes(chainId)) {
      // BSC mainnet/testnet
      this.dexes.pancakeswap = new PancakeSwapIntegration(provider, signer, chainId);
    }

    // 1inch API endpoints
    this.oneInchAPI = {
      1: 'https://api.1inch.dev/swap/v5.2/1',
      56: 'https://api.1inch.dev/swap/v5.2/56',
      137: 'https://api.1inch.dev/swap/v5.2/137', // Polygon
    };
  }

  /**
   * Get quotes from all available DEXes
   */
  async getAllQuotes(tokenIn, tokenOut, amountIn, options = {}) {
    try {
      const quotes = [];
      const errors = [];

      // Get quotes from each DEX
      for (const [dexName, dex] of Object.entries(this.dexes)) {
        try {
          const quote = await dex.getQuoteExactInput(
            tokenIn,
            tokenOut,
            amountIn,
            options.fee
          );

          if (quote.success) {
            quotes.push({
              dex: dexName,
              amountOut: quote.amountOut,
              amountIn: quote.amountIn,
              gasEstimate: quote.gasEstimate,
            });
          } else {
            errors.push({ dex: dexName, error: quote.error });
          }
        } catch (error) {
          errors.push({ dex: dexName, error: error.message });
        }
      }

      // Try 1inch aggregator if available
      if (this.oneInchAPI[this.chainId] && options.use1inch) {
        try {
          const oneInchQuote = await this.get1inchQuote(
            tokenIn,
            tokenOut,
            amountIn
          );
          if (oneInchQuote.success) {
            quotes.push({
              dex: '1inch',
              amountOut: oneInchQuote.toAmount,
              protocols: oneInchQuote.protocols,
            });
          }
        } catch (error) {
          errors.push({ dex: '1inch', error: error.message });
        }
      }

      return {
        success: true,
        quotes,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Find best quote across all DEXes
   */
  async findBestQuote(tokenIn, tokenOut, amountIn, options = {}) {
    try {
      const result = await this.getAllQuotes(tokenIn, tokenOut, amountIn, options);

      if (!result.success || result.quotes.length === 0) {
        return {
          success: false,
          error: 'No quotes available',
        };
      }

      // Find quote with highest output
      let bestQuote = result.quotes[0];
      for (const quote of result.quotes) {
        if (parseFloat(quote.amountOut) > parseFloat(bestQuote.amountOut)) {
          bestQuote = quote;
        }
      }

      return {
        success: true,
        bestQuote,
        allQuotes: result.quotes,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute swap on best DEX
   */
  async executeSwap(
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut,
    recipient,
    options = {}
  ) {
    try {
      // Find best quote first
      const bestQuoteResult = await this.findBestQuote(
        tokenIn,
        tokenOut,
        amountIn,
        options
      );

      if (!bestQuoteResult.success) {
        return bestQuoteResult;
      }

      const { bestQuote } = bestQuoteResult;

      // Check if output meets minimum
      if (parseFloat(bestQuote.amountOut) < parseFloat(minAmountOut)) {
        return {
          success: false,
          error: 'Best quote does not meet minimum output requirement',
          bestQuote,
        };
      }

      // Execute swap on the best DEX
      const dex = this.dexes[bestQuote.dex];
      if (!dex) {
        return {
          success: false,
          error: `DEX ${bestQuote.dex} not available for swap execution`,
        };
      }

      const swapResult = await dex.swapExactTokensForTokens(
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        recipient,
        options.fee
      );

      return {
        success: swapResult.success,
        dex: bestQuote.dex,
        expectedOutput: bestQuote.amountOut,
        ...swapResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get quote from 1inch aggregator
   */
  async get1inchQuote(tokenIn, tokenOut, amountIn) {
    try {
      const apiUrl = this.oneInchAPI[this.chainId];
      if (!apiUrl) {
        return {
          success: false,
          error: 'Chain not supported by 1inch',
        };
      }

      const params = {
        src: tokenIn,
        dst: tokenOut,
        amount: amountIn.toString(),
      };

      const response = await axios.get(`${apiUrl}/quote`, { params });

      return {
        success: true,
        toAmount: response.data.toAmount,
        fromAmount: response.data.fromAmount,
        protocols: response.data.protocols,
        estimatedGas: response.data.estimatedGas,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  /**
   * Get 1inch swap transaction data
   */
  async get1inchSwap(tokenIn, tokenOut, amountIn, fromAddress, slippage = 1) {
    try {
      const apiUrl = this.oneInchAPI[this.chainId];
      if (!apiUrl) {
        return {
          success: false,
          error: 'Chain not supported by 1inch',
        };
      }

      const params = {
        src: tokenIn,
        dst: tokenOut,
        amount: amountIn.toString(),
        from: fromAddress,
        slippage,
        disableEstimate: true,
      };

      const response = await axios.get(`${apiUrl}/swap`, { params });

      return {
        success: true,
        tx: response.data.tx,
        toAmount: response.data.toAmount,
        protocols: response.data.protocols,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.description || error.message,
      };
    }
  }

  /**
   * Compare prices with savings calculation
   */
  async comparePrices(tokenIn, tokenOut, amountIn, options = {}) {
    try {
      const result = await this.getAllQuotes(tokenIn, tokenOut, amountIn, options);

      if (!result.success || result.quotes.length === 0) {
        return {
          success: false,
          error: 'No quotes available for comparison',
        };
      }

      // Sort by output amount
      const sortedQuotes = result.quotes.sort(
        (a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut)
      );

      const best = sortedQuotes[0];
      const worst = sortedQuotes[sortedQuotes.length - 1];

      const savingsAmount =
        parseFloat(best.amountOut) - parseFloat(worst.amountOut);
      const savingsPercent =
        (savingsAmount / parseFloat(worst.amountOut)) * 100;

      return {
        success: true,
        comparison: {
          best: {
            dex: best.dex,
            amountOut: best.amountOut,
          },
          worst: {
            dex: worst.dex,
            amountOut: worst.amountOut,
          },
          savings: {
            amount: savingsAmount.toString(),
            percent: savingsPercent.toFixed(2),
          },
        },
        allQuotes: sortedQuotes,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get optimal route with gas consideration
   */
  async getOptimalRoute(tokenIn, tokenOut, amountIn, gasPrice, options = {}) {
    try {
      const result = await this.getAllQuotes(tokenIn, tokenOut, amountIn, options);

      if (!result.success || result.quotes.length === 0) {
        return {
          success: false,
          error: 'No quotes available',
        };
      }

      // Calculate net output after gas costs
      const quotesWithGas = result.quotes.map(quote => {
        const gasEstimate = quote.gasEstimate || 200000; // Default estimate
        const gasCost = parseFloat(gasPrice) * parseFloat(gasEstimate);
        const netOutput = parseFloat(quote.amountOut) - gasCost;

        return {
          ...quote,
          gasCost: gasCost.toString(),
          netOutput: netOutput.toString(),
        };
      });

      // Find best net output
      const optimal = quotesWithGas.reduce((best, current) =>
        parseFloat(current.netOutput) > parseFloat(best.netOutput)
          ? current
          : best
      );

      return {
        success: true,
        optimalRoute: optimal,
        allRoutesWithGas: quotesWithGas,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Approve tokens for all DEXes
   */
  async approveAllDEXes(tokenAddress, amount) {
    try {
      const approvals = [];
      const errors = [];

      for (const [dexName, dex] of Object.entries(this.dexes)) {
        try {
          const result = await dex.approveToken(tokenAddress, amount);
          approvals.push({
            dex: dexName,
            success: result.success,
            transactionHash: result.transactionHash,
          });
        } catch (error) {
          errors.push({ dex: dexName, error: error.message });
        }
      }

      return {
        success: true,
        approvals,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = DEXAggregator;
