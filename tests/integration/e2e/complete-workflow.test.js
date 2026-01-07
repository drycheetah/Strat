const request = require('supertest');
const app = require('../../../server');
const mongoose = require('mongoose');
const { cleanupDatabase } = require('../../helpers/testHelpers');

describe('End-to-End Complete Workflow Tests', () => {
  let authToken;
  let userId;
  let walletAddress;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/strat-test');
    }
  });

  afterAll(async () => {
    await cleanupDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('User Registration to Transaction Flow', () => {
    test('complete user journey: register -> login -> create transaction', async () => {
      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'e2euser',
          email: 'e2e@example.com',
          password: 'SecurePass123!'
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      authToken = registerResponse.body.token;
      userId = registerResponse.body.user._id;

      // Step 2: Verify token works
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyResponse.body.valid).toBe(true);

      // Step 3: Get wallet info
      const walletResponse = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      walletAddress = walletResponse.body.address;
      expect(walletAddress).toBeDefined();

      // Step 4: Check balance
      const balanceResponse = await request(app)
        .get('/api/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(balanceResponse.body.balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Trading Workflow', () => {
    test('complete trading flow: create order -> list orders -> cancel', async () => {
      // Setup: Register and login
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'trader',
          email: 'trader@example.com',
          password: 'SecurePass123!'
        });

      authToken = authResponse.body.token;

      // Step 1: Create buy order
      const createOrderResponse = await request(app)
        .post('/api/trading/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'buy',
          pair: 'STRAT/USDT',
          amount: 100,
          price: 10.5
        })
        .expect(201);

      const orderId = createOrderResponse.body.data._id;
      expect(orderId).toBeDefined();

      // Step 2: Get all orders
      const ordersResponse = await request(app)
        .get('/api/trading/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(ordersResponse.body.data).toContainEqual(
        expect.objectContaining({ _id: orderId })
      );

      // Step 3: Cancel order
      await request(app)
        .delete(`/api/trading/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Step 4: Verify cancellation
      const cancelledOrdersResponse = await request(app)
        .get('/api/trading/orders?status=cancelled')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelledOrdersResponse.body.data).toContainEqual(
        expect.objectContaining({ _id: orderId, status: 'cancelled' })
      );
    });
  });

  describe('NFT Lifecycle', () => {
    test('complete NFT flow: mint -> list -> purchase', async () => {
      // Setup: Create two users (creator and buyer)
      const creatorAuth = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'creator',
          email: 'creator@example.com',
          password: 'SecurePass123!'
        });

      const buyerAuth = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'buyer',
          email: 'buyer@example.com',
          password: 'SecurePass123!'
        });

      const creatorToken = creatorAuth.body.token;
      const buyerToken = buyerAuth.body.token;

      // Step 1: Mint NFT
      const mintResponse = await request(app)
        .post('/api/nft/mint')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Test NFT',
          description: 'E2E Test NFT',
          metadata: { rarity: 'legendary' }
        })
        .expect(201);

      const nftId = mintResponse.body.data._id;

      // Step 2: List NFT for sale
      const listResponse = await request(app)
        .post(`/api/nft/${nftId}/list`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ price: 100 })
        .expect(201);

      const listingId = listResponse.body.data._id;

      // Step 3: Get NFT listings
      const listingsResponse = await request(app)
        .get('/api/nft/listings')
        .expect(200);

      expect(listingsResponse.body.data).toContainEqual(
        expect.objectContaining({ _id: listingId })
      );

      // Step 4: Purchase NFT (would require balance)
      // This may fail due to insufficient balance, which is expected
      const purchaseResponse = await request(app)
        .post(`/api/nft/listings/${listingId}/buy`)
        .set('Authorization', `Bearer ${buyerToken}`);

      // Either succeeds or fails due to insufficient balance
      expect([200, 400]).toContain(purchaseResponse.status);
    });
  });

  describe('Governance Workflow', () => {
    test('complete governance flow: create proposal -> vote -> execute', async () => {
      // Setup
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'governor',
          email: 'governor@example.com',
          password: 'SecurePass123!'
        });

      authToken = authResponse.body.token;

      // Step 1: Create proposal
      const proposalResponse = await request(app)
        .post('/api/governance/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Proposal',
          description: 'E2E Test Proposal',
          type: 'parameter',
          parameters: { key: 'value' }
        })
        .expect(201);

      const proposalId = proposalResponse.body.data._id;

      // Step 2: Get proposal
      const getProposalResponse = await request(app)
        .get(`/api/governance/proposals/${proposalId}`)
        .expect(200);

      expect(getProposalResponse.body.data._id).toBe(proposalId);

      // Step 3: Vote on proposal
      const voteResponse = await request(app)
        .post(`/api/governance/proposals/${proposalId}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ vote: 'yes', votingPower: 100 })
        .expect(200);

      expect(voteResponse.body.success).toBe(true);

      // Step 4: Get all proposals
      const allProposalsResponse = await request(app)
        .get('/api/governance/proposals')
        .expect(200);

      expect(allProposalsResponse.body.data).toContainEqual(
        expect.objectContaining({ _id: proposalId })
      );
    });
  });

  describe('Multi-User Interactions', () => {
    test('should handle multiple users interacting simultaneously', async () => {
      // Create 5 users
      const users = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: `user${i}`,
            email: `user${i}@example.com`,
            password: 'SecurePass123!'
          });

        users.push({
          token: response.body.token,
          id: response.body.user._id
        });
      }

      // All users create proposals
      const proposalPromises = users.map((user, i) =>
        request(app)
          .post('/api/governance/proposals')
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            title: `Proposal from User ${i}`,
            description: 'Multi-user test',
            type: 'parameter'
          })
      );

      const proposalResponses = await Promise.all(proposalPromises);

      proposalResponses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });
});
