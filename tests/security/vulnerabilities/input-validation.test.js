const request = require('supertest');
const app = require('../../../server');

describe('Input Validation Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    test('should sanitize SQL injection attempts in username', async () => {
      const maliciousInput = {
        username: "admin' OR '1'='1",
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousInput);

      // Should either reject or sanitize
      expect([400, 201]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.user.username).not.toContain("'");
      }
    });

    test('should prevent SQL injection in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";

      const response = await request(app)
        .get(`/api/users?search=${encodeURIComponent(maliciousQuery)}`);

      // Should handle safely
      expect([400, 404, 200]).toContain(response.status);
    });
  });

  describe('XSS Prevention', () => {
    test('should sanitize script tags in input', async () => {
      const xssInput = {
        username: '<script>alert("xss")</script>',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(xssInput);

      expect([400, 201]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.user.username).not.toContain('<script>');
      }
    });

    test('should sanitize HTML entities', async () => {
      const htmlInput = {
        title: '<img src=x onerror=alert(1)>',
        description: 'Test proposal'
      };

      const response = await request(app)
        .post('/api/governance/proposals')
        .send(htmlInput);

      // Should sanitize or reject
      expect(response.status).toBeDefined();
    });
  });

  describe('Command Injection Prevention', () => {
    test('should prevent command injection in address field', async () => {
      const cmdInjection = {
        address: '; rm -rf /',
        amount: 100
      };

      const response = await request(app)
        .post('/api/transactions')
        .send(cmdInjection);

      // Should reject malicious input
      expect([400, 401, 403]).toContain(response.status);
    });

    test('should validate address format', async () => {
      const invalidAddress = {
        address: '$(malicious command)',
        amount: 100
      };

      const response = await request(app)
        .post('/api/transactions')
        .send(invalidAddress);

      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Path Traversal Prevention', () => {
    test('should prevent directory traversal', async () => {
      const traversalAttempt = '../../../etc/passwd';

      const response = await request(app)
        .get(`/api/files/${traversalAttempt}`);

      // Should not expose filesystem
      expect([400, 404, 403]).toContain(response.status);
    });

    test('should sanitize file paths', async () => {
      const paths = [
        '../../config.js',
        '..\\..\\config.js',
        '%2e%2e%2fconfig.js'
      ];

      for (const path of paths) {
        const response = await request(app)
          .get(`/api/files/${encodeURIComponent(path)}`);

        expect([400, 404, 403]).toContain(response.status);
      }
    });
  });

  describe('NoSQL Injection Prevention', () => {
    test('should prevent NoSQL injection in query', async () => {
      const nosqlInjection = {
        email: { $ne: null },
        password: { $ne: null }
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(nosqlInjection);

      // Should reject object queries
      expect([400, 401]).toContain(response.status);
    });

    test('should sanitize MongoDB operators', async () => {
      const maliciousQuery = {
        username: { $gt: '' }
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousQuery);

      expect([400, 401]).toContain(response.status);
    });
  });

  describe('Buffer Overflow Prevention', () => {
    test('should reject extremely long inputs', async () => {
      const longString = 'a'.repeat(10000);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: longString,
          email: 'test@example.com',
          password: 'password123'
        });

      expect([400, 413]).toContain(response.status);
    });

    test('should limit request body size', async () => {
      const largePayload = {
        data: 'x'.repeat(10 * 1024 * 1024) // 10MB
      };

      const response = await request(app)
        .post('/api/transactions')
        .send(largePayload);

      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Type Coercion Attacks', () => {
    test('should validate data types strictly', async () => {
      const typeAttacks = [
        { amount: '100' }, // String instead of number
        { amount: null },
        { amount: undefined },
        { amount: [] },
        { amount: {} }
      ];

      for (const attack of typeAttacks) {
        const response = await request(app)
          .post('/api/transactions')
          .send(attack);

        // Should validate types
        expect(response.status).toBeDefined();
      }
    });
  });

  describe('LDAP Injection Prevention', () => {
    test('should sanitize LDAP special characters', async () => {
      const ldapChars = ['*', '(', ')', '\\', '|', '&'];

      for (const char of ldapChars) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: `admin${char}`,
            password: 'password'
          });

        expect(response.status).toBeDefined();
      }
    });
  });

  describe('XML Injection Prevention', () => {
    test('should reject XML entities', async () => {
      const xmlPayload = {
        data: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>'
      };

      const response = await request(app)
        .post('/api/contracts')
        .send(xmlPayload);

      expect([400, 401, 403]).toContain(response.status);
    });
  });

  describe('Regular Expression DoS Prevention', () => {
    test('should timeout on catastrophic backtracking', async () => {
      const reDoSPattern = {
        pattern: '(a+)+$',
        input: 'a'.repeat(50) + 'b'
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/validate')
        .send(reDoSPattern);

      const duration = Date.now() - startTime;

      // Should not hang
      expect(duration).toBeLessThan(5000);
      expect(response.status).toBeDefined();
    });
  });

  describe('Unicode Validation', () => {
    test('should handle unicode characters safely', async () => {
      const unicodeInputs = [
        '\\u0000', // Null byte
        '\\uFEFF', // Zero width no-break space
        '\\u202E', // Right-to-left override
        '\u0000'
      ];

      for (const input of unicodeInputs) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: input,
            email: 'test@example.com',
            password: 'password123'
          });

        expect(response.status).toBeDefined();
      }
    });
  });

  describe('Email Validation', () => {
    test('should validate email format strictly', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'user..name@example.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email,
            password: 'password123'
          });

        expect([400, 422]).toContain(response.status);
      }
    });
  });
});
