const authController = require('../../../controllers/authController');
const User = require('../../../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { mockRequest, mockResponse, mockNext } = require('../../helpers/testHelpers');

jest.mock('../../../models/User');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register new user successfully', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        address: 'wallet-address'
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      bcrypt.hash = jest.fn().mockResolvedValue('hashed-password');
      jwt.sign = jest.fn().mockReturnValue('jwt-token');

      const mockUser = {
        _id: 'user-id',
        username: req.body.username,
        email: req.body.email,
        address: req.body.address,
        save: jest.fn().mockResolvedValue(true)
      };

      User.mockImplementation(() => mockUser);

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: expect.any(String)
        })
      );
    });

    test('should reject duplicate username', async () => {
      req.body = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'password123'
      };

      User.findOne = jest.fn().mockResolvedValue({ username: 'existinguser' });

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should reject duplicate email', async () => {
      req.body = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123'
      };

      User.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ email: 'existing@example.com' });

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should hash password before saving', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'plaintext'
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      bcrypt.hash = jest.fn().mockResolvedValue('hashed-password');
      jwt.sign = jest.fn().mockReturnValue('token');

      const mockUser = {
        save: jest.fn().mockResolvedValue(true)
      };

      User.mockImplementation(() => mockUser);

      await authController.register(req, res, next);

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', expect.any(Number));
    });

    test('should validate required fields', async () => {
      req.body = { username: 'testuser' };

      await authController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    test('should login user with correct credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        address: 'wallet-address'
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('jwt-token');

      await authController.login(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'jwt-token'
        })
      );
    });

    test('should reject login with wrong password', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        email: 'test@example.com',
        password: 'hashed-password'
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should reject login for non-existent user', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findOne = jest.fn().mockResolvedValue(null);

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should include user data in response', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed-password',
        toObject: jest.fn().mockReturnValue({
          _id: 'user-id',
          email: 'test@example.com',
          username: 'testuser'
        })
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('token');

      await authController.login(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.any(Object)
        })
      );
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      jwt.verify = jest.fn().mockReturnValue({
        userId: 'user-id',
        address: 'wallet-address'
      });

      const mockUser = {
        _id: 'user-id',
        address: 'wallet-address'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await authController.verifyToken(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          valid: true
        })
      );
    });

    test('should reject invalid token', async () => {
      req.headers = { authorization: 'Bearer invalid-token' };

      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should reject missing token', async () => {
      req.headers = {};

      await authController.verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('refreshToken', () => {
    test('should refresh valid token', async () => {
      req.body = { token: 'old-token' };

      jwt.verify = jest.fn().mockReturnValue({
        userId: 'user-id',
        address: 'wallet-address'
      });

      jwt.sign = jest.fn().mockReturnValue('new-token');

      await authController.refreshToken(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'new-token'
        })
      );
    });

    test('should reject expired token', async () => {
      req.body = { token: 'expired-token' };

      jwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authController.refreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('changePassword', () => {
    test('should change password with correct old password', async () => {
      req.user = { userId: 'user-id' };
      req.body = {
        oldPassword: 'oldpass',
        newPassword: 'newpass'
      };

      const mockUser = {
        _id: 'user-id',
        password: 'hashed-old-password',
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      bcrypt.hash = jest.fn().mockResolvedValue('hashed-new-password');

      await authController.changePassword(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should reject password change with wrong old password', async () => {
      req.user = { userId: 'user-id' };
      req.body = {
        oldPassword: 'wrongpass',
        newPassword: 'newpass'
      };

      const mockUser = {
        password: 'hashed-old-password'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await authController.changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
