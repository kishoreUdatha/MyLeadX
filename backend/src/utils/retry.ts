/**
 * Retry utility with exponential backoff
 * Used for handling transient failures in webhook processing and external API calls
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // Add 0-50% jitter
  return Math.min(delayWithJitter, options.maxDelayMs);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, retryableErrors?: string[]): boolean {
  // Network errors are always retryable
  const networkErrors = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'EPIPE',
    'EHOSTUNREACH',
  ];

  const errorCode = (error as any).code;
  if (errorCode && networkErrors.includes(errorCode)) {
    return true;
  }

  // HTTP status codes that are retryable (429, 500, 502, 503, 504)
  const statusCode = (error as any).statusCode || (error as any).status;
  if (statusCode && [429, 500, 502, 503, 504].includes(statusCode)) {
    return true;
  }

  // Check against custom retryable errors
  if (retryableErrors) {
    return retryableErrors.some(e =>
      error.message.toLowerCase().includes(e.toLowerCase()) ||
      error.name.toLowerCase().includes(e.toLowerCase())
    );
  }

  // Default: timeout and rate limit errors are retryable
  const retryableMessages = ['timeout', 'rate limit', 'too many requests', 'service unavailable'];
  return retryableMessages.some(msg => error.message.toLowerCase().includes(msg));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we've exhausted retries
      if (attempt > opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        break;
      }

      const delayMs = calculateDelay(attempt, opts);

      if (opts.onRetry) {
        opts.onRetry(error, attempt, delayMs);
      } else {
        console.warn(`[Retry] Attempt ${attempt}/${opts.maxRetries} failed, retrying in ${delayMs}ms:`, error.message);
      }

      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Retry queue item for deferred processing
 */
export interface RetryQueueItem<T = any> {
  id: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-memory retry queue for webhook processing
 * In production, this should be backed by Redis or a database
 */
export class RetryQueue<T = any> {
  private queue: Map<string, RetryQueueItem<T>> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private processor: ((item: RetryQueueItem<T>) => Promise<boolean>) | null = null;

  constructor(
    private options: {
      maxAttempts: number;
      initialDelayMs: number;
      maxDelayMs: number;
      processIntervalMs: number;
    } = {
      maxAttempts: 5,
      initialDelayMs: 5000,
      maxDelayMs: 300000, // 5 minutes
      processIntervalMs: 10000, // Check every 10 seconds
    }
  ) {}

  /**
   * Add item to retry queue
   */
  add(id: string, data: T): void {
    const existing = this.queue.get(id);
    const now = new Date();

    if (existing) {
      // Update existing item
      existing.attempts++;
      existing.nextRetryAt = this.calculateNextRetry(existing.attempts);
      existing.updatedAt = now;
    } else {
      // Add new item
      this.queue.set(id, {
        id,
        data,
        attempts: 1,
        maxAttempts: this.options.maxAttempts,
        nextRetryAt: this.calculateNextRetry(1),
        createdAt: now,
        updatedAt: now,
      });
    }

    console.info(`[RetryQueue] Added/updated item ${id}, attempts: ${this.queue.get(id)?.attempts}`);
  }

  /**
   * Mark item as failed with error
   */
  fail(id: string, error: string): void {
    const item = this.queue.get(id);
    if (item) {
      item.lastError = error;
      item.updatedAt = new Date();

      if (item.attempts >= item.maxAttempts) {
        console.error(`[RetryQueue] Item ${id} exceeded max attempts, moving to dead letter queue`);
        this.moveToDeadLetter(item);
        this.queue.delete(id);
      }
    }
  }

  /**
   * Remove item from queue (success)
   */
  remove(id: string): void {
    this.queue.delete(id);
    console.info(`[RetryQueue] Removed item ${id}`);
  }

  /**
   * Get all items ready for retry
   */
  getReadyItems(): RetryQueueItem<T>[] {
    const now = new Date();
    return Array.from(this.queue.values()).filter(
      item => item.nextRetryAt <= now && item.attempts < item.maxAttempts
    );
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  private calculateNextRetry(attempts: number): Date {
    const delay = Math.min(
      this.options.initialDelayMs * Math.pow(2, attempts - 1),
      this.options.maxDelayMs
    );
    return new Date(Date.now() + delay);
  }

  /**
   * Move to dead letter queue (log for now)
   */
  private moveToDeadLetter(item: RetryQueueItem<T>): void {
    console.error('[RetryQueue] Dead letter item:', {
      id: item.id,
      attempts: item.attempts,
      lastError: item.lastError,
      data: item.data,
    });
    // In production: Store in database or send to dead letter queue
  }

  /**
   * Start processing the queue
   */
  startProcessing(processor: (item: RetryQueueItem<T>) => Promise<boolean>): void {
    this.processor = processor;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, this.options.processIntervalMs);

    console.info('[RetryQueue] Started queue processing');
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.info('[RetryQueue] Stopped queue processing');
  }

  /**
   * Process ready items in queue
   */
  private async processQueue(): Promise<void> {
    if (!this.processor) return;

    const readyItems = this.getReadyItems();
    if (readyItems.length === 0) return;

    console.info(`[RetryQueue] Processing ${readyItems.length} ready items`);

    for (const item of readyItems) {
      try {
        const success = await this.processor(item);
        if (success) {
          this.remove(item.id);
        } else {
          this.add(item.id, item.data); // Re-queue with incremented attempts
        }
      } catch (error: any) {
        this.fail(item.id, error.message);
        this.add(item.id, item.data); // Re-queue for retry
      }
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    totalItems: number;
    pendingItems: number;
    readyItems: number;
    failedItems: number;
  } {
    const items = Array.from(this.queue.values());
    const now = new Date();

    return {
      totalItems: items.length,
      pendingItems: items.filter(i => i.nextRetryAt > now).length,
      readyItems: items.filter(i => i.nextRetryAt <= now && i.attempts < i.maxAttempts).length,
      failedItems: items.filter(i => i.attempts >= i.maxAttempts).length,
    };
  }
}

// Export singleton retry queue for webhooks
export const webhookRetryQueue = new RetryQueue({
  maxAttempts: 5,
  initialDelayMs: 5000,
  maxDelayMs: 300000,
  processIntervalMs: 10000,
});
