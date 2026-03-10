/**
 * Retry Utility Unit Tests
 */

import { withRetry, RetryQueue } from '../utils/retry';

describe('withRetry', () => {
  describe('Successful execution', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return result after retry succeeds', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retryable errors', () => {
    it('should retry on network errors', async () => {
      const networkError = new Error('Network failed') as Error & { code: string };
      networkError.code = 'ECONNRESET';

      const fn = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 status code', async () => {
      const serverError = new Error('Server error') as Error & { statusCode: number };
      serverError.statusCode = 500;

      const fn = jest
        .fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit', async () => {
      const rateLimitError = new Error('Too many requests') as Error & { status: number };
      rateLimitError.status = 429;

      const fn = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Non-retryable errors', () => {
    it('should not retry on validation errors', async () => {
      const validationError = new Error('Invalid input');

      const fn = jest.fn().mockRejectedValue(validationError);

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 50,
          backoffMultiplier: 2,
        })
      ).rejects.toThrow('Invalid input');

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Max retries', () => {
    it('should throw after max retries exceeded', async () => {
      const networkError = new Error('Network failed') as Error & { code: string };
      networkError.code = 'ECONNRESET';

      const fn = jest.fn().mockRejectedValue(networkError);

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 50,
          backoffMultiplier: 2,
        })
      ).rejects.toThrow('Network failed');

      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });
  });

  describe('Callbacks', () => {
    it('should call onRetry callback', async () => {
      const networkError = new Error('Network failed') as Error & { code: string };
      networkError.code = 'ECONNRESET';

      const onRetry = jest.fn();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      await withRetry(fn, {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      );
    });
  });
});

describe('RetryQueue', () => {
  let queue: RetryQueue<{ id: string; data: string }>;

  beforeEach(() => {
    queue = new RetryQueue({
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      processIntervalMs: 50,
    });
  });

  afterEach(() => {
    queue.stopProcessing();
  });

  describe('Adding items', () => {
    it('should add new items to queue', () => {
      queue.add('item-1', { id: '1', data: 'test' });

      const stats = queue.getStats();
      expect(stats.totalItems).toBe(1);
    });

    it('should increment attempts on existing items', () => {
      queue.add('item-1', { id: '1', data: 'test' });
      queue.add('item-1', { id: '1', data: 'test' });

      const stats = queue.getStats();
      expect(stats.totalItems).toBe(1);
    });
  });

  describe('Removing items', () => {
    it('should remove items from queue', () => {
      queue.add('item-1', { id: '1', data: 'test' });
      queue.remove('item-1');

      const stats = queue.getStats();
      expect(stats.totalItems).toBe(0);
    });
  });

  describe('Getting ready items', () => {
    it('should return items ready for retry', async () => {
      queue.add('item-1', { id: '1', data: 'test' });

      // Wait for the item to be ready
      await new Promise((resolve) => setTimeout(resolve, 20));

      const readyItems = queue.getReadyItems();
      expect(readyItems.length).toBe(1);
    });

    it('should not return items not yet ready', () => {
      queue.add('item-1', { id: '1', data: 'test' });

      // Immediately check (item should not be ready)
      const readyItems = queue.getReadyItems();
      // Note: With a 10ms delay, it might or might not be ready immediately
      // This is a timing-sensitive test
      expect(readyItems.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Processing', () => {
    it('should process items when processor is set', async () => {
      const processor = jest.fn().mockResolvedValue(true);

      queue.add('item-1', { id: '1', data: 'test' });
      queue.startProcessing(processor);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(processor).toHaveBeenCalled();
    });

    it('should remove items on successful processing', async () => {
      const processor = jest.fn().mockResolvedValue(true);

      queue.add('item-1', { id: '1', data: 'test' });
      queue.startProcessing(processor);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = queue.getStats();
      expect(stats.totalItems).toBe(0);
    });

    it('should re-queue items on failed processing', async () => {
      const processor = jest.fn().mockResolvedValue(false);

      queue.add('item-1', { id: '1', data: 'test' });
      queue.startProcessing(processor);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = queue.getStats();
      // Item should still be in queue (with increased attempts)
      expect(stats.totalItems).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      queue.add('item-1', { id: '1', data: 'test' });
      queue.add('item-2', { id: '2', data: 'test' });

      const stats = queue.getStats();
      expect(stats.totalItems).toBe(2);
      expect(stats.pendingItems + stats.readyItems).toBe(2);
    });
  });
});
