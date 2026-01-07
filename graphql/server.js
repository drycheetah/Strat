/**
 * GraphQL Server Configuration
 * Apollo Server setup with authentication and subscriptions
 */

const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const jwt = require('jsonwebtoken');
const typeDefs = require('./schema');
const { resolvers } = require('./resolvers');
const logger = require('../utils/logger');

/**
 * Create GraphQL context from request
 */
function createContext({ req, connection }) {
  // WebSocket connection (subscriptions)
  if (connection) {
    return {
      ...connection.context,
      isWebSocket: true
    };
  }

  // HTTP request (queries/mutations)
  const context = {
    blockchain: req.blockchain,
    p2pServer: req.p2pServer,
    io: req.io,
    user: null,
    apiKey: null
  };

  // Extract JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      context.user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      logger.warn('Invalid JWT token in GraphQL request');
    }
  }

  // Extract API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    context.apiKey = apiKey;
    // TODO: Validate API key and load permissions
  }

  return context;
}

/**
 * Format GraphQL errors
 */
function formatError(error) {
  logger.error(`GraphQL Error: ${error.message}`, {
    path: error.path,
    extensions: error.extensions
  });

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    if (error.message.includes('database') || error.message.includes('internal')) {
      return new Error('Internal server error');
    }
  }

  return error;
}

/**
 * Create and configure Apollo Server
 */
function createGraphQLServer(app, httpServer) {
  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    context: createContext,
    formatError,
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    plugins: [
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              logger.error('GraphQL request errors:', requestContext.errors);
            },
            async willSendResponse(requestContext) {
              // Add custom headers
              requestContext.response.http.headers.set('X-GraphQL-Version', '1.0');
            }
          };
        }
      }
    ],
    // Disable subscriptions on Apollo Server (using graphql-ws instead)
    subscriptions: false
  });

  // Start Apollo Server
  apolloServer.start().then(() => {
    apolloServer.applyMiddleware({
      app,
      path: '/api/graphql',
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true
      }
    });

    logger.info('GraphQL endpoint ready at /api/graphql');
    logger.info(`GraphQL Playground available at http://localhost:${process.env.PORT || 3000}/api/graphql`);
  });

  // Setup WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/api/graphql/subscriptions'
  });

  useServer(
    {
      schema,
      context: async (ctx) => {
        const { connectionParams } = ctx;

        // Authentication for WebSocket
        if (connectionParams?.authorization) {
          const token = connectionParams.authorization.replace('Bearer ', '');
          try {
            const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            return { user, isWebSocket: true };
          } catch (error) {
            throw new Error('Invalid authentication token');
          }
        }

        return { isWebSocket: true };
      },
      onConnect: async (ctx) => {
        logger.info('GraphQL WebSocket client connected');
      },
      onDisconnect: async (ctx) => {
        logger.info('GraphQL WebSocket client disconnected');
      }
    },
    wsServer
  );

  logger.info('GraphQL WebSocket server ready at /api/graphql/subscriptions');

  return apolloServer;
}

module.exports = createGraphQLServer;
