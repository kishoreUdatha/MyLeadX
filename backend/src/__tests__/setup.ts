/**
 * Jest setup file
 * Runs after environment is set up
 */

// Increase timeout for async tests
jest.setTimeout(10000);

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Console spy to track warnings/errors in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress specific warnings during tests
  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    // Allow circuit breaker and retry warnings through
    if (
      message.includes('[CircuitBreaker]') ||
      message.includes('[Retry]') ||
      message.includes('API key not configured')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    // Suppress expected test errors
    if (message.includes('Test error') || message.includes('[RetryQueue]')) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
