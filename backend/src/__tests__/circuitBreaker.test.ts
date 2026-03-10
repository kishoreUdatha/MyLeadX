/**
 * Circuit Breaker Unit Tests
 */

import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerError,
} from '../utils/circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100, // Short timeout for tests
    });
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should have zero stats initially', () => {
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('Successful Requests', () => {
    it('should pass through successful requests', async () => {
      const result = await breaker.execute(() => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should increment success counter', async () => {
      await breaker.execute(() => Promise.resolve('success'));
      const stats = breaker.getStats();
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.totalRequests).toBe(1);
    });

    it('should reset failure count on success', async () => {
      // Cause some failures (but not enough to open)
      try { await breaker.execute(() => Promise.reject(new Error('fail'))); } catch {}
      try { await breaker.execute(() => Promise.reject(new Error('fail'))); } catch {}

      // Success should reset failure count
      await breaker.execute(() => Promise.resolve('success'));
      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
    });
  });

  describe('Failed Requests', () => {
    it('should propagate errors', async () => {
      await expect(
        breaker.execute(() => Promise.reject(new Error('Test error')))
      ).rejects.toThrow('Test error');
    });

    it('should increment failure counter', async () => {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {}

      const stats = breaker.getStats();
      expect(stats.totalFailures).toBe(1);
      expect(stats.failures).toBe(1);
    });

    it('should open circuit after reaching failure threshold', async () => {
      // Cause failures up to threshold
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Open State', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }
    });

    it('should reject requests immediately when OPEN', async () => {
      await expect(
        breaker.execute(() => Promise.resolve('success'))
      ).rejects.toThrow(CircuitBreakerError);
    });

    it('should include circuit name in error', async () => {
      try {
        await breaker.execute(() => Promise.resolve('success'));
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerError);
        expect((error as CircuitBreakerError).circuitName).toBe('test-breaker');
        expect((error as CircuitBreakerError).circuitState).toBe(CircuitState.OPEN);
      }
    });
  });

  describe('Half-Open State', () => {
    beforeEach(async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next request should attempt (transitioning to HALF_OPEN)
      try {
        await breaker.execute(() => Promise.resolve('success'));
      } catch {}

      // State should be CLOSED after success in HALF_OPEN
      expect(breaker.getState()).not.toBe(CircuitState.OPEN);
    });

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed enough times to close
      await breaker.execute(() => Promise.resolve('success'));
      await breaker.execute(() => Promise.resolve('success'));

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure in HALF_OPEN', async () => {
      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Trigger transition to HALF_OPEN with a success first
      await breaker.execute(() => Promise.resolve('success'));

      // Then fail
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {}

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Force Controls', () => {
    it('should force close the circuit', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(() => Promise.reject(new Error('fail')));
        } catch {}
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.forceClose();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should force open the circuit', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reset the circuit', async () => {
      // Cause some failures
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {}

      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Callbacks', () => {
    it('should call onStateChange when state changes', async () => {
      const onStateChange = jest.fn();
      const breakerWithCallback = new CircuitBreaker({
        name: 'callback-test',
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 100,
        onStateChange,
      });

      try {
        await breakerWithCallback.execute(() => Promise.reject(new Error('fail')));
      } catch {}

      expect(onStateChange).toHaveBeenCalledWith(
        'callback-test',
        CircuitState.CLOSED,
        CircuitState.OPEN
      );
    });

    it('should call onFailure when request fails', async () => {
      const onFailure = jest.fn();
      const breakerWithCallback = new CircuitBreaker({
        name: 'failure-callback-test',
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        onFailure,
      });

      try {
        await breakerWithCallback.execute(() => Promise.reject(new Error('Test failure')));
      } catch {}

      expect(onFailure).toHaveBeenCalledWith('failure-callback-test', expect.any(Error));
    });

    it('should call onSuccess when request succeeds', async () => {
      const onSuccess = jest.fn();
      const breakerWithCallback = new CircuitBreaker({
        name: 'success-callback-test',
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        onSuccess,
      });

      await breakerWithCallback.execute(() => Promise.resolve('success'));

      expect(onSuccess).toHaveBeenCalledWith('success-callback-test');
    });
  });
});
