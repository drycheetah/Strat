const governanceController = require('../../../controllers/governanceController');
const Proposal = require('../../../models/Proposal');
const Vote = require('../../../models/Vote');
const Delegation = require('../../../models/Delegation');
const { mockRequest, mockResponse, mockNext } = require('../../helpers/testHelpers');

jest.mock('../../../models/Proposal');
jest.mock('../../../models/Vote');
jest.mock('../../../models/Delegation');

describe('Governance Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = mockNext();
    jest.clearAllMocks();
  });

  describe('createProposal', () => {
    test('should create new proposal successfully', async () => {
      req.body = {
        title: 'Test Proposal',
        description: 'Test Description',
        type: 'parameter',
        parameters: { key: 'value' }
      };
      req.user = { address: 'proposer-address' };

      const mockProposal = {
        _id: 'proposal-id',
        title: req.body.title,
        save: jest.fn().mockResolvedValue(true)
      };

      Proposal.mockImplementation(() => mockProposal);

      await governanceController.createProposal(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should reject proposal without title', async () => {
      req.body = { description: 'Test' };
      req.user = { address: 'proposer-address' };

      await governanceController.createProposal(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should handle database errors', async () => {
      req.body = {
        title: 'Test',
        description: 'Test',
        type: 'parameter'
      };
      req.user = { address: 'proposer-address' };

      const mockProposal = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      Proposal.mockImplementation(() => mockProposal);

      await governanceController.createProposal(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getProposals', () => {
    test('should return all proposals', async () => {
      const mockProposals = [
        { _id: '1', title: 'Proposal 1', status: 'active' },
        { _id: '2', title: 'Proposal 2', status: 'passed' }
      ];

      Proposal.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue(mockProposals)
          })
        })
      });

      await governanceController.getProposals(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProposals
        })
      );
    });

    test('should filter proposals by status', async () => {
      req.query = { status: 'active' };

      Proposal.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue([])
          })
        })
      });

      await governanceController.getProposals(req, res, next);

      expect(Proposal.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });

    test('should handle pagination', async () => {
      req.query = { page: '2', limit: '10' };

      Proposal.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue([])
          })
        })
      });

      await governanceController.getProposals(req, res, next);

      expect(Proposal.find).toHaveBeenCalled();
    });
  });

  describe('getProposal', () => {
    test('should return proposal by id', async () => {
      req.params = { id: 'proposal-id' };
      const mockProposal = {
        _id: 'proposal-id',
        title: 'Test Proposal'
      };

      Proposal.findById = jest.fn().mockResolvedValue(mockProposal);

      await governanceController.getProposal(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockProposal
        })
      );
    });

    test('should return 404 for non-existent proposal', async () => {
      req.params = { id: 'non-existent' };
      Proposal.findById = jest.fn().mockResolvedValue(null);

      await governanceController.getProposal(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('voteOnProposal', () => {
    test('should record vote successfully', async () => {
      req.params = { id: 'proposal-id' };
      req.body = { vote: 'yes', votingPower: 100 };
      req.user = { address: 'voter-address' };

      const mockProposal = {
        _id: 'proposal-id',
        status: 'active',
        votingEnds: new Date(Date.now() + 100000)
      };

      const mockVote = {
        save: jest.fn().mockResolvedValue(true)
      };

      Proposal.findById = jest.fn().mockResolvedValue(mockProposal);
      Vote.findOne = jest.fn().mockResolvedValue(null);
      Vote.mockImplementation(() => mockVote);

      await governanceController.voteOnProposal(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should reject duplicate vote', async () => {
      req.params = { id: 'proposal-id' };
      req.body = { vote: 'yes' };
      req.user = { address: 'voter-address' };

      const mockProposal = {
        _id: 'proposal-id',
        status: 'active',
        votingEnds: new Date(Date.now() + 100000)
      };

      Proposal.findById = jest.fn().mockResolvedValue(mockProposal);
      Vote.findOne = jest.fn().mockResolvedValue({ voter: 'voter-address' });

      await governanceController.voteOnProposal(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should reject vote on expired proposal', async () => {
      req.params = { id: 'proposal-id' };
      req.body = { vote: 'yes' };
      req.user = { address: 'voter-address' };

      const mockProposal = {
        _id: 'proposal-id',
        status: 'active',
        votingEnds: new Date(Date.now() - 100000)
      };

      Proposal.findById = jest.fn().mockResolvedValue(mockProposal);

      await governanceController.voteOnProposal(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('delegateVotes', () => {
    test('should delegate voting power', async () => {
      req.body = { delegateTo: 'delegate-address' };
      req.user = { address: 'delegator-address' };

      const mockDelegation = {
        save: jest.fn().mockResolvedValue(true)
      };

      Delegation.findOne = jest.fn().mockResolvedValue(null);
      Delegation.mockImplementation(() => mockDelegation);

      await governanceController.delegateVotes(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should not allow self-delegation', async () => {
      req.body = { delegateTo: 'same-address' };
      req.user = { address: 'same-address' };

      await governanceController.delegateVotes(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('executeProposal', () => {
    test('should execute passed proposal', async () => {
      req.params = { id: 'proposal-id' };

      const mockProposal = {
        _id: 'proposal-id',
        status: 'passed',
        executed: false,
        save: jest.fn().mockResolvedValue(true)
      };

      Proposal.findById = jest.fn().mockResolvedValue(mockProposal);

      await governanceController.executeProposal(req, res, next);

      expect(mockProposal.executed).toBe(true);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('should reject execution of non-passed proposal', async () => {
      req.params = { id: 'proposal-id' };

      const mockProposal = {
        _id: 'proposal-id',
        status: 'active',
        executed: false
      };

      Proposal.findById = jest.fn().mockResolvedValue(mockProposal);

      await governanceController.executeProposal(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
