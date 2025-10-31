/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by temporarily blocking requests when service is down
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 1;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    this.successCount = 0;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      // Check if we should try half-open
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN state');
      } else {
        // Circuit is open, return fallback or throw error
        if (fallback) {
          return fallback();
        }
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      
      // Success - reset failure count
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - increment failure count
      this.onFailure();
      
      // Return fallback if available
      if (fallback) {
        return fallback();
      }
      
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  onSuccess() {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
      
      // If half-open test succeeds, close the circuit
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        this.state = 'CLOSED';
        this.halfOpenCalls = 0;
        console.log('[CircuitBreaker] Circuit CLOSED - service recovered');
      }
    }
  }

  /**
   * Handle failed request
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      // Half-open test failed, open circuit again
      this.state = 'OPEN';
      this.halfOpenCalls = 0;
      console.log('[CircuitBreaker] Circuit OPENED - service still failing');
    } else if (this.failureCount >= this.failureThreshold) {
      // Too many failures, open circuit
      this.state = 'OPEN';
      console.log(`[CircuitBreaker] Circuit OPENED after ${this.failureCount} failures`);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    this.successCount = 0;
    console.log('[CircuitBreaker] Circuit reset manually');
  }
}

module.exports = CircuitBreaker;

