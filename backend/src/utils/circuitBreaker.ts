/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by failing fast when external services are down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail immediately
 * - HALF_OPEN: Testing if service is back up
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes in half-open to close circuit
  timeout: number;               // Time in ms before trying half-open
  resetTimeout?: number;         // Time in ms to reset failure count (optional)
  onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;
  onFailure?: (name: string, error: Error) => void;
  onSuccess?: (name: string) => void;
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextRetryTime: Date | null = null;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(private options: CircuitBreakerOptions) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker ${this.options.name} is OPEN`,
          this.options.name,
          this.state
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;

    if (this.options.onSuccess) {
      this.options.onSuccess(this.options.name);
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  private onFailure(error: Error): void {
    this.lastFailureTime = new Date();
    this.totalFailures++;
    this.failures++;

    if (this.options.onFailure) {
      this.options.onFailure(this.options.name, error);
    }

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.options.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Check if we should attempt to reset (try half-open)
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextRetryTime) return false;
    return new Date() >= this.nextRetryTime;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    console.info(`[CircuitBreaker] ${this.options.name}: ${oldState} -> ${newState}`);

    if (this.options.onStateChange) {
      this.options.onStateChange(this.options.name, oldState, newState);
    }

    // Reset counters based on new state
    switch (newState) {
      case CircuitState.OPEN:
        this.nextRetryTime = new Date(Date.now() + this.options.timeout);
        this.successes = 0;
        break;
      case CircuitState.HALF_OPEN:
        this.successes = 0;
        break;
      case CircuitState.CLOSED:
        this.failures = 0;
        this.successes = 0;
        this.nextRetryTime = null;
        break;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Force close the circuit (for testing/recovery)
   */
  forceClose(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Force open the circuit (for maintenance)
   */
  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextRetryTime = null;
  }
}

/**
 * Custom error for circuit breaker
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly circuitName: string,
    public readonly circuitState: CircuitState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker Registry - manages multiple circuit breakers
 */
class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  getOrCreate(options: CircuitBreakerOptions): CircuitBreaker {
    const existing = this.breakers.get(options.name);
    if (existing) {
      return existing;
    }

    const breaker = new CircuitBreaker(options);
    this.breakers.set(options.name, breaker);
    return breaker;
  }

  /**
   * Get a circuit breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breakers
   */
  getAll(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Get stats for all breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers for common services
export const circuitBreakers = {
  openai: circuitBreakerRegistry.getOrCreate({
    name: 'openai',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
    onFailure: (name, error) => {
      console.error(`[CircuitBreaker] ${name} failure:`, error.message);
    },
  }),

  twilio: circuitBreakerRegistry.getOrCreate({
    name: 'twilio',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  plivo: circuitBreakerRegistry.getOrCreate({
    name: 'plivo',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  exotel: circuitBreakerRegistry.getOrCreate({
    name: 'exotel',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  sarvam: circuitBreakerRegistry.getOrCreate({
    name: 'sarvam',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  razorpay: circuitBreakerRegistry.getOrCreate({
    name: 'razorpay',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000, // 1 minute for payment service
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  facebook: circuitBreakerRegistry.getOrCreate({
    name: 'facebook',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  linkedin: circuitBreakerRegistry.getOrCreate({
    name: 'linkedin',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  googleAds: circuitBreakerRegistry.getOrCreate({
    name: 'googleAds',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),

  apify: circuitBreakerRegistry.getOrCreate({
    name: 'apify',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    onStateChange: (name, from, to) => {
      console.warn(`[CircuitBreaker] ${name} state changed: ${from} -> ${to}`);
    },
  }),
};

/**
 * Helper function to wrap an async function with circuit breaker
 */
export function withCircuitBreaker<T>(
  breaker: CircuitBreaker,
  fn: () => Promise<T>
): Promise<T> {
  return breaker.execute(fn);
}
