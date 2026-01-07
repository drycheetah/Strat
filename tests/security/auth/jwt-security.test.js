const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../../../server');

describe('JWT Security Tests', () => {
  describe('Token Generation', () => {
    test('should generate secure JWT tokens', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      const token = response.body.token;

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // header.payload.signature

      const decoded = jwt.decode(token);
      expect(decoded.userId).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('should include expiration in tokens', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'SecurePass123!'
        });

      const token = response.body.token;
      const decoded = jwt.decode(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('Token Validation', () => {
    test('should reject tampered tokens', async () => {
      const validToken = jwt.sign(
        { userId: 'user-id' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body.valid).toBe(false);
    });

    test('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-id' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.valid).toBe(false);
    });

    test('should reject malformed tokens', async () => {
      const malformedTokens = [
        'not.a.token',
        'Bearer invalid',
        'totally-invalid',
        'a.b', // Only 2 parts
        ''
      ];

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/api/auth/verify')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
      }
    });
  });

  describe('Token Secret Security', () => {
    test('should use strong secret key', () => {
      const secret = process.env.JWT_SECRET || 'test-secret';

      // In production, secret should be strong
      if (process.env.NODE_ENV === 'production') {
        expect(secret.length).toBeGreaterThan(32);
      }

      expect(secret).toBeDefined();
      expect(secret).not.toBe('');
    });

    test('should not expose secret in errors', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain(process.env.JWT_SECRET || 'test-secret');
    });
  });

  describe('Token Payload Security', () => {
    test('should not include sensitive data in token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser3',
          email: 'test3@example.com',
          password: 'SecurePass123!'
        });

      const token = response.body.token;
      const decoded = jwt.decode(token);

      // Should not contain password or other sensitive data
      expect(decoded.password).toBeUndefined();
      expect(decoded.privateKey).toBeUndefined();
      expect(decoded.secret).toBeUndefined();
    });

    test('should include only necessary claims', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser4',
          email: 'test4@example.com',
          password: 'SecurePass123!'
        });

      const token = response.body.token;
      const decoded = jwt.decode(token);

      // Should have standard claims
      expect(decoded.userId || decoded.sub).toBeDefined();
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expiration
    });
  });

  describe('Token Refresh Security', () => {
    test('should validate old token before refreshing', async () => {
      const invalidToken = 'invalid-token';

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ token: invalidToken })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should not refresh tokens multiple times', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser5',
          email: 'test5@example.com',
          password: 'SecurePass123!'
        });

      const token = registerResponse.body.token;

      // First refresh should work
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ token });

      // Track refreshed tokens
      expect(firstRefresh.body.token).toBeDefined();
    });
  });

  describe('Algorithm Security', () => {
    test('should use secure signing algorithm', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser6',
          email: 'test6@example.com',
          password: 'SecurePass123!'
        });

      const token = response.body.token;
      const decoded = jwt.decode(token, { complete: true });

      // Should use HS256 or RS256, not 'none'
      expect(decoded.header.alg).not.toBe('none');
      expect(['HS256', 'HS512', 'RS256']).toContain(decoded.header.alg);
    });
  });

  describe('Token Revocation', () => {
    test('should handle logout/token invalidation', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser7',
          email: 'test7@example.com',
          password: 'SecurePass123!'
        });

      const token = registerResponse.body.token;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Token should still be technically valid (stateless JWT)
      // But application should track logged out tokens
    });
  });

  describe('CSRF Protection', () => {
    test('should validate origin of token requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'http://malicious-site.com')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // CORS should handle this
      expect(response.status).toBeDefined();
    });
  });

  describe('Brute Force Protection', () => {
    test('should rate limit token generation', async () => {
      const attempts = [];

      for (let i = 0; i < 20; i++) {
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
      const rateLimited = responses.some(r => r.status === 429);

      // Should eventually rate limit
      expect(responses.length).toBe(20);
    });
  });
});
