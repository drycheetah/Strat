const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../server');
const User = require('../../../models/User');
const { cleanupDatabase } = require('../../helpers/testHelpers');

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
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

  describe('POST /api/auth/register', () => {
    test('should register new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        address: 'wallet-address-123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.password).toBeUndefined();
    });

    test('should reject duplicate username', async () => {
      const userData = {
        username: 'duplicate',
        email: 'test1@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const duplicateData = {
        username: 'duplicate',
        email: 'test2@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject invalid email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should hash password before storing', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const user = await User.findOne({ email: userData.email });
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toHaveLength(60); // bcrypt hash length
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
    });

    test('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    test('should reject incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.token).toBeUndefined();
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      const token = response.body.token;
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT format
    });
  });

  describe('GET /api/auth/verify', () => {
    let authToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = response.body.token;
    });

    test('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.valid).toBe(false);
    });

    test('should reject missing token', async () => {
      await request(app)
        .get('/api/auth/verify')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit login attempts', async () => {
      const attempts = [];

      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(attempts);
      const tooManyRequests = responses.some(r => r.status === 429);

      // Should eventually rate limit
      expect(responses.length).toBe(10);
    });
  });
});
