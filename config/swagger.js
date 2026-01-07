/**
 * OpenAPI/Swagger Configuration for STRAT Enterprise API
 * Comprehensive API documentation with authentication, versioning, and examples
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'STRAT Enterprise Blockchain API',
    version: '1.0.0',
    description: 'Enterprise-grade REST API for STRAT blockchain platform with comprehensive features for DeFi, NFTs, governance, social features, and enterprise integrations',
    contact: {
      name: 'STRAT API Support',
      email: 'api-support@strat.io',
      url: 'https://strat.io/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    },
    termsOfService: 'https://strat.io/terms'
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server'
    },
    {
      url: 'https://api.strat.io/v1',
      description: 'Production server'
    },
    {
      url: 'https://sandbox.api.strat.io/v1',
      description: 'Sandbox server'
    }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication'
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authenticated users'
      },
      OAuth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://auth.strat.io/oauth/authorize',
            tokenUrl: 'https://auth.strat.io/oauth/token',
            scopes: {
              'read:blockchain': 'Read blockchain data',
              'write:transactions': 'Create and submit transactions',
              'read:wallet': 'Read wallet information',
              'write:wallet': 'Manage wallet',
              'read:contracts': 'Read smart contracts',
              'write:contracts': 'Deploy and execute smart contracts',
              'admin': 'Full administrative access'
            }
          }
        }
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          code: {
            type: 'string',
            description: 'Error code'
          },
          details: {
            type: 'object',
            description: 'Additional error details'
          },
          timestamp: {
            type: 'integer',
            description: 'Error timestamp'
          },
          requestId: {
            type: 'string',
            description: 'Request ID for tracking'
          }
        }
      },
      Transaction: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Transaction hash'
          },
          from: {
            type: 'string',
            description: 'Sender address'
          },
          to: {
            type: 'string',
            description: 'Recipient address'
          },
          amount: {
            type: 'number',
            description: 'Transaction amount'
          },
          fee: {
            type: 'number',
            description: 'Transaction fee'
          },
          timestamp: {
            type: 'integer',
            description: 'Transaction timestamp'
          },
          blockHeight: {
            type: 'integer',
            description: 'Block height where transaction was included'
          },
          confirmations: {
            type: 'integer',
            description: 'Number of confirmations'
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'failed'],
            description: 'Transaction status'
          }
        }
      },
      Block: {
        type: 'object',
        properties: {
          index: {
            type: 'integer',
            description: 'Block height'
          },
          hash: {
            type: 'string',
            description: 'Block hash'
          },
          previousHash: {
            type: 'string',
            description: 'Previous block hash'
          },
          timestamp: {
            type: 'integer',
            description: 'Block timestamp'
          },
          transactions: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Transaction'
            }
          },
          merkleRoot: {
            type: 'string',
            description: 'Merkle root of transactions'
          },
          nonce: {
            type: 'integer',
            description: 'Proof of work nonce'
          },
          difficulty: {
            type: 'integer',
            description: 'Mining difficulty'
          },
          miner: {
            type: 'string',
            description: 'Miner address'
          },
          reward: {
            type: 'number',
            description: 'Block reward'
          }
        }
      },
      Wallet: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Wallet address'
          },
          balance: {
            type: 'number',
            description: 'Wallet balance'
          },
          publicKey: {
            type: 'string',
            description: 'Public key'
          },
          nonce: {
            type: 'integer',
            description: 'Transaction nonce'
          }
        }
      },
      SmartContract: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Contract address'
          },
          code: {
            type: 'string',
            description: 'Contract bytecode'
          },
          abi: {
            type: 'array',
            description: 'Contract ABI'
          },
          owner: {
            type: 'string',
            description: 'Contract owner address'
          },
          createdAt: {
            type: 'integer',
            description: 'Creation timestamp'
          },
          balance: {
            type: 'number',
            description: 'Contract balance'
          }
        }
      },
      APIKey: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'API key'
          },
          name: {
            type: 'string',
            description: 'Key name/label'
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'API key permissions'
          },
          rateLimit: {
            type: 'object',
            properties: {
              requests: {
                type: 'integer',
                description: 'Requests per period'
              },
              period: {
                type: 'string',
                description: 'Time period (minute, hour, day)'
              }
            }
          },
          createdAt: {
            type: 'integer',
            description: 'Creation timestamp'
          },
          expiresAt: {
            type: 'integer',
            description: 'Expiration timestamp'
          },
          lastUsed: {
            type: 'integer',
            description: 'Last usage timestamp'
          }
        }
      }
    },
    parameters: {
      ApiVersion: {
        name: 'X-API-Version',
        in: 'header',
        description: 'API version',
        schema: {
          type: 'string',
          default: '1.0'
        }
      },
      Page: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      Limit: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        }
      },
      SortBy: {
        name: 'sortBy',
        in: 'query',
        description: 'Field to sort by',
        schema: {
          type: 'string'
        }
      },
      SortOrder: {
        name: 'sortOrder',
        in: 'query',
        description: 'Sort order',
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc'
        }
      }
    },
    responses: {
      Unauthorized: {
        description: 'Unauthorized - Invalid or missing API key/token',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found - Resource does not exist',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Blockchain',
      description: 'Blockchain data and operations'
    },
    {
      name: 'Transactions',
      description: 'Transaction management'
    },
    {
      name: 'Wallets',
      description: 'Wallet operations'
    },
    {
      name: 'Smart Contracts',
      description: 'Smart contract deployment and execution'
    },
    {
      name: 'Mining',
      description: 'Mining operations and pool management'
    },
    {
      name: 'Staking',
      description: 'Staking and rewards'
    },
    {
      name: 'NFT',
      description: 'NFT minting and marketplace'
    },
    {
      name: 'Governance',
      description: 'DAO governance and voting'
    },
    {
      name: 'DeFi',
      description: 'DeFi features (DEX, lending, liquidity)'
    },
    {
      name: 'Enterprise',
      description: 'Enterprise features and integrations'
    },
    {
      name: 'Compliance',
      description: 'KYC/AML and compliance'
    },
    {
      name: 'API Management',
      description: 'API key and access management'
    }
  ],
  security: [
    {
      ApiKeyAuth: []
    },
    {
      BearerAuth: []
    }
  ]
};

const swaggerOptions = {
  swaggerDefinition,
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './models/*.js'
  ]
};

module.exports = {
  swaggerDefinition,
  swaggerOptions
};
