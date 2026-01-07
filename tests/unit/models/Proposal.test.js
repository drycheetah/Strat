const mongoose = require('mongoose');
const Proposal = require('../../../models/Proposal');

describe('Proposal Model', () => {
  describe('Schema Validation', () => {
    test('should be valid with all required fields', () => {
      const proposal = new Proposal({
        title: 'Test Proposal',
        description: 'Test Description',
        proposer: 'proposer-address',
        type: 'parameter',
        status: 'active'
      });

      const error = proposal.validateSync();
      expect(error).toBeUndefined();
    });

    test('should require title', () => {
      const proposal = new Proposal({
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter'
      });

      const error = proposal.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
    });

    test('should require description', () => {
      const proposal = new Proposal({
        title: 'Test',
        proposer: 'proposer-address',
        type: 'parameter'
      });

      const error = proposal.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.description).toBeDefined();
    });

    test('should validate proposal type', () => {
      const validTypes = ['parameter', 'upgrade', 'funding', 'custom'];
      validTypes.forEach(type => {
        const proposal = new Proposal({
          title: 'Test',
          description: 'Test',
          proposer: 'proposer-address',
          type
        });

        const error = proposal.validateSync();
        expect(error).toBeUndefined();
      });
    });

    test('should reject invalid proposal type', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'invalid-type'
      });

      const error = proposal.validateSync();
      expect(error).toBeDefined();
    });
  });

  describe('Proposal Status', () => {
    test('should have default status of pending', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter'
      });

      expect(proposal.status).toBe('pending');
    });

    test('should validate status values', () => {
      const validStatuses = ['pending', 'active', 'passed', 'rejected', 'executed'];
      validStatuses.forEach(status => {
        const proposal = new Proposal({
          title: 'Test',
          description: 'Test',
          proposer: 'proposer-address',
          type: 'parameter',
          status
        });

        const error = proposal.validateSync();
        expect(error).toBeUndefined();
      });
    });
  });

  describe('Voting Mechanism', () => {
    test('should track yes votes', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        votesFor: 100
      });

      expect(proposal.votesFor).toBe(100);
    });

    test('should track no votes', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        votesAgainst: 50
      });

      expect(proposal.votesAgainst).toBe(50);
    });

    test('should have default vote counts of 0', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter'
      });

      expect(proposal.votesFor).toBe(0);
      expect(proposal.votesAgainst).toBe(0);
    });
  });

  describe('Proposal Timing', () => {
    test('should have voting start time', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        votingStarts: new Date()
      });

      expect(proposal.votingStarts).toBeInstanceOf(Date);
    });

    test('should have voting end time', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        votingEnds: new Date(Date.now() + 86400000)
      });

      expect(proposal.votingEnds).toBeInstanceOf(Date);
    });

    test('should calculate if voting is active', () => {
      const now = Date.now();
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        votingStarts: new Date(now - 1000),
        votingEnds: new Date(now + 86400000)
      });

      expect(proposal.votingStarts.getTime()).toBeLessThan(Date.now());
      expect(proposal.votingEnds.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Proposal Parameters', () => {
    test('should store proposal parameters', () => {
      const params = { key: 'value', amount: 100 };
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        parameters: params
      });

      expect(proposal.parameters).toEqual(params);
    });

    test('should handle complex parameters', () => {
      const params = {
        nested: {
          value: 123,
          array: [1, 2, 3]
        }
      };

      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        parameters: params
      });

      expect(proposal.parameters.nested.value).toBe(123);
    });
  });

  describe('Execution', () => {
    test('should track execution status', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        executed: true
      });

      expect(proposal.executed).toBe(true);
    });

    test('should have default executed status of false', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter'
      });

      expect(proposal.executed).toBe(false);
    });

    test('should store execution timestamp', () => {
      const executedAt = new Date();
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        proposer: 'proposer-address',
        type: 'parameter',
        executed: true,
        executedAt
      });

      expect(proposal.executedAt).toEqual(executedAt);
    });
  });
});
