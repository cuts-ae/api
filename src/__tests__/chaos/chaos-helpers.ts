/**
 * Chaos Testing Helper Utilities
 *
 * Provides utility functions to make chaos tests more reliable and maintainable.
 */

/**
 * Creates a mock implementation that fails with a specific probability
 */
export function createRandomFailureMock<T>(
  successValue: T,
  failureError: Error,
  failureRate: number = 0.5
): () => Promise<T> {
  return () => {
    if (Math.random() < failureRate) {
      return Promise.reject(failureError);
    }
    return Promise.resolve(successValue);
  };
}

/**
 * Creates a mock implementation that delays responses
 */
export function createDelayedMock<T>(
  value: T,
  delayMs: number
): () => Promise<T> {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, delayMs);
    });
}

/**
 * Creates a mock implementation that fails for first N calls, then succeeds
 */
export function createCircuitBreakerMock<T>(
  successValue: T,
  failureError: Error,
  failureCount: number
): () => Promise<T> {
  let callCount = 0;

  return () => {
    callCount++;

    if (callCount <= failureCount) {
      return Promise.reject(failureError);
    }

    return Promise.resolve(successValue);
  };
}

/**
 * Creates a mock implementation that degrades over time
 */
export function createDegradingMock<T>(
  successValue: T,
  failureError: Error,
  totalCalls: number
): () => Promise<T> {
  let callCount = 0;

  return () => {
    callCount++;

    // Failure rate increases linearly from 0% to 100%
    const failureRate = callCount / totalCalls;

    if (Math.random() < failureRate) {
      return Promise.reject(failureError);
    }

    return Promise.resolve(successValue);
  };
}

/**
 * Creates a mock implementation that recovers over time
 */
export function createRecoveringMock<T>(
  successValue: T,
  failureError: Error,
  totalCalls: number
): () => Promise<T> {
  let callCount = 0;

  return () => {
    callCount++;

    // Failure rate decreases linearly from 100% to 0%
    const failureRate = Math.max(0, 1 - callCount / totalCalls);

    if (Math.random() < failureRate) {
      return Promise.reject(failureError);
    }

    return Promise.resolve(successValue);
  };
}

/**
 * Creates a mock implementation that alternates between success and failure
 */
export function createAlternatingMock<T>(
  successValue: T,
  failureError: Error
): () => Promise<T> {
  let callCount = 0;

  return () => {
    callCount++;

    if (callCount % 2 === 0) {
      return Promise.reject(failureError);
    }

    return Promise.resolve(successValue);
  };
}

/**
 * Creates a mock implementation that throws different types of errors randomly
 */
export function createRandomErrorMock<T>(
  errors: Error[]
): () => Promise<T> {
  return () => {
    const randomError = errors[Math.floor(Math.random() * errors.length)];
    return Promise.reject(randomError);
  };
}

/**
 * Helper to wait for a specific amount of time (real or fake)
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Helper to check if a response has valid error structure
 */
export function hasValidErrorResponse(response: any): boolean {
  return (
    response.body &&
    typeof response.body === 'object' &&
    ('error' in response.body || 'message' in response.body)
  );
}

/**
 * Helper to validate HTTP status codes are in expected range
 */
export function isValidStatusCode(status: number, allowedCodes: number[]): boolean {
  return allowedCodes.includes(status);
}

/**
 * Calculate success rate from responses
 */
export function calculateSuccessRate(responses: any[], successCode: number = 200): number {
  const successCount = responses.filter(r => r.status === successCode).length;
  return successCount / responses.length;
}

/**
 * Calculate failure rate from responses
 */
export function calculateFailureRate(responses: any[], failureCodes: number[] = [500, 503]): number {
  const failureCount = responses.filter(r => failureCodes.includes(r.status)).length;
  return failureCount / responses.length;
}

/**
 * Group responses by status code
 */
export function groupByStatusCode(responses: any[]): Map<number, number> {
  const grouped = new Map<number, number>();

  responses.forEach(response => {
    const count = grouped.get(response.status) || 0;
    grouped.set(response.status, count + 1);
  });

  return grouped;
}

/**
 * Seed random number generator for reproducible tests
 */
export function seedRandom(seed: number): void {
  // Simple seeded random number generator
  let currentSeed = seed;

  Math.random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
}

/**
 * Reset random number generator to default
 */
export function resetRandom(): void {
  // Restore original Math.random
  delete (Math as any).random;
}
